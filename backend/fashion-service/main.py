# main.py
"""
Fashion Recommendation Service API
Provides product similarity recommendations using FashionCLIP model.
"""

import os
import sys
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent / '.env'
    load_dotenv(dotenv_path=env_path)
except Exception:
    pass

# Import recommendation service
from services.recommendation_service import RecommendationService

# =========================================================
# CONFIGURATION
# =========================================================
SERVICE_ROOT = Path(__file__).resolve().parent
MODEL_PATH = Path(os.environ.get("FASHION_MODEL_PATH", SERVICE_ROOT / "models" / "fashion_clip_best.pt"))
INDEX_PATH = Path(os.environ.get("FAISS_INDEX_PATH", SERVICE_ROOT / "models" / "cloud_gallery_ip.index"))
NPZ_PATH = Path(os.environ.get("NPZ_PATH", SERVICE_ROOT / "models" / "cloud_gallery_embeddings.npz"))
PORT = int(os.environ.get("FASHION_SERVICE_PORT", 5002))
MONGODB_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/products')

# Check model file exists
if not MODEL_PATH.exists():
    logger.error(f"❌ Model file not found: {MODEL_PATH}")
    sys.exit(1)

# =========================================================
# INITIALIZE FLASK APP
# =========================================================
app = Flask(__name__)
CORS(app)

# =========================================================
# INITIALIZE SERVICES
# =========================================================
logger.info("🚀 Initializing Fashion Recommendation Service...")

# MongoDB connection
try:
    mongo_client = MongoClient(MONGODB_URI)
    db = mongo_client.get_default_database()
    db.command('ping')
    logger.info("✅ MongoDB connected")
except Exception as e:
    logger.error(f"❌ MongoDB connection failed: {e}")
    sys.exit(1)

# Recommendation service
try:
    # Initialize with FAISS if available, otherwise on-the-fly
    if INDEX_PATH.exists() and NPZ_PATH.exists():
        logger.info("🔥 Initializing with FAISS (fast mode)...")
        recommendation_service = RecommendationService(
            model_path=str(MODEL_PATH),
            index_path=str(INDEX_PATH),
            npz_path=str(NPZ_PATH),
            device='cpu'  # Change to 'cuda' if you have GPU
        )
    else:
        logger.info("⚡ Initializing without FAISS (on-the-fly mode)...")
        recommendation_service = RecommendationService(
            model_path=str(MODEL_PATH),
            device='cpu'
        )
    
    stats = recommendation_service.get_stats()
    logger.info(f"✅ Recommendation service ready - Mode: {stats['mode']}")
    
