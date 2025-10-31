#!/usr/bin/env python3
"""
Fashion Service - Essential Similarity & Recommendation API
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path
import numpy as np
import traceback
from bson import ObjectId

try:
    from models.similarity import load_model as _load_fashion_model
    from config.config import config as _fashion_cfg
    import torch
    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
except Exception:
    _load_fashion_model = None
    _fashion_cfg = None
    _device = None

load_dotenv()

app = FastAPI(title="Fashion Recommendation Service")

# Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "products")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
client = None
db = None
products_collection = None

try:
    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DATABASE]
    products_collection = db.products
    client.admin.command('ping')
    print(f"[OK] Connected to MongoDB: {MONGODB_DATABASE}")
except Exception as e:
    print(f"[ERROR] MongoDB connection failed: {e}")

# Model globals
_model = None
_processor = None
_cfg = None
_text_vecs = None
_text_product_ids = None
_text_embeddings_loading = False

def _serialize(obj):
    """Convert MongoDB objects to JSON-safe format"""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(v) for v in obj]
    return obj

def _find_product_by_id(pid: str):
    """Find product by ID (string or ObjectId)"""
    if products_collection is None:
        return None
    doc = products_collection.find_one({'_id': pid})
    if doc:
        return doc
    try:
        oid = ObjectId(pid)
        doc = products_collection.find_one({'_id': oid})
        if doc:
            return doc
    except Exception:
        pass
    return None

def _ensure_model_loaded():
    """Load FashionCLIP model from .pt checkpoint"""
    global _model, _processor, _cfg
    if _model is None and _load_fashion_model and _fashion_cfg is not None and _device is not None:
        try:
            print("[INFO] Loading FashionCLIP model from .pt checkpoint...")
            _model, _processor, _cfg = _load_fashion_model(_fashion_cfg.checkpoint_path, _device)
            print(f"[OK] Loaded model: {_fashion_cfg.checkpoint_path}")
        except Exception as e:
            print(f"[ERROR] Could not load model: {e}")
            traceback.print_exc()

def _ensure_text_embeddings_loaded(batch_size: int = 32):
    """Build text embeddings from products using trained .pt model"""
    global _text_vecs, _text_product_ids, _text_embeddings_loading
    
    if _text_vecs is not None and _text_product_ids is not None:
        return True
    
    if _text_embeddings_loading:
        return False
    
    _text_embeddings_loading = True
    
    try:
        if products_collection is None:
            print("[ERROR] No products collection")
            return False
        
        _ensure_model_loaded()
        if _model is None or _processor is None or _cfg is None:
            print("[ERROR] Model not available")
            return False
        
        print("[INFO] Building text embeddings from products using .pt model...")
        
        from PIL import Image
        
        # Fetch products
        cursor = products_collection.find({}, {"name": 1, "description": 1, "brand": 1})
        ids = []
        texts = []
        
        for doc in cursor:
            pid = str(doc.get('_id'))
            name = doc.get('name') or ''
            desc = doc.get('description') or ''
            brand = doc.get('brand') or ''
            text = f"{name} {brand} {desc}".strip()
            if not text:
                text = "unknown product"
            ids.append(pid)
            texts.append(text)
        
        if not texts:
            print("[ERROR] No products found")
            return False
        
        print(f"[INFO] Embedding {len(texts)} products...")
        
        # Batch embed
        vecs_list = []
        blank = Image.new("RGB", (_cfg.get("image_size", 224), _cfg.get("image_size", 224)), "white")
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            imgs = [blank] * len(batch_texts)
            
            enc = _processor(
                text=batch_texts,
                images=imgs,
                return_tensors="pt",
                padding="max_length",
                truncation=True,
                max_length=_cfg.get("max_length", 77)
            )
            
            pv = enc["pixel_values"].to(_device)
            ids_in = enc["input_ids"].to(_device)
            am = enc["attention_mask"].to(_device)
            
            with torch.no_grad():
                _, txt_e = _model(pv, ids_in, am)
            
            vecs_list.append(txt_e.cpu().numpy().astype('float32'))
            print(f"[INFO] Batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")
        
        _text_vecs = np.concatenate(vecs_list, axis=0)
        
        # Normalize
        norms = np.linalg.norm(_text_vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        _text_vecs = _text_vecs / norms
        
        _text_product_ids = ids
        
        print(f"[OK] Built text embeddings for {len(_text_product_ids)} products using .pt model")
        return True
        
    except Exception as e:
        print(f"[ERROR] Failed to build embeddings: {e}")
        traceback.print_exc()
        return False
    finally:
        _text_embeddings_loading = False

# API Endpoints

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "db_connected": products_collection is not None,
        "model_loaded": _model is not None,
        "embeddings_ready": _text_vecs is not None,
        "using_pt_model": _model is not None
    }

@app.get("/api/v1/products/{product_id}")
async def get_product_details(product_id: str):
    """Get product details by ID"""
    try:
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
    """Get similar products using .pt model embeddings + category matching"""
    try:
        if products_collection is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get source product
        source_product = _find_product_by_id(product_id)
        if not source_product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        source_name = source_product.get('name', '')
        source_brand = source_product.get('brand', '')
        source_category = source_product.get('category') or source_product.get('categoryId', {})
        
        print(f"[DEBUG] Finding similar products for: {source_name}")
        
        similar_docs = []
        
        # Strategy 1: Use .pt model text embeddings (BEST - uses your trained model)
        if _ensure_text_embeddings_loaded():
            print("[DEBUG] Using .pt model embeddings for similarity")
            
            # Find source product in embeddings
            source_idx = None
            for i, pid in enumerate(_text_product_ids):
                if str(pid) == str(product_id):
                    source_idx = i
                    break
            
            if source_idx is not None:
                # Get similarity scores using trained model embeddings
                source_vec = _text_vecs[source_idx]
                sims = np.dot(_text_vecs, source_vec)
                
                # Get top k+10 candidates (we'll filter and dedupe)
                top_idxs = np.argsort(sims)[::-1][:k+10]
                
                for idx in top_idxs:
                    if len(similar_docs) >= k:
                        break
                    
                    pid = str(_text_product_ids[idx])
                    if pid != str(product_id):
                        doc = _find_product_by_id(pid)
                        if doc:
                            similar_docs.append(_serialize(doc))
                
                if similar_docs:
                    print(f"[OK] Found {len(similar_docs)} products using .pt model")
                    return {
                        "success": True,
                        "data": similar_docs[:k],
                        "message": f"Found {len(similar_docs[:k])} similar products (using trained .pt model)",
                        "method": "trained_model_embeddings"
                    }
        
        # Strategy 2: Category matching (fallback)
        print("[DEBUG] Using category matching (fallback)")
        
        if isinstance(source_category, dict):
            article_type = source_category.get('articleType', '')
            sub_category = source_category.get('subCategory', '')
        else:
            article_type = str(source_category)
            sub_category = ''
        
        category_match = []
        
        if article_type:
            category_match.append({"category.articleType": article_type})
            category_match.append({"categoryId.articleType": article_type})
        
        if sub_category:
            category_match.append({"category.subCategory": sub_category})
            category_match.append({"categoryId.subCategory": sub_category})
        
        if not category_match and source_name:
            tokens = source_name.split()[:2]
            name_pattern = ' '.join(tokens)
            category_match.append({"name": {"$regex": name_pattern, "$options": "i"}})
        
        if not category_match:
            similar_docs = list(products_collection.aggregate([
                {"$match": {"_id": {"$ne": product_id}}},
                {"$sample": {"size": k}}
            ]))
        else:
            pipeline = [
                {"$match": {
                    "$and": [
                        {"_id": {"$ne": product_id}},
                        {"$or": category_match}
                    ]
                }},
                {
                    "$addFields": {
                        "score": {
                            "$add": [
                                {"$cond": [
                                    {"$or": [
                                        {"$eq": [{"$ifNull": ["$category.articleType", ""]}, article_type]},
                                        {"$eq": [{"$ifNull": ["$categoryId.articleType", ""]}, article_type]}
                                    ]},
                                    10, 0
                                ]},
                                {"$cond": [
                                    {"$or": [
                                        {"$eq": [{"$ifNull": ["$category.subCategory", ""]}, sub_category]},
                                        {"$eq": [{"$ifNull": ["$categoryId.subCategory", ""]}, sub_category]}
                                    ]},
                                    5, 0
                                ]},
                                {"$cond": [{"$eq": ["$brand", source_brand]}, 3, 0]}
                            ]
                        }
                    }
                },
                {"$sort": {"score": -1}},
                {"$limit": k},
                {"$project": {
                    "name": 1,
                    "brand": 1,
                    "category": 1,
                    "categoryId": 1,
                    "defaultPrice": 1,
                    "images": {"$slice": ["$images", 1]},
                    "description": 1
                }}
            ]
            
            similar_docs = list(products_collection.aggregate(pipeline))
        
        return {
            "success": True,
            "data": _serialize(similar_docs),
            "message": f"Found {len(similar_docs)} similar products (category matching)",
            "method": "category_matching"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Similar products failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/recommendations/user/{user_id}")
async def get_user_recommendations(user_id: str, k: int = 10):
    """Get recommendations for user (currently returns popular products)"""
    try:
        if products_collection is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        popular = list(products_collection.aggregate([{"$sample": {"size": k}}]))
        return {
            "success": True,
            "data": _serialize(popular),
            "message": f"Found {len(popular)} recommendations"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {
        "message": "Fashion Recommendation Service",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "product_details": "/api/v1/products/{product_id}",
            "similar_products": "/api/v1/recommendations/product/{product_id}",
            "user_recommendations": "/api/v1/recommendations/user/{user_id}"
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Fashion Recommendation Service")
    print(f"Server: http://{HOST}:{PORT}")
    print(f"Docs: http://{HOST}:{PORT}/docs")
    uvicorn.run(app, host=HOST, port=PORT)