#!/usr/bin/env python3
"""
Simplified Fashion Service (default main)
No PyTorch/FAISS dependencies; suitable for local testing from terminal
Uses environment variables from .env when available.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path
import numpy as np
import requests
from io import BytesIO
from PIL import Image

try:
    import faiss  # type: ignore
except Exception:
    faiss = None
from bson import ObjectId

# Optional full-AI model (FashionCLIP checkpoint)
_model = None
_processor = None
_cfg = None
try:
    from models.similarity import load_model as _load_fashion_model
    from config.config import config as _fashion_cfg
    import torch
    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
except Exception:
    _load_fashion_model = None
    _fashion_cfg = None
    _device = None

# Load environment variables from .env if present
load_dotenv()

app = FastAPI(title="Fashion Recommendation Service (Default)")

# Configuration from environment
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "fashion_ecommerce_products")

# CORS middleware
allow_origins_list = ["*"] if ALLOWED_ORIGINS.strip() == "*" else [o.strip() for o in ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to MongoDB
try:
    client = MongoClient(MONGODB_URI)
    # Prefer explicit MONGODB_DATABASE, otherwise derive from URI if provided
    db_name = MONGODB_DATABASE
    if not db_name:
        try:
            db_name = client.get_default_database().name  # from URI path
        except Exception:
            db_name = "fashion_ecommerce_products"
    db = client[db_name]
    products_collection = db.products
    # Ping to verify connection
    client.admin.command('ping')
    print(f"[OK] Connected to MongoDB: {MONGODB_URI}")
    print(f"[OK] Using database: {db_name}")
except Exception as e:
    print(f"[WARNING] MongoDB connection failed: {e}")
    print("[INFO] Running in mock data mode for products endpoints")
products_collection = None


def _serialize(obj):
    """Recursively convert MongoDB-specific types (e.g., ObjectId) to JSON-safe values."""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(v) for v in obj]
    return obj

def _find_product_by_id(pid: str):
    if not products_collection:
        return None
    # Try as-is (string _id)
    doc = products_collection.find_one({'_id': pid})
    if doc:
        return doc
    # Try ObjectId if valid hex
    try:
        oid = ObjectId(pid)
        doc = products_collection.find_one({'_id': oid})
        if doc:
            return doc
    except Exception:
        pass
    return None


def _neighbors_to_docs(idxs, skip_id: str | None = None, limit: int = 6):
    docs = []
    if products_collection is None or _emb_product_ids is None:
        return docs
    count = 0
    for idx in idxs:
        if idx < 0 or idx >= len(_emb_product_ids):
            continue
        nid = _emb_product_ids[idx]
        if skip_id and nid == skip_id:
            continue
        doc = _find_product_by_id(nid)
        if doc:
            docs.append(_serialize(doc))
            count += 1
            if count >= limit:
                break
    return docs


def _embed_text_query(q: str):
    _ensure_model_loaded()
    if _model is None or _processor is None or _cfg is None:
        return None
    # Build embedding similar to models/similarity.embed_text
    blank = Image.new("RGB", (_cfg.get("image_size", 224), _cfg.get("image_size", 224)), "white")
    enc = _processor(text=[q], images=[blank], return_tensors="pt", padding="max_length", truncation=True, max_length=_cfg.get("max_length", 77))
    pv = enc["pixel_values"].to(_device)
    ids = enc["input_ids"].to(_device)
    am = enc["attention_mask"].to(_device)
    with torch.no_grad():
        img_e, txt_e = _model(pv, ids, am)
    return txt_e.cpu().numpy().astype("float32")


def _embed_image_url(url: str):
    _ensure_model_loaded()
    if _model is None or _processor is None or _cfg is None:
        return None
    resp = requests.get(url, timeout=20)
    resp.raise_for_status()
    img = Image.open(BytesIO(resp.content)).convert("RGB")
    enc = _processor(text=[""], images=[img], return_tensors="pt", padding="max_length", truncation=True, max_length=_cfg.get("max_length", 77))
    pv = enc["pixel_values"].to(_device)
    ids = enc["input_ids"].to(_device)
    am = enc["attention_mask"].to(_device)
    with torch.no_grad():
        img_e, txt_e = _model(pv, ids, am)
    return img_e.cpu().numpy().astype("float32")

# Optional: load image-embedding index for visual similarity
EMB_DIR = Path(__file__).resolve().parent / 'data' / 'embeddings'
_index = None
_emb_product_ids = None
_emb_vecs = None
if faiss is not None:
    try:
        npz_path = EMB_DIR / 'gallery_embeddings.npz'
        index_path = EMB_DIR / 'gallery_ip.index'
        if npz_path.exists() and index_path.exists():
            npz = np.load(npz_path, allow_pickle=True)
            vecs = npz['vecs'].astype('float32')
            _emb_product_ids = list(npz.get('product_ids', []))
            _emb_vecs = vecs
            _index = faiss.read_index(str(index_path))
            # basic sanity
            if _index.ntotal != vecs.shape[0]:
                print("[WARN] Index and embedding size mismatch; rebuilding in-memory index")
                _index = faiss.IndexFlatIP(vecs.shape[1]); _index.add(vecs)
            print(f"[OK] Loaded embeddings: {_index.ntotal} items")
        else:
            print("[INFO] Embeddings not found; similarity will fall back to sampling")
    except Exception as e:
        print(f"[WARN] Failed to load embeddings/index: {e}")
        _index = None


def _ensure_model_loaded():
    global _model, _processor, _cfg
    if _model is None and _load_fashion_model and _fashion_cfg is not None and _device is not None:
        try:
            _model, _processor, _cfg = _load_fashion_model(_fashion_cfg.checkpoint_path, _device)
            print("[OK] Loaded FashionCLIP checkpoint for runtime queries")
        except Exception as e:
            print(f"[WARN] Could not load FashionCLIP checkpoint: {e}")


@app.get("/health")
def health_check():
    return {"status": "healthy", "mode": "default-simple"}

@app.post("/api/v1/track/interaction")
async def track_user_interaction(
    user_id: str,
    product_id: str,
    interaction_type: str
):
    try:
        print(f"Tracked: {interaction_type} for user {user_id} on product {product_id}")
        # Update user vector from precomputed embeddings if available
        updated = False
        try:
            # Local helpers (defined below)
            updated = _update_user_vector(user_id, product_id)
        except Exception as ie:
            print(f"[WARN] Could not update user vector: {ie}")
        return {"success": True, "message": f"Tracked {interaction_type} for user {user_id} on product {product_id}", "profileUpdated": bool(updated)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/products/{product_id}")
async def get_product_details(product_id: str):
    try:
        if not products_collection:
            return {
                "success": True,
                "data": {
                    "_id": product_id,
                    "name": f"Sample Product {product_id}",
                    "brand": "Sample Brand",
                    "defaultPrice": 100000,
                    "description": "Sample product description"
                }
            }

        product = _find_product_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        return {"success": True, "data": _serialize(product)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/recommendations/product/{product_id}")
async def get_similar_products(product_id: str, k: int = 6):
    try:
        # If we have an embedding index and mapping, use visual similarity
        if _index is not None and _emb_product_ids is not None and product_id in _emb_product_ids:
            pid_to_row = {pid: i for i, pid in enumerate(_emb_product_ids)}
            row = pid_to_row.get(product_id)
            if row is not None:
                # Query the index using the product's own vector
                # Load vectors from NPZ to align with index
                npz = np.load(EMB_DIR / 'gallery_embeddings.npz', allow_pickle=True)
                vecs = npz['vecs'].astype('float32')
                q = vecs[row:row+1]
                sims, idxs = _index.search(q, min(k+1, _index.ntotal))
                # Map neighbors to product ids, skip self
                neighbors = []
                for idx in idxs[0]:
                    nid = _emb_product_ids[idx]
                    if nid != product_id:
                        neighbors.append(nid)
                    if len(neighbors) >= k:
                        break
                # Fetch documents
                docs = []
                if products_collection and neighbors:
                    for nid in neighbors:
                        doc = _find_product_by_id(nid)
                        if doc:
                            docs.append(_serialize(doc))
                # If no matching docs were found in Mongo (ID mismatch), fall back to sampling
                if not docs and products_collection:
                    similar_products = list(products_collection.aggregate([
                        {"$match": {"_id": {"$ne": product_id}}},
                        {"$sample": {"size": k}}
                    ]))
                    return {"success": True, "data": _serialize(similar_products), "message": f"Found {len(similar_products)} similar products (fallback: id mismatch)"}
                return {"success": True, "data": docs, "message": f"Found {len(docs)} visually similar products"}

        if not products_collection:
            mock_products = [
                {
                    "_id": f"similar_{i+1}",
                    "name": f"Similar Product {i+1}",
                    "brand": "Sample Brand",
                    "defaultPrice": 100000 + i * 10000,
                }
                for i in range(k)
            ]
            return {"success": True, "data": mock_products, "message": f"Found {len(mock_products)} similar products (mock)"}

        similar_products = list(products_collection.aggregate([
            {"$match": {"_id": {"$ne": product_id}}},
            {"$sample": {"size": k}}
        ]))
        return {"success": True, "data": _serialize(similar_products), "message": f"Found {len(similar_products)} similar products (fallback)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/search/text")
async def search_text_api(q: str, k: int = 6):
    try:
        if _index is None or _emb_product_ids is None:
            return {"success": True, "data": [], "message": "Embeddings index not available"}
        qe = _embed_text_query(q)
        if qe is None:
            return {"success": True, "data": [], "message": "Model not available for text embedding"}
        sims, idxs = _index.search(qe, min(k, _index.ntotal))
        docs = _neighbors_to_docs(idxs[0], limit=k)
        return {"success": True, "data": docs, "message": f"Found {len(docs)} results for query"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/search/image")
async def search_image_api(imageUrl: str, k: int = 6):
    try:
        if _index is None or _emb_product_ids is None:
            return {"success": True, "data": [], "message": "Embeddings index not available"}
        qe = _embed_image_url(imageUrl)
        if qe is None:
            return {"success": True, "data": [], "message": "Model not available for image embedding"}
        sims, idxs = _index.search(qe, min(k, _index.ntotal))
        docs = _neighbors_to_docs(idxs[0], limit=k)
        return {"success": True, "data": docs, "message": f"Found {len(docs)} image-similar results"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/recommendations/user/{user_id}")
async def get_user_recommendations(user_id: str, k: int = 10):
    try:
        # Personalized using user vector if available
        try:
            rec_docs = _recommend_for_user(user_id, k)
        except Exception as ie:
            print(f"[WARN] Personalized recommend failed: {ie}")
            rec_docs = []
        if rec_docs:
            return {"success": True, "data": rec_docs, "message": f"Found {len(rec_docs)} personalized recommendations"}

        if not products_collection:
            mock_products = [
                {
                    "_id": f"recommended_{i+1}",
                    "name": f"Recommended Product {i+1}",
                    "brand": "Sample Brand",
                    "defaultPrice": 100000 + i * 5000,
                }
                for i in range(k)
            ]
            return {"success": True, "data": mock_products, "message": f"Found {len(mock_products)} recommendations (mock)"}

        popular_products = list(products_collection.aggregate([{ "$sample": {"size": k}}]))
        return {"success": True, "data": _serialize(popular_products), "message": f"Found {len(popular_products)} recommendations for user {user_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Fashion Service (Default Simple)", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    print("Starting Fashion Service (Default Simple)")
    print(f"Available at: http://{HOST}:{PORT}")
    print(f"API docs at: http://{HOST}:{PORT}/docs")
    uvicorn.run(app, host=HOST, port=PORT, reload=DEBUG)
