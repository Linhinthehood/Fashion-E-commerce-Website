import os, json, torch, numpy as np, requests, sys
from io import BytesIO
from PIL import Image
import pillow_avif  # needed to decode .avif files
from sklearn.metrics.pairwise import cosine_similarity
from transformers import CLIPProcessor
from models.FashionCLIP import FashionCLIP
from pathlib import Path
from bson import ObjectId
from flask import Flask, request, jsonify
from flask_cors import CORS

# Optional: load environment variables from .env in the service root
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parent / '.env')
except Exception:
    pass

# =========================================================
# CONFIGURATION
# =========================================================
SERVICE_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = SERVICE_ROOT.parent

MODEL_PATH = Path(os.environ.get("FASHION_MODEL_PATH", SERVICE_ROOT / "models" / "fashion_clip_best.pt"))
PORT = int(os.environ.get("FASHION_SERVICE_PORT", 5002))

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Helpful diagnostics when things are missing
if not MODEL_PATH.exists():
    try:
        from config.config import DEFAULT_CHECKPOINT
        fallback = Path(DEFAULT_CHECKPOINT)
        if fallback.exists():
            MODEL_PATH = fallback
    except Exception:
        pass

if not MODEL_PATH.exists():
    print(f"❌ Model file not found: {MODEL_PATH}")
    print("Please place the checkpoint at that path, or set the FASHION_MODEL_PATH environment variable to a valid .pt file.")
    print(f"Expected location (service relative): {SERVICE_ROOT / 'models' / 'fashion_clip_best.pt'}")
    sys.exit(1)

# =========================================================
# LOAD MODEL
# =========================================================
print("🧠 Loading FashionCLIP model...")
import numpy, torch.serialization
torch.serialization.add_safe_globals([numpy._core.multiarray.scalar])

ckpt = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)
cfg = ckpt["config"]
processor = CLIPProcessor.from_pretrained(cfg["model_name"])
model = FashionCLIP(cfg["model_name"], cfg["embedding_dim"]).to(device)
model.load_state_dict(ckpt["model_state_dict"])
model.eval()
print("✅ Model loaded successfully!")

# =========================================================
# FLASK APP
# =========================================================
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# =========================================================
# MONGODB CONNECTION
# =========================================================
def get_mongo_connection():
    """Get MongoDB connection."""
    try:
        from pymongo import MongoClient
        mongo_uri = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/products')
        client = MongoClient(mongo_uri)
        db = client.get_default_database()
        if db is None:
            db = client.get_database(os.environ.get('MONGO_DB', 'products'))
        return db
    except Exception as e:
        print(f"⚠️ MongoDB connection failed: {e}")
        return None

# =========================================================
# HELPER FUNCTIONS
# =========================================================
def load_image_from_url(url):
    """Load image from URL."""
    try:
        r = requests.get(url, timeout=10)
        img = Image.open(BytesIO(r.content)).convert("RGB")
        return img
    except Exception as e:
        print(f"⚠️ Error loading {url} : {e}")
        return None

@torch.no_grad()
def embed_image(img):
    """Generate embedding for an image."""
    inputs = processor(images=[img], text=[""], return_tensors="pt",
                      truncation=True, max_length=77).to(device)
    img_emb, _ = model(**inputs)
    return img_emb.cpu().numpy().astype("float32")[0]

def safe_id(x):
    """Handles both {'$oid': '...'} and plain string IDs"""
    if isinstance(x, dict) and "$oid" in x:
        return x["$oid"]
    if isinstance(x, ObjectId):
        return str(x)
    return str(x)

def safe_subcategory(product):
    """Safely extract subcategory from product."""
    cat_id = product.get("categoryId")
    
    if isinstance(cat_id, dict):
        return cat_id.get("subCategory", "Unknown")
    
    return "Unknown"