except Exception as e:
    logger.error(f"❌ Failed to initialize recommendation service: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# =========================================================
# API ENDPOINTS
# =========================================================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    try:
        # Check MongoDB
        db.command('ping')
        mongo_status = 'connected'
    except Exception:
        mongo_status = 'disconnected'
    
    # Get service stats
    stats = recommendation_service.get_stats()
    
    return jsonify({
        'status': 'healthy',
        'service': 'fashion-recommendation',
        'version': '1.0.0',
        'mongodb': mongo_status,
        'recommendation_engine': {
            'mode': stats['mode'],
            'faiss_enabled': stats['faiss_enabled'],
            'indexed_products': stats['indexed_products'],
            'cached_embeddings': stats['cached_embeddings'],
            'device': stats['device']
        }
    })


@app.route('/api/recommendations/similar', methods=['POST'])
def find_similar_products():
    """
    Find similar products based on a target product ID.
    
    Request Body:
    {
        "productId": "68dfcc7484cd07dea32e23b6",
        "limit": 6,
        "options": {
            "sameCategoryOnly": true,
            "priceTolerance": 0.5,
            "filterGender": true,
            "filterUsage": true,
            "brandBoost": 0.05,
            "minSimilarity": 0.6
        }
    }
    
    Response:
    {
        "targetProduct": {...},
        "recommendations": [...],
        "count": 6,
        "method": "faiss"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'productId' not in data:
            return jsonify({
                'error': 'Missing required field',
                'message': 'productId is required in request body'
            }), 400
        
        product_id = data['productId']
        limit = data.get('limit', 6)
        
        # Validate limit
        if not isinstance(limit, int) or limit < 1 or limit > 50:
            return jsonify({
                'error': 'Invalid limit',
                'message': 'limit must be between 1 and 50'
            }), 400
        
        # Map frontend options to service options
        frontend_options = data.get('options', {})
        service_options = {
            'price_tolerance': frontend_options.get('priceTolerance', 0.5),
            'filter_gender': frontend_options.get('filterGender', True),
            'filter_usage': frontend_options.get('filterUsage', True),
            'same_category_only': frontend_options.get('sameCategoryOnly', True),
            'brand_boost': frontend_options.get('brandBoost', 0.05),
            'min_similarity': frontend_options.get('minSimilarity', 0.6)
        }
        
        logger.info(f"Finding similar products for: {product_id}, limit: {limit}")
        
        # Get recommendations
        result = recommendation_service.get_similar_products(
            db=db,
            product_id=product_id,
            limit=limit,
            options=service_options
        )
        
        # Check if error occurred
        if 'error' in result:
            return jsonify(result), 404 if result['error'] == 'Product not found' else 500
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"❌ Error in find_similar_products: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/api/recommendations/product/<product_id>', methods=['GET'])
def get_product_recommendations(product_id):
    """
    Get recommendations for a specific product (GET endpoint).
    Optimized for product detail pages with sensible defaults.
    
    Query Parameters:
        limit: int (optional, default: 6, max: 20)
        sameCategoryOnly: bool (optional, default: true)
        minSimilarity: float (optional, default: 0.6)
    
    Example:
        GET /api/recommendations/product/68dfcc7484cd07dea32e23b6?limit=6&sameCategoryOnly=true
    
    Response: Same as /api/recommendations/similar
    """
    try:
        # Parse query parameters
        limit = int(request.args.get('limit', 6))
        limit = min(limit, 20)  # Cap at 20
        
        same_category = request.args.get('sameCategoryOnly', 'true').lower() == 'true'
        min_similarity = float(request.args.get('minSimilarity', 0.6))
        
        logger.info(f"GET recommendations for: {product_id}, limit: {limit}")
        
        # Default options optimized for product pages
        options = {
            'price_tolerance': 0.5,
            'filter_gender': True,
            'filter_usage': True,
            'same_category_only': same_category,
            'brand_boost': 0.05,
            'min_similarity': min_similarity
        }
        
        result = recommendation_service.get_similar_products(
            db=db,
            product_id=product_id,
            limit=limit,
            options=options
        )
        
        if 'error' in result:
            return jsonify(result), 404 if result['error'] == 'Product not found' else 500
        
        return jsonify(result), 200
        
    except ValueError as e:
        return jsonify({
            'error': 'Invalid parameter',
            'message': f'Invalid query parameter: {str(e)}'
        }), 400
    except Exception as e:
        logger.error(f"❌ Error in get_product_recommendations: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/api/recommendations/search-by-image', methods=['POST'])
def search_by_image():
    """
    Search for similar products using an image URL.
    
    Request Body:
    {
        "imageUrl": "https://example.com/image.jpg",
        "limit": 10,
        "options": {
            "minSimilarity": 0.6
        }
    }
    
    Response:
    {
        "results": [
            {
                "product": {...},
                "similarity": 0.95
            }
        ],
        "count": 10,
        "method": "faiss"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'imageUrl' not in data:
            return jsonify({
                'error': 'Missing required field',
                'message': 'imageUrl is required in request body'
            }), 400
        
        image_url = data['imageUrl']
        limit = data.get('limit', 10)
        
        # Validate limit
        if not isinstance(limit, int) or limit < 1 or limit > 50:
            return jsonify({
                'error': 'Invalid limit',
                'message': 'limit must be between 1 and 50'
            }), 400
        
        # Validate URL
        if not image_url.startswith(('http://', 'https://')):
            return jsonify({
                'error': 'Invalid imageUrl',
                'message': 'imageUrl must be a valid HTTP/HTTPS URL'
            }), 400
        
        frontend_options = data.get('options', {})
        service_options = {
            'min_similarity': frontend_options.get('minSimilarity', 0.6)
        }
        
        logger.info(f"Searching by image: {image_url[:70]}..., limit: {limit}")
        
        # Search by image
        result = recommendation_service.search_by_image(
            db=db,
            image_url=image_url,
            limit=limit,
            options=service_options
        )
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"❌ Error in search_by_image: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/api/recommendations/stats', methods=['GET'])
def get_recommendation_stats():
    """
    Get recommendation service statistics and health info.
    
    Response:
    {
        "mode": "hybrid",
        "faiss_enabled": true,
        "index_vectors": 40,
        "indexed_products": 40,
        "cached_embeddings": 5,
        "device": "cpu",
        "model_config": {...}
    }
    """
    try:
        stats = recommendation_service.get_stats()
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"❌ Error in get_recommendation_stats: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/api/recommendations/batch', methods=['POST'])
def get_batch_recommendations():
    """
    Get recommendations for multiple products in one request.
    Useful for homepage "You may also like" sections.
    
    Request Body:
    {
        "productIds": ["id1", "id2", "id3"],
        "limit": 3
    }
    
    Response:
    {
        "results": {
            "id1": {
                "recommendations": [...],
                "count": 3
            },
            "id2": {...}
        },
        "totalProcessed": 3,
        "method": "faiss"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'productIds' not in data:
            return jsonify({
                'error': 'Missing required field',
                'message': 'productIds array is required'
            }), 400
        
        product_ids = data['productIds']
        
        if not isinstance(product_ids, list) or len(product_ids) == 0:
            return jsonify({
                'error': 'Invalid productIds',
                'message': 'productIds must be a non-empty array'
            }), 400
        
        if len(product_ids) > 10:
            return jsonify({
                'error': 'Too many products',
                'message': 'Maximum 10 products per batch request'
            }), 400
        
        limit = data.get('limit', 3)
        
        logger.info(f"Batch recommendations for {len(product_ids)} products")
        
        results = {}
        method = None
        
        for product_id in product_ids:
            result = recommendation_service.get_similar_products(
                db=db,
                product_id=product_id,
                limit=limit,
                options={'min_similarity': 0.65}
            )
            
            if 'error' not in result:
                results[product_id] = {
                    'recommendations': result.get('recommendations', []),
                    'count': result.get('count', 0)
                }
                if method is None:
                    method = result.get('method', 'unknown')
        
        return jsonify({
            'results': results,
            'totalProcessed': len(results),
            'method': method
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error in get_batch_recommendations: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


# =========================================================
# ERROR HANDLERS
# =========================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found',
        'message': 'The requested endpoint does not exist'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500


@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'error': 'Bad request',
        'message': 'Invalid request format or parameters'
    }), 400


# =========================================================
# RUN SERVER
# =========================================================
if __name__ == '__main__':
    print("\n" + "=" * 70)
    print("🚀 FASHION RECOMMENDATION SERVICE")
    print("=" * 70)
    print(f"📍 Port: {PORT}")
    print(f"🔧 Mode: {recommendation_service.get_stats()['mode']}")
    print(f"📊 Indexed Products: {recommendation_service.get_stats()['indexed_products']}")
    print(f"💾 Device: {recommendation_service.get_stats()['device']}")
    print("\n📍 API Endpoints:")
    print(f"   • Health Check:")
    print(f"     GET  http://localhost:{PORT}/health")
    print(f"\n   • Get Similar Products (POST):")
    print(f"     POST http://localhost:{PORT}/api/recommendations/similar")
    print(f"\n   • Get Product Recommendations (GET):")
    print(f"     GET  http://localhost:{PORT}/api/recommendations/product/<product_id>")
    print(f"\n   • Search by Image:")
    print(f"     POST http://localhost:{PORT}/api/recommendations/search-by-image")
    print(f"\n   • Batch Recommendations:")
    print(f"     POST http://localhost:{PORT}/api/recommendations/batch")
    print(f"\n   • Service Statistics:")
    print(f"     GET  http://localhost:{PORT}/api/recommendations/stats")
    print("=" * 70 + "\n")
    
    app.run(host='0.0.0.0', port=PORT, debug=False)