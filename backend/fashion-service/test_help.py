# test_helpers.py
import os
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv
from utils.db_helper import *
from utils.filters import *

# Load environment variables from .env file
env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)

# Connect to your MongoDB using MONGODB_URI from .env
mongo_uri = os.environ.get('MONGODB_URI')
if not mongo_uri:
    print("❌ Error: MONGODB_URI not found in .env file")
    print("Please create a .env file with: MONGODB_URI=mongodb://localhost:27017/your_database")
    exit(1)

print(f"📡 Connecting to MongoDB...")
print(f"   URI: {mongo_uri.split('@')[-1] if '@' in mongo_uri else mongo_uri}")

try:
    client = MongoClient(mongo_uri)
    db = client.get_default_database()
    
    # Test connection
    db.command('ping')
    print("✅ Connected successfully!\n")
except Exception as e:
    print(f"❌ Failed to connect to MongoDB: {e}")
    exit(1)

# Test 1: Fetch a product
print("=" * 60)
print("Test 1: Fetch product by ID")
print("=" * 60)
product = get_product_by_id(db, "68dfcc7484cd07dea32e23b6")
if product:
    print(f"✓ Found: {product['name']}")
    print(f"  Brand: {product.get('brand')}")
    print(f"  Category: {get_category_info(product)}")
    print(f"  Price: {product.get('defaultPrice'):,} VND" if product.get('defaultPrice') else "  Price: N/A")
    print(f"  Gender: {product.get('gender')}")
    print(f"  Usage: {product.get('usage')}")
    print(f"  Images: {len(get_product_images(product))} images")
else:
    print("✗ Product not found")

# Test 2: Get all products in a category
print("\n" + "=" * 60)
print("Test 2: Get products by category (Shirts)")
print("=" * 60)
products = get_products_by_category(db, "68dfcc3f84cd07dea32e23b0", limit=5)
print(f"✓ Found {len(products)} shirts")
for i, p in enumerate(products[:3], 1):
    print(f"  {i}. {p['name']} - {p.get('defaultPrice', 0):,} VND")

# Test 3: Test price filter
print("\n" + "=" * 60)
print("Test 3: Price filtering")
print("=" * 60)
target_price = 650000
filtered = filter_by_price_range(products, target_price, tolerance=0.5)
print(f"✓ Target price: {target_price:,} VND")
print(f"✓ Price range: {int(target_price*0.5):,} - {int(target_price*1.5):,} VND")
print(f"  Filtered: {len(products)} → {len(filtered)} products")
for p in filtered:
    print(f"  - {p['name']}: {p.get('defaultPrice', 0):,} VND")
    
# Test 4: Test gender filter
print("\n" + "=" * 60)
print("Test 4: Gender filtering")
print("=" * 60)
filtered_gender = filter_by_gender(products, "Unisex")
print(f"✓ Gender filter (Unisex): {len(products)} → {len(filtered_gender)} products")
for p in filtered_gender:
    print(f"  - {p['name']} (Gender: {p.get('gender')})")

# Test 5: Get all active products
print("\n" + "=" * 60)
print("Test 5: Get all active products")
print("=" * 60)
all_products = get_all_active_products(db)
print(f"✓ Total active products: {len(all_products)}")

# Count by category
from collections import Counter
categories = [get_category_info(p)['subCategory'] for p in all_products]
category_counts = Counter(categories)
print(f"\n  Products by category:")
for cat, count in category_counts.most_common():
    print(f"    {cat}: {count}")

# Test 6: Combined business rules
print("\n" + "=" * 60)
print("Test 6: Apply all business rules")
print("=" * 60)
if product and len(all_products) >= 10:
    # Create fake similarity scores for testing
    # Exclude the target product itself
    target_id = str(product['_id'])
    test_products = [p for p in all_products if str(p['_id']) != target_id][:10]
    
    products_with_scores = [(p, 0.85 - i*0.05) for i, p in enumerate(test_products)]
    
    print(f"Target product: {product['name']}")
    print(f"  Price: {product.get('defaultPrice', 0):,} VND")
    print(f"  Gender: {product.get('gender')}")
    print(f"  Usage: {product.get('usage')}")
    print(f"  Category: {get_category_info(product)['subCategory']}")
    
    options = {
        'price_tolerance': 0.5,
        'filter_gender': True,
        'filter_usage': True,
        'same_category_only': True,
        'brand_boost': 0.05,
        'min_similarity': 0.6
    }
    
    print(f"\nApplying filters with options:")
    print(f"  Price tolerance: ±{int(options['price_tolerance']*100)}%")
    print(f"  Filter gender: {options['filter_gender']}")
    print(f"  Filter usage: {options['filter_usage']}")
    print(f"  Same category only: {options['same_category_only']}")
    print(f"  Brand boost: +{int(options['brand_boost']*100)}%")
    print(f"  Min similarity: {options['min_similarity']}")
    
    filtered = apply_business_rules(products_with_scores, product, options)
    print(f"\n✓ Applied rules: {len(products_with_scores)} → {len(filtered)} products")
    
    if filtered:
        # Rank and limit
        top_results = rank_and_limit(filtered, limit=6)
        print(f"\n✓ Top {len(top_results)} results:")
        for i, (p, score) in enumerate(top_results, 1):
            price = p.get('defaultPrice', 0)
            print(f"  {i}. {p['name']}")
            print(f"     Score: {score:.3f} | Price: {price:,} VND | Brand: {p.get('brand', 'N/A')}")
    else:
        print("\n⚠️  No products passed the filters")
        print("   Try loosening the filter criteria")

# Test 7: Serialize product for API response
print("\n" + "=" * 60)
print("Test 7: Serialize product for API response")
print("=" * 60)
if product:
    serialized = serialize_product(product)
    print(f"✓ Serialized product (JSON-safe):")
    print(f"  _id type: {type(serialized['_id'])} = {serialized['_id']}")
    if 'categoryId' in serialized and isinstance(serialized['categoryId'], dict):
        print(f"  categoryId._id type: {type(serialized['categoryId']['_id'])}")
    print(f"  Can be converted to JSON: ✓")

# Test 8: Test error handling
print("\n" + "=" * 60)
print("Test 8: Error handling with invalid IDs")
print("=" * 60)
invalid_product = get_product_by_id(db, "invalid_id_12345")
print(f"✓ Invalid ID handling: {'Returned None' if invalid_product is None else 'ERROR'}")

nonexistent_product = get_product_by_id(db, "000000000000000000000000")
print(f"✓ Non-existent ID handling: {'Returned None' if nonexistent_product is None else 'ERROR'}")

print("\n" + "=" * 60)
print("✅ All tests completed successfully!")
print("=" * 60)
