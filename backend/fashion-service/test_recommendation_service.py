# test_recommendation_service.py
"""
Test script for the recommendation service.
Tests both FAISS mode and on-the-fly mode.
"""

import os
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv
import json

from services.recommendation_service import RecommendationService

# Load environment variables
env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)

# Configuration
MONGODB_URI = os.environ.get('MONGODB_URI')
MODEL_PATH = Path(os.environ.get('FASHION_MODEL_PATH', 'models/fashion_clip_best.pt'))
INDEX_PATH = Path('models/cloud_gallery_ip.index')
NPZ_PATH = Path('models/cloud_gallery_embeddings.npz')

# Check if files exist
print("=" * 70)
print("CHECKING FILES")
print("=" * 70)
print(f"✓ Model: {MODEL_PATH} - {'EXISTS' if MODEL_PATH.exists() else 'NOT FOUND'}")
print(f"✓ FAISS Index: {INDEX_PATH} - {'EXISTS' if INDEX_PATH.exists() else 'NOT FOUND'}")
print(f"✓ NPZ Embeddings: {NPZ_PATH} - {'EXISTS' if NPZ_PATH.exists() else 'NOT FOUND'}")

# Connect to MongoDB
print("\n" + "=" * 70)
print("CONNECTING TO DATABASE")
print("=" * 70)

if not MONGODB_URI:
    print("❌ Error: MONGODB_URI not found in .env file")
    exit(1)

try:
    client = MongoClient(MONGODB_URI)
    db = client.get_default_database()
    db.command('ping')
    print(f"✅ Connected to MongoDB")
except Exception as e:
    print(f"❌ Failed to connect: {e}")
    exit(1)

# Initialize recommendation service
print("\n" + "=" * 70)
print("INITIALIZING RECOMMENDATION SERVICE")
print("=" * 70)

try:
    # Try with FAISS first
    if INDEX_PATH.exists() and NPZ_PATH.exists():
        print("🚀 Initializing in HYBRID mode (FAISS + fallback)...")
        service = RecommendationService(
            model_path=str(MODEL_PATH),
            index_path=str(INDEX_PATH),
            npz_path=str(NPZ_PATH),
            device='cpu'  # Change to 'cuda' if you have GPU
        )
    else:
        print("🚀 Initializing in ON-THE-FLY mode (no FAISS)...")
        service = RecommendationService(
            model_path=str(MODEL_PATH),
            device='cpu'
        )
    
    print("✅ Service initialized successfully!")
    
    # Print stats
    stats = service.get_stats()
    print(f"\n📊 Service Stats:")
    print(f"   Mode: {stats['mode']}")
    print(f"   FAISS Enabled: {stats['faiss_enabled']}")
    print(f"   Indexed Products: {stats['indexed_products']}")
    print(f"   Device: {stats['device']}")
    
