import os
import sys
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from flasgger import Swagger
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / '.env')
except:
    pass

from services.recommendation_service import RecommendationService

SERVICE_ROOT = Path(__file__).resolve().parent
MODEL_PATH = Path(os.environ.get("FASHION_MODEL_PATH", SERVICE_ROOT / "models" / "fashion_clip_best.pt"))
INDEX_PATH = Path(os.environ.get("FAISS_INDEX_PATH", SERVICE_ROOT / "models" / "cloud_gallery_ip.index"))
NPZ_PATH = Path(os.environ.get("NPZ_PATH", SERVICE_ROOT / "models" / "cloud_gallery_embeddings.npz"))
PORT = int(os.environ.get("RECOMMEND_SERVICE_PORT", 3008))
PRODUCT_SERVICE_URL = os.environ.get('PRODUCT_SERVICE_URL', 'http://localhost:3002')
ORDER_SERVICE_URL = os.environ.get('ORDER_SERVICE_URL', 'http://localhost:3003')
API_GATEWAY_URL = os.environ.get('API_GATEWAY_URL', 'http://localhost:3000')

# Redis configuration
REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
REDIS_DB = int(os.environ.get('REDIS_DB', 0))
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', None)
REDIS_ENABLED = os.environ.get('REDIS_ENABLED', 'true').lower() == 'true'

# Set environment for events API client
os.environ.setdefault('ORDER_SERVICE_URL', ORDER_SERVICE_URL)
os.environ.setdefault('API_GATEWAY_URL', API_GATEWAY_URL)
os.environ.setdefault('USE_API_GATEWAY', 'true')  # Use API Gateway by default
os.environ.setdefault('REDIS_HOST', REDIS_HOST)
os.environ.setdefault('REDIS_PORT', str(REDIS_PORT))
os.environ.setdefault('REDIS_DB', str(REDIS_DB))
if REDIS_PASSWORD:
    os.environ.setdefault('REDIS_PASSWORD', REDIS_PASSWORD)
os.environ.setdefault('REDIS_ENABLED', 'true' if REDIS_ENABLED else 'false')

if not MODEL_PATH.exists():
    logger.error(f"Model file not found: {MODEL_PATH}")
    sys.exit(1)

app = Flask(__name__)
CORS(app)

# Swagger configuration
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": "apispec",
            "route": "/apispec.json",
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api-docs"
}

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "Fashion Recommendation Service API",
        "description": "API documentation for Fashion Recommendation Service - Product recommendations using FashionCLIP and FAISS",
        "version": "1.0.0",
        "contact": {
            "name": "Fashion E-commerce Team"
        }
    },
    "host": f"localhost:{PORT}",
    "basePath": "/",
    "schemes": ["http", "https"],
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\""
        }
    }
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

logger.info(f"Initializing Recommend Service on port {PORT}")
logger.info(f"Product Service URL: {PRODUCT_SERVICE_URL}")
logger.info(f"Redis: {REDIS_HOST}:{REDIS_PORT} (enabled: {REDIS_ENABLED})")

db = None

try:
    if INDEX_PATH.exists() and NPZ_PATH.exists():
        recommendation_service = RecommendationService(
            model_path=str(MODEL_PATH),
            index_path=str(INDEX_PATH),
            npz_path=str(NPZ_PATH),
            device='cpu'
        )
    else:
        recommendation_service = RecommendationService(model_path=str(MODEL_PATH), device='cpu')
    
    logger.info(f"Service ready - Mode: {recommendation_service.get_stats()['mode']}")
except Exception as e:
    logger.error(f"Failed to initialize: {e}")
    sys.exit(1)

@app.route('/health', methods=['GET'])
def health():
    """
    Health check endpoint
    ---
    tags:
      - Health
    responses:
      200:
        description: Service health status
        schema:
          type: object
          properties:
            status:
              type: string
              example: healthy
            service:
              type: string
              example: recommend-service
            version:
              type: string
              example: 1.0.0
            mode:
              type: string
            indexed_products:
              type: integer
            device:
              type: string
    """
    stats = recommendation_service.get_stats()
    return jsonify({
        'status': 'healthy',
        'service': 'recommend-service',
        'version': '1.0.0',
        'mode': stats['mode'],
        'indexed_products': stats['indexed_products'],
        'device': stats['device']
    })


