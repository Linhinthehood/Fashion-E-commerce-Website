import os, json, requests
from io import BytesIO
from PIL import Image
import cv2
import numpy as np
import torch, faiss
from tqdm import tqdm
from transformers import CLIPProcessor
from models.FashionCLIP import FashionCLIP

# =========================================================
# PATH CONFIG
# =========================================================
ROOT = r"D:\Secret\duan\Fashion-E-commerce-Website\backend"
MODEL_PATH = os.path.join(ROOT, "fashion-service", "models", "fashion_clip_best.pt")
DB_PATH = os.path.join(ROOT, "product-service", "exports", "database-export.json")
EMB_PATH = os.path.join(ROOT, "fashion-service", "models", "cloud_gallery_embeddings.npz")
INDEX_PATH = os.path.join(ROOT, "fashion-service", "models", "cloud_gallery_ip.index")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# =========================================================
# LOAD MODEL  (fix for PyTorch ≥2.6)
# =========================================================
import numpy
import torch.serialization
torch.serialization.add_safe_globals([numpy._core.multiarray.scalar])

ckpt = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)
cfg = ckpt["config"]
processor = CLIPProcessor.from_pretrained(cfg["model_name"])
model = FashionCLIP(cfg["model_name"], cfg["embedding_dim"]).to(device)
model.load_state_dict(ckpt["model_state_dict"])
model.eval()
print("✅ Model loaded successfully!")

# =========================================================
# LOAD DATABASE
# =========================================================
with open(DB_PATH, "r", encoding="utf-8") as f:
    db = json.load(f)
products = db.get("products", [])
print(f"✅ Loaded {len(products)} products")

# =========================================================
# IMAGE LOADER (supports AVIF)
# =========================================================
def load_image_from_url(url):
    try:
        resp = requests.get(url, timeout=10)
        data = np.frombuffer(resp.content, np.uint8)
        ext = url.lower().split(".")[-1]
        if ext == "avif":
            img = cv2.imdecode(data, cv2.IMREAD_COLOR)
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(img)
        else:
            pil_img = Image.open(BytesIO(resp.content)).convert("RGB")
        return pil_img
    except Exception as e:
        print("⚠️ Error loading", url, ":", e)
        return None

# =========================================================
# EMBEDDING
# =========================================================
@torch.no_grad()
def embed_image_from_url(url):
    img = load_image_from_url(url)
    if img is None:
        return None
    inputs = processor(text=[""], images=[img], return_tensors="pt").to(device)
    img_emb, _ = model(**inputs)
    return img_emb.cpu().numpy()[0].astype("float32")

# =========================================================
# BUILD OR LOAD INDEX
# =========================================================
def build_index():
    if os.path.exists(EMB_PATH) and os.path.exists(INDEX_PATH):
        print("📦 Loading cached index...")
        index = faiss.read_index(INDEX_PATH)
        data = np.load(EMB_PATH, allow_pickle=True)
        urls, names, ids = list(data["urls"]), list(data["names"]), list(data["ids"])
        print(f"✅ Loaded {len(urls)} embeddings from cache")
        return index, urls, names, ids

    print("🧠 Embedding all product images...")
    embeddings, urls, names, ids = [], [], [], []
    for p in tqdm(products, desc="Embedding"):
        imgs = p.get("images", [])
        if not imgs:
            continue
        emb = embed_image_from_url(imgs[0])
        if emb is not None:
            embeddings.append(emb)
            urls.append(imgs[0])
            names.append(p.get("name", "Unknown"))
            ids.append(p.get("id", "Unknown"))

    embeddings = np.stack(embeddings).astype("float32")
    index = faiss.IndexFlatIP(embeddings.shape[1])
    index.add(embeddings)
    faiss.write_index(index, INDEX_PATH)
    np.savez_compressed(EMB_PATH, vecs=embeddings, urls=np.array(urls), names=np.array(names), ids=np.array(ids))
    print(f"✅ Built index with {len(embeddings)} products")
    return index, urls, names, ids

index, urls, names, ids = build_index()
print(f"✅ Index ready with {index.ntotal} images")

# =========================================================
# SEARCH BY PRODUCT ID
# =========================================================
def find_by_id(pid):
    for p in products:
        if str(p.get("id")) == str(pid):
            imgs = p.get("images", [])
            if imgs:
                return imgs[0], p.get("name", "Unknown")
    return None, None

def search_similar_by_id(pid, k=5):
    url, name = find_by_id(pid)
    if not url:
        print("❌ Product ID not found:", pid)
        return
    print(f"\n🔍 Searching similar to: [{pid}] {name}")
    emb = embed_image_from_url(url)
    if emb is None:
        print("⚠️ Could not embed this product image.")
        return
    sims, idxs = index.search(emb.reshape(1, -1), k)
    for rank, (i, s) in enumerate(zip(idxs[0], sims[0]), 1):
        print(f"{rank}. {names[i]} | ID={ids[i]} | score={s:.3f}\n   {urls[i]}")

# =========================================================
# MAIN LOOP
# =========================================================
if __name__ == "__main__":
    pid = input("Enter product ID: ").strip()
    search_similar_by_id(pid)