except Exception as e:
    print(f"❌ Failed to initialize service: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

# Test 1: Get similar products
print("\n" + "=" * 70)
print("TEST 1: GET SIMILAR PRODUCTS")
print("=" * 70)

# Use a known product ID from your database
test_product_id = "68dfcc7484cd07dea32e23b6"  # SWE RING BOXY TEE - BLACK

print(f"Finding products similar to: {test_product_id}")

try:
    options = {
        'price_tolerance': 0.5,
        'filter_gender': True,
        'filter_usage': True,
        'same_category_only': True,
        'brand_boost': 0.05,
        'min_similarity': 0.6
    }
    
    result = service.get_similar_products(
        db=db,
        product_id=test_product_id,
        limit=6,
        options=options
    )
    
    if 'error' in result:
        print(f"❌ Error: {result['error']}")
    else:
        target = result.get('targetProduct', {})
        print(f"\n✅ Target Product:")
        print(f"   Name: {target.get('name')}")
        print(f"   Price: {target.get('defaultPrice', 0):,} VND")
        print(f"   Gender: {target.get('gender')}")
        print(f"   Usage: {target.get('usage')}")
        
        recs = result.get('recommendations', [])
        print(f"\n✅ Found {len(recs)} similar products:")
        print(f"   Method: {result.get('method', 'unknown')}")
        
        for i, rec in enumerate(recs, 1):
            product = rec['product']
            similarity = rec['similarity']
            print(f"\n   {i}. {product['name']}")
            print(f"      Similarity: {similarity:.3f}")
            print(f"      Price: {product.get('defaultPrice', 0):,} VND")
            print(f"      Brand: {product.get('brand', 'N/A')}")
            print(f"      Gender: {product.get('gender', 'N/A')}")
            
except Exception as e:
    print(f"❌ Test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 2: Different filter options
print("\n" + "=" * 70)
print("TEST 2: DIFFERENT FILTER OPTIONS")
print("=" * 70)

print("Testing with looser constraints...")

try:
    loose_options = {
        'price_tolerance': 1.0,  # ±100% price range
        'filter_gender': False,  # Don't filter by gender
        'filter_usage': False,   # Don't filter by usage
        'same_category_only': False,  # Allow cross-category
        'brand_boost': 0.1,      # Stronger brand boost
        'min_similarity': 0.5    # Lower threshold
    }
    
    result = service.get_similar_products(
        db=db,
        product_id=test_product_id,
        limit=10,
        options=loose_options
    )
    
    if 'error' not in result:
        print(f"✅ Found {result['count']} products with loose constraints")
        print(f"   (vs {6} with strict constraints)")
    
except Exception as e:
    print(f"❌ Test failed: {e}")

# Test 3: Search by image URL
print("\n" + "=" * 70)
print("TEST 3: SEARCH BY IMAGE (if you have image URL)")
print("=" * 70)

# Get a product's image URL for testing
from utils.db_helper import get_product_by_id, get_first_image

try:
    test_product = get_product_by_id(db, test_product_id)
    if test_product:
        image_url = get_first_image(test_product)
        
        if image_url:
            print(f"Searching by image: {image_url[:50]}...")
            
            result = service.search_by_image(
                db=db,
                image_url=image_url,
                limit=5,
                options={'min_similarity': 0.6}
            )
            
            if 'error' not in result:
                print(f"\n✅ Found {result['count']} similar products by image")
                print(f"   Method: {result.get('method', 'unknown')}")
                
                for i, item in enumerate(result['results'][:3], 1):
                    product = item['product']
                    similarity = item['similarity']
                    print(f"   {i}. {product['name']} (similarity: {similarity:.3f})")
        else:
            print("⚠️  No image URL found for test product")
            
except Exception as e:
    print(f"❌ Test failed: {e}")

# Test 4: Performance test
print("\n" + "=" * 70)
print("TEST 4: PERFORMANCE TEST")
print("=" * 70)

import time

try:
    # Test multiple products
    test_ids = [
        "68dfcc7484cd07dea32e23b6",  # Shirt 1
        "68dfcd3984cd07dea32e23bb",  # Shirt 2
        "68e005f17d3c1abe691f508f",  # Pants
    ]
    
    times = []
    
    for product_id in test_ids:
        start = time.time()
        result = service.get_similar_products(db, product_id, limit=6)
        elapsed = time.time() - start
        times.append(elapsed)
        
        if 'error' not in result:
            print(f"✓ Product {product_id}: {elapsed:.2f}s ({result['count']} results)")
    
    if times:
        avg_time = sum(times) / len(times)
        print(f"\n📊 Average response time: {avg_time:.2f}s")
        
        if avg_time < 1.0:
            print("   🚀 EXCELLENT! (< 1 second)")
        elif avg_time < 3.0:
            print("   ✅ GOOD (1-3 seconds)")
        else:
            print("   ⚠️  SLOW (> 3 seconds) - Consider optimizing")
    
except Exception as e:
    print(f"❌ Performance test failed: {e}")

# Summary
print("\n" + "=" * 70)
print("TEST SUMMARY")
print("=" * 70)

print(f"""
Service Configuration:
  - Mode: {stats['mode']}
  - FAISS Enabled: {stats['faiss_enabled']}
  - Indexed Products: {stats['indexed_products']}
  - Device: {stats['device']}

Next Steps:
  1. If on-the-fly mode is slow, run emb.py to generate FAISS index
  2. Integrate with main.py API endpoints
  3. Test with frontend
  4. Monitor performance and adjust filters
  5. Collect user data for future collaborative filtering

💡 Tips:
  - FAISS mode: 50-100ms response time
  - On-the-fly mode: 2-5s response time
  - Adjust filter options based on your product catalog
  - Use price_tolerance and min_similarity to balance quality vs quantity
""")

print("=" * 70)
print("✅ ALL TESTS COMPLETED!")
print("=" * 70)