@app.route('/api/recommendations/similar', methods=['POST'])
def find_similar_products():
    """
    Find similar products using POST request
    ---
    tags:
      - Recommendations
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - productId
          properties:
            productId:
              type: string
              description: Product ID to find similar products for
              example: "507f1f77bcf86cd799439011"
            limit:
              type: integer
              default: 6
              minimum: 1
              maximum: 50
              description: Maximum number of recommendations
            options:
              type: object
              properties:
                priceTolerance:
                  type: number
                  default: 0.5
                filterGender:
                  type: boolean
                  default: true
                filterUsage:
                  type: boolean
                  default: true
                sameCategoryOnly:
                  type: boolean
                  default: true
                brandBoost:
                  type: number
                  default: 0.05
                minSimilarity:
                  type: number
                  default: 0.6
    responses:
      200:
        description: Similar products found
        schema:
          type: object
          properties:
            product:
              type: object
            recommendations:
              type: array
            count:
              type: integer
      400:
        description: Invalid request
      404:
        description: Product not found
      500:
        description: Internal server error
    """
    try:
        data = request.get_json()
        if not data or 'productId' not in data:
            return jsonify({'error': 'productId required'}), 400
        
        product_id = data['productId']
        limit = data.get('limit', 6)
        
        if not isinstance(limit, int) or limit < 1 or limit > 50:
            return jsonify({'error': 'limit must be 1-50'}), 400
        
        opts = data.get('options', {})
        service_options = {
            'price_tolerance': opts.get('priceTolerance', 0.5),
            'filter_gender': opts.get('filterGender', True),
            'filter_usage': opts.get('filterUsage', True),
            'same_category_only': opts.get('sameCategoryOnly', True),
            'brand_boost': opts.get('brandBoost', 0.05),
            'min_similarity': opts.get('minSimilarity', 0.6)
        }
        
        result = recommendation_service.get_similar_products(db=db, product_id=product_id, limit=limit, options=service_options)
        
        if 'error' in result:
            return jsonify(result), 404 if result['error'] == 'Product not found' else 500
        
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/recommendations/product/<product_id>', methods=['GET'])
def get_product_recommendations(product_id):
    """
    Get product recommendations based on product ID
    ---
    tags:
      - Recommendations
    parameters:
      - name: product_id
        in: path
        type: string
        required: true
        description: Product ID to get recommendations for
        example: "507f1f77bcf86cd799439011"
      - name: limit
        in: query
        type: integer
        default: 6
        minimum: 1
        maximum: 20
        description: Maximum number of recommendations to return
      - name: sameCategoryOnly
        in: query
        type: boolean
        default: true
        description: Filter recommendations to same category only
      - name: minSimilarity
        in: query
        type: number
        format: float
        default: 0.6
        minimum: 0
        maximum: 1
        description: Minimum similarity score threshold
    responses:
      200:
        description: Recommendations retrieved successfully
        schema:
          type: object
          properties:
            product:
              type: object
              description: Original product information
            recommendations:
              type: array
              items:
                type: object
                properties:
                  product:
                    type: object
                  similarity:
                    type: number
            count:
              type: integer
              description: Number of recommendations returned
            method:
              type: string
              description: Method used for recommendations
      404:
        description: Product not found
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Product not found"
      400:
        description: Invalid parameter
      500:
        description: Internal server error
    """
    try:
        limit = min(int(request.args.get('limit', 6)), 20)
        same_category = request.args.get('sameCategoryOnly', 'true').lower() == 'true'
        min_similarity = float(request.args.get('minSimilarity', 0.6))
        
        options = {
            'price_tolerance': 0.5,
            'filter_gender': True,
            'filter_usage': True,
            'same_category_only': same_category,
            'brand_boost': 0.05,
            'min_similarity': min_similarity
        }
        
        result = recommendation_service.get_similar_products(db=db, product_id=product_id, limit=limit, options=options)
        
        if 'error' in result:
            return jsonify(result), 404 if result['error'] == 'Product not found' else 500
        
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': f'Invalid parameter: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/recommendations/search-by-image', methods=['POST'])
def search_by_image():
    try:
        data = request.get_json()
        if not data or 'imageUrl' not in data:
            return jsonify({'error': 'imageUrl required'}), 400
        
        image_url = data['imageUrl']
        limit = data.get('limit', 10)
        
        if not isinstance(limit, int) or limit < 1 or limit > 50:
            return jsonify({'error': 'limit must be 1-50'}), 400
        
        if not image_url.startswith(('http://', 'https://')):
            return jsonify({'error': 'Invalid URL'}), 400
        
        opts = data.get('options', {})
        service_options = {'min_similarity': opts.get('minSimilarity', 0.6)}
        
        result = recommendation_service.search_by_image(db=db, image_url=image_url, limit=limit, options=service_options)
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/recommendations/stats', methods=['GET'])
def get_recommendation_stats():
    try:
        return jsonify(recommendation_service.get_stats()), 200
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/recommendations/batch', methods=['POST'])
def get_batch_recommendations():
    try:
        data = request.get_json()
        if not data or 'productIds' not in data:
            return jsonify({'error': 'productIds required'}), 400
        
        product_ids = data['productIds']
        if not isinstance(product_ids, list) or len(product_ids) == 0:
            return jsonify({'error': 'productIds must be non-empty array'}), 400
        
        if len(product_ids) > 10:
            return jsonify({'error': 'Max 10 products per batch'}), 400
        
        limit = data.get('limit', 3)
        results = {}
        method = None
        
        for product_id in product_ids:
            result = recommendation_service.get_similar_products(db=db, product_id=product_id, limit=limit, options={'min_similarity': 0.65})
            if 'error' not in result:
                results[product_id] = {'recommendations': result.get('recommendations', []), 'count': result.get('count', 0)}
                if method is None:
                    method = result.get('method', 'unknown')
        
        return jsonify({'results': results, 'totalProcessed': len(results), 'method': method}), 200
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/recommendations/retrieve/personalized', methods=['POST'])
def retrieve_personalized():
    try:
        data = request.get_json() or {}
        recent_item_ids = data.get('recentItemIds', [])
        if not isinstance(recent_item_ids, list):
            return jsonify({'error': 'recentItemIds must be an array'}), 400
        limit = int(data.get('limit', 50))
        
        # Build options dict with userId and hybrid scoring weights
        options = data.get('options', {})
        if 'userId' in data:
            options['userId'] = data['userId']
        
        # Allow override of hybrid scoring weights
        if 'alpha' in data:
            options['alpha'] = float(data['alpha'])
        if 'beta' in data:
            options['beta'] = float(data['beta'])
        if 'gamma' in data:
            options['gamma'] = float(data['gamma'])

        result = recommendation_service.retrieve_personalized(
            db=db,
            recent_item_ids=recent_item_ids,
            limit=limit,
            options=options
        )

        status = 200 if 'error' not in result else 400
        return jsonify(result), status
    except ValueError as e:
        return jsonify({'error': f'Invalid parameter: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# =========================================================
# ERROR HANDLERS
# =========================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400


# =========================================================
# RUN SERVER
# =========================================================
if __name__ == '__main__':
    stats = recommendation_service.get_stats()
    print(f"\nRecommend Service")
    print(f"Port: {PORT}")
    print(f"Mode: {stats['mode']}")
    print(f"Indexed Products: {stats['indexed_products']}")
    print(f"Device: {stats['device']}")
    print(f"URL: http://localhost:{PORT}\n")
    app.run(host='0.0.0.0', port=PORT, debug=False)