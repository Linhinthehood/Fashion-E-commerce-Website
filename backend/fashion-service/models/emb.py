# embed_gallery.py
import os, glob, numpy as np, torch
from PIL import Image
from tqdm import tqdm
from transformers import CLIPProcessor
import faiss

from .FashionCLIP import FashionCLIP   # your model class
from ..config.config import DEFAULT_CHECKPOINT, DEFAULT_IMAGES_DIR, DEFAULT_NPZ, DEFAULT_INDEX

# --- paths (now imported from config) ---
CHECKPOINT = DEFAULT_CHECKPOINT
IMAGES_DIR = DEFAULT_IMAGES_DIR
NPZ_OUT    = DEFAULT_NPZ
INDEX_OUT  = DEFAULT_INDEX

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# --- load model ---
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
    return model, processor, max_length, image_size

@torch.no_grad()
def embed_images(model, processor, image_paths, device, batch_size=32, max_length=77):
    vecs, keep_paths = [], []
    for i in tqdm(range(0, len(image_paths), batch_size), desc="Embedding images"):
        batch = image_paths[i:i+batch_size]
        imgs = []
        for p in batch:
            try:
                imgs.append(Image.open(p).convert("RGB"))
            except:
                imgs.append(Image.new("RGB", (224, 224), color="black"))
        enc = processor(text=[""]*len(imgs), images=imgs, return_tensors="pt",
                        padding="max_length", truncation=True, max_length=max_length)
        pv, ids, am = enc["pixel_values"].to(device), enc["input_ids"].to(device), enc["attention_mask"].to(device)
        img_e, _ = model(pv, ids, am)
        vecs.append(img_e.cpu())
        keep_paths.extend(batch)
    vecs = torch.cat(vecs, dim=0).numpy().astype("float32")
    return vecs, keep_paths

def main():
    model, processor, max_length, image_size = load_model(CHECKPOINT, device)

    # collect images
    exts = ("*.jpg","*.jpeg","*.png","*.webp","*.JPG","*.PNG","*.JPEG","*.WEBP")
    image_paths = []
    for e in exts:
        image_paths += glob.glob(os.path.join(IMAGES_DIR, e))
    if not image_paths:
        raise RuntimeError(f"No images found in {IMAGES_DIR}")

    # embed
    vecs, keep_paths = embed_images(model, processor, image_paths, device, max_length=max_length)

    # save npz
    np.savez_compressed(NPZ_OUT, vecs=vecs, paths=np.array(keep_paths, dtype=object))
    print(f"✅ Saved embeddings to {NPZ_OUT} ({len(keep_paths)} images)")

    # build faiss index
    d = vecs.shape[1]
    index = faiss.IndexFlatIP(d)
    index.add(vecs)
    faiss.write_index(index, INDEX_OUT)
    print(f"✅ Saved FAISS index to {INDEX_OUT}")

if __name__ == "__main__":
    main()
