#!/usr/bin/env python3
"""
Simple Fashion Product Browser & Similarity Demo
Browse products and get similar recommendations via API calls
"""

import os
import json
import random
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment
base = Path(__file__).resolve().parent
env_path = base / '.env'
if not env_path.exists():
    env_path = base.parent / 'product-service' / '.env'
load_dotenv(dotenv_path=env_path)

# Config
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
PORT = int(os.getenv('PORT', '8000'))
FASHION_SERVICE_URL = f'http://localhost:{PORT}'
MONGODB_DATABASE = os.getenv('MONGODB_DATABASE', 'products')

# Try pymongo
try:
    from pymongo import MongoClient
    PYMONGO = True
except Exception:
    PYMONGO = False

def connect_database():
    """Connect to MongoDB"""
    if not PYMONGO:
        return None
    try:
        client = MongoClient(MONGODB_URI)
        db = client[MONGODB_DATABASE]
        client.admin.command('ping')
        print(f"✅ Connected to MongoDB: {MONGODB_DATABASE}")
        return db
    except Exception as e:
        print(f"⚠️  MongoDB connection failed: {e}")
        return None

def load_export_products():
    """Load products from export JSON file"""
    paths = [
        base.parent / 'product-service' / 'exports' / 'database-export.json',
        Path(__file__).resolve().parents[2] / 'backend' / 'product-service' / 'exports' / 'database-export.json'
    ]
    for p in paths:
        if p.exists():
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                products = data.get('products', [])
                print(f"✅ Loaded {len(products)} products from export")
                return products
            except Exception as e:
                print(f"⚠️  Failed to load {p}: {e}")
    return []

def browse_products(db, products_export, category=None, limit=10):
    """Browse products from DB or export"""
    if db is not None:
        try:
            pipeline = []
            if category:
                pipeline.append({"$match": {"category": {"$regex": category, "$options": "i"}}})
            pipeline.extend([
                {"$sample": {"size": limit}},
                {"$project": {"name": 1, "brand": 1, "category": 1, "defaultPrice": 1}}
            ])
            return list(db.products.aggregate(pipeline))
        except Exception as e:
            print(f"⚠️  DB browse failed: {e}")
    
    # Use export
    if products_export:
        return random.sample(products_export, min(limit, len(products_export)))
    return []

def display_products(products):
    """Display product list"""
    if not products:
        print("No products to show")
        return
    
    print('\nProducts:')
    print('-' * 100)
    for i, p in enumerate(products, 1):
        name = (p.get('name') or 'Unknown')[:50]
        brand = (p.get('brand') or 'Unknown')[:15]
        price = p.get('defaultPrice', 0) or 0
        pid = str(p.get('_id', 'unknown'))[:12]
        print(f"{i:2d}. {name:50} | {brand:15} | {price:10,} VND | id={pid}")
    print('-' * 100)

def get_similar_products(product_id):
    """Call API to get similar products"""
    try:
        resp = requests.post(
            f"{FASHION_SERVICE_URL}/api/v1/recommendations/product/{product_id}",
            params={'k': 6},
            timeout=20
        )
        if resp.status_code == 200:
            data = resp.json()
            items = data.get('data', [])
            print(f"✅ Found {len(items)} similar products")
            return items
        else:
            print(f"⚠️  API returned {resp.status_code}: {resp.text}")
            return []
    except Exception as e:
        print(f"❌ API error: {e}")
        return []

def interactive():
    """Main interactive loop"""
    print('Fashion Product Browser & Similarity Demo')
    print(f'Service: {FASHION_SERVICE_URL}')
    print()
    
    # Connect to data source
    db = connect_database()
    products_export = []
    if db is None:
        products_export = load_export_products()
        if not products_export:
            print('❌ No data source available')
            return
    
    while True:
        print('\n' + '=' * 50)
        print('1) Browse products')
        print('2) Get similar products')
        print('3) Exit')
        choice = input('Choose (1-3): ').strip()
        
        if choice == '1':
            # Browse products
            cat = input('Filter by category (Enter to skip): ').strip() or None
            limit_in = input('How many? (default 10): ').strip()
            
            try:
                limit = int(limit_in) if limit_in else 10
            except:
                limit = 10
            
            products = browse_products(db, products_export, cat, limit)
            display_products(products)
            
            if products:
                sel = input('\nSelect number to see similar products (Enter to skip): ').strip()
                if sel.isdigit():
                    idx = int(sel) - 1
                    if 0 <= idx < len(products):
                        prod = products[idx]
                        pid = str(prod.get('_id'))
                        print(f"\n📦 Selected: {prod.get('name')}")
                        print(f"🔍 Finding similar products...")
                        
                        similar = get_similar_products(pid)
                        if similar:
                            display_products(similar)
        
        elif choice == '2':
            # Direct product ID lookup
            pid = input('Enter product ID: ').strip()
            if pid:
                print(f"🔍 Finding similar products for: {pid}")
                similar = get_similar_products(pid)
                if similar:
                    display_products(similar)
        
        elif choice == '3':
            print('Goodbye!')
            break
        
        else:
            print('Invalid choice')

if __name__ == '__main__':
    interactive()