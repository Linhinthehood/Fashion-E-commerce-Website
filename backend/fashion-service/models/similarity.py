# demo_retrieval_cached.py
import os, argparse, numpy as np
from PIL import Image
import torch, torch.nn as nn, torch.nn.functional as F
from transformers import CLIPProcessor
import faiss

from .FashionCLIP import FashionCLIP  # <- your model class file
from ..config.config import DEFAULT_CHECKPOINT, DEFAULT_IMAGES_DIR, DEFAULT_NPZ, DEFAULT_INDEX, resolve_image_path

# --- default paths (now imported from config) ---

# --- model ---
class FashionCLIPWrapper(nn.Module):
    """Wrapper to load trained FashionCLIP checkpoint"""
    def __init__(self, model_name, embedding_dim=256):
        super().__init__()
        self.clip = FashionCLIP(model_name, embedding_dim)

    def forward(self, *args, **kwargs):
        return self.clip(*args, **kwargs)

def load_model(checkpoint_path, device):
    ckpt = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    cfg = ckpt.get("config", {})
    model_name    = cfg.get("model_name", "openai/clip-vit-base-patch32")
    embedding_dim = cfg.get("embedding_dim", 256)
    max_length    = cfg.get("max_length", 77)
    image_size    = cfg.get("image_size", 224)

    processor = CLIPProcessor.from_pretrained(model_name)
    model = FashionCLIP(model_name, embedding_dim).to(device)
    state = ckpt["model_state_dict"] if "model_state_dict" in ckpt else ckpt
    model.load_state_dict(state, strict=True)
    model.eval()
    return model, processor, cfg

# --- embed helpers ---
@torch.no_grad()
def embed_text(model, processor, query, device, cfg):
    blank = Image.new("RGB", (cfg.get("image_size",224), cfg.get("image_size",224)), "white")
    enc = processor(text=[query], images=[blank], return_tensors="pt",
                    padding="max_length", truncation=True, max_length=cfg.get("max_length",77))
    pv, ids, am = enc["pixel_values"].to(device), enc["input_ids"].to(device), enc["attention_mask"].to(device)
    _, txt = model(pv, ids, am)
    return txt.cpu().numpy().astype("float32")

@torch.no_grad()
def embed_one_image(model, processor, img_path, device, cfg):
    # Resolve the image path to handle legacy/incorrect paths
    img_path = resolve_image_path(img_path)
    img = Image.open(img_path).convert("RGB")
    enc = processor(text=[""], images=[img], return_tensors="pt",
                    padding="max_length", truncation=True, max_length=cfg.get("max_length",77))
    pv, ids, am = enc["pixel_values"].to(device), enc["input_ids"].to(device), enc["attention_mask"].to(device)
    img_e, _ = model(pv, ids, am)
    return img_e.cpu().numpy().astype("float32")

# --- search ---
def search(index, q, k=6):
    sims, idxs = index.search(q, k)
    return sims[0], idxs[0]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--checkpoint", default=DEFAULT_CHECKPOINT)
    ap.add_argument("--images_dir", default=DEFAULT_IMAGES_DIR)
    ap.add_argument("--npz", default=DEFAULT_NPZ)
    ap.add_argument("--index", default=DEFAULT_INDEX)
    ap.add_argument("--query_text", default=None)
    ap.add_argument("--query_image", default=None)
    ap.add_argument("--k", type=int, default=6)
    args = ap.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model, processor, cfg = load_model(args.checkpoint, device)

    # load npz (vectors + paths)
    npz = np.load(args.npz, allow_pickle=True)
    vecs = npz["vecs"].astype("float32")
    keep_paths = list(npz["paths"])

    # load faiss index
    if os.path.exists(args.index):
        index = faiss.read_index(args.index)
    else:
        index = faiss.IndexFlatIP(vecs.shape[1]); index.add(vecs)

    print(f"Index loaded: {index.ntotal} items, dim={index.d}")

    # --- text query ---
    if args.query_text:
        q = embed_text(model, processor, args.query_text, device, cfg)
        sims, idxs = search(index, q, k=args.k)
        print("\nText → Image:", args.query_text)
        for r, (i, s) in enumerate(zip(idxs, sims), 1):
            print(f"{r:>2}. {keep_paths[i]}   score={s:.3f}")

    # --- image query ---
    if args.query_image:
        q = embed_one_image(model, processor, args.query_image, device, cfg)
        sims, idxs = search(index, q, k=args.k)
        print("\nImage → Image:", args.query_image)
        for r, (i, s) in enumerate(zip(idxs, sims), 1):
            print(f"{r:>2}. {keep_paths[i]}   score={s:.3f}")

    if not args.query_text and not args.query_image:
        print("⚠️ Please provide --query_text or --query_image")

if __name__ == "__main__":
    main()