def load_products_with_category(db, category_filter=None):
    """Load products from MongoDB with populated category information."""
    products_coll = db.get_collection(os.environ.get('MONGO_COLLECTION', 'products'))
    categories_coll = db.get_collection('categories')
    
    # Load all categories into a dictionary
    categories = {cat['_id']: cat for cat in categories_coll.find()}
    
    # Build query
    query = {}
    if category_filter:
        query['categoryId'] = category_filter
    
    # Load products and populate categoryId
    products = []
    for product in products_coll.find(query):
        if isinstance(product.get('categoryId'), ObjectId):
            cat_id = product['categoryId']
            if cat_id in categories:
                product['categoryId'] = categories[cat_id]
            else:
                product['categoryId'] = {
                    '_id': cat_id,
                    'subCategory': 'Unknown',
                    'masterCategory': 'Unknown',
                    'articleType': 'Unknown'
                }
        products.append(product)
    
    return products

# =========================================================
# API ENDPOINTS
# =========================================================
@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'model': 'FashionCLIP',
        'device': str(device)
    })

@app.route('/api/similar-products', methods=['POST'])
def find_similar_products():
    """
    Find similar products based on a target product ID.
    
    Request Body:
    {
        "productId": "string",
        "limit": int (optional, default: 5),
        "sameCategoryOnly": bool (optional, default: true)
    }
    
    Response:
    {
        "targetProduct": {...},
        "similarProducts": [
            {
                "product": {...},
                "similarity": float
            }
        ]
    }
    """
    try:
        # Use force=True to parse JSON regardless of Content-Type header
        data = request.get_json(force=True, silent=True)
        
        if data is None:
            return jsonify({'error': 'Invalid JSON or missing Content-Type header. Please set Content-Type: application/json'}), 400
        
        if 'productId' not in data:
            return jsonify({'error': 'productId is required'}), 400
        
        target_id = data['productId']
        limit = data.get('limit', 5)
        same_category_only = data.get('sameCategoryOnly', True)
        
        # Get MongoDB connection
        db = get_mongo_connection()
        if db is None:
            return jsonify({'error': 'Database connection failed'}), 500
        
        products_coll = db.get_collection(os.environ.get('MONGO_COLLECTION', 'products'))
        
        # Find target product
        try:
            target_oid = ObjectId(target_id)
        except:
            return jsonify({'error': 'Invalid productId format'}), 400
        
        target_prod = products_coll.find_one({'_id': target_oid})
        if not target_prod:
            return jsonify({'error': 'Product not found'}), 404
        
        # Load target image
        target_imgs = target_prod.get("images", [])
        if not target_imgs:
            return jsonify({'error': 'Target product has no images'}), 400
        
        target_img = load_image_from_url(target_imgs[0])
        if target_img is None:
            return jsonify({'error': 'Failed to load target image'}), 500
        
        # Generate target embedding
        print(f"🔍 Generating embedding for target product: {target_id}")
        target_emb = embed_image(target_img)
        
        # Determine category filter
        category_filter = None
        if same_category_only:
            category_filter = target_prod.get('categoryId')
        
        # Load candidate products
        print(f"📦 Loading candidate products...")
        products = load_products_with_category(db, category_filter)
        print(f"✅ Found {len(products)} candidate products")
        
        # Compute similarities
        similarities = []
        for p in products:
            pid = safe_id(p["_id"])
            if pid == target_id:
                continue
            
            imgs = p.get("images", [])
            if not imgs:
                continue
            
            img = load_image_from_url(imgs[0])
            if img is None:
                continue
            
            emb = embed_image(img)
            sim_score = float(cosine_similarity([target_emb], [emb])[0][0])
            
            # Convert ObjectId to string for JSON serialization
            p['_id'] = safe_id(p['_id'])
            if 'categoryId' in p and isinstance(p['categoryId'], dict) and '_id' in p['categoryId']:
                p['categoryId']['_id'] = safe_id(p['categoryId']['_id'])
            
            similarities.append({
                'product': p,
                'similarity': sim_score
            })
        
        # Sort by similarity and get top results
        similarities.sort(key=lambda x: -x['similarity'])
        top_results = similarities[:limit]
        
        # Prepare target product for response
        target_prod['_id'] = safe_id(target_prod['_id'])
        if 'categoryId' in target_prod and isinstance(target_prod['categoryId'], ObjectId):
            target_prod['categoryId'] = safe_id(target_prod['categoryId'])
        
        print(f"✅ Returning {len(top_results)} similar products")
        
        return jsonify({
            'targetProduct': target_prod,
            'similarProducts': top_results,
            'totalFound': len(similarities)
        })
        
    except Exception as e:
        print(f"❌ Error in find_similar_products: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/embed-image', methods=['POST'])
def embed_image_endpoint():
    """
    Generate embedding for an image URL.
    
    Request Body:
    {
        "imageUrl": "string"
    }
    
    Response:
    {
        "embedding": [float, ...]
    }
    """
    try:
        # Use force=True to parse JSON regardless of Content-Type header
        data = request.get_json(force=True, silent=True)
        
        if data is None:
            return jsonify({'error': 'Invalid JSON or missing Content-Type header. Please set Content-Type: application/json'}), 400
        
        if 'imageUrl' not in data:
            return jsonify({'error': 'imageUrl is required'}), 400
        
        image_url = data['imageUrl']
        
        # Load image
        img = load_image_from_url(image_url)
        if img is None:
            return jsonify({'error': 'Failed to load image'}), 400
        
        # Generate embedding
        emb = embed_image(img)
        
        return jsonify({
            'embedding': emb.tolist(),
            'dimension': len(emb)
        })
        
    except Exception as e:
        print(f"❌ Error in embed_image_endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/search-by-image', methods=['POST'])
def search_by_image():
    """
    Search for similar products using an image URL.
    
    Request Body:
    {
        "imageUrl": "string",
        "limit": int (optional, default: 10),
        "categoryFilter": "string" (optional, subcategory name)
    }
    
    Response:
    {
        "results": [
            {
                "product": {...},
                "similarity": float
            }
        ]
    }
    """
    try:
        # Use force=True to parse JSON regardless of Content-Type header
        data = request.get_json(force=True, silent=True)
        
        if data is None:
            return jsonify({'error': 'Invalid JSON or missing Content-Type header. Please set Content-Type: application/json'}), 400
        
        if 'imageUrl' not in data:
            return jsonify({'error': 'imageUrl is required'}), 400
        
        image_url = data['imageUrl']
        limit = data.get('limit', 10)
        category_filter = data.get('categoryFilter')
        
        # Load image
        img = load_image_from_url(image_url)
        if img is None:
            return jsonify({'error': 'Failed to load image'}), 400
        
        # Generate query embedding
        print(f"🔍 Generating embedding for search image...")
        query_emb = embed_image(img)
        
        # Get MongoDB connection
        db = get_mongo_connection()
        if db is None:
            return jsonify({'error': 'Database connection failed'}), 500
        
        # Load products
        print(f"📦 Loading products...")
        products = load_products_with_category(db)
        
        # Filter by category if specified
        if category_filter:
            products = [p for p in products if safe_subcategory(p) == category_filter]
            print(f"✅ Filtered to {len(products)} products in category: {category_filter}")
        
        # Compute similarities
        similarities = []
        for p in products:
            imgs = p.get("images", [])
            if not imgs:
                continue
            
            img = load_image_from_url(imgs[0])
            if img is None:
                continue
            
            emb = embed_image(img)
            sim_score = float(cosine_similarity([query_emb], [emb])[0][0])
            
            # Convert ObjectId to string
            p['_id'] = safe_id(p['_id'])
            if 'categoryId' in p and isinstance(p['categoryId'], dict) and '_id' in p['categoryId']:
                p['categoryId']['_id'] = safe_id(p['categoryId']['_id'])
            
            similarities.append({
                'product': p,
                'similarity': sim_score
            })
        
        # Sort by similarity and get top results
        similarities.sort(key=lambda x: -x['similarity'])
        top_results = similarities[:limit]
        
        print(f"✅ Returning {len(top_results)} matching products")
        
        return jsonify({
            'results': top_results,
            'totalFound': len(similarities)
        })
        
    except Exception as e:
        print(f"❌ Error in search_by_image: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# =========================================================
# RUN SERVER
# =========================================================
if __name__ == '__main__':
    print(f"\n🚀 Starting Fashion Similarity API on port {PORT}...")
    print(f"📍 Health check: http://localhost:{PORT}/health")
    print(f"📍 Similar products: POST http://localhost:{PORT}/api/similar-products")
    print(f"📍 Embed image: POST http://localhost:{PORT}/api/embed-image")
    print(f"📍 Search by image: POST http://localhost:{PORT}/api/search-by-image")
    app.run(host='0.0.0.0', port=PORT, debug=False)