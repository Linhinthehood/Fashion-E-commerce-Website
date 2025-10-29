#!/usr/bin/env python3
"""
Interactive Fashion Customer Demo (export-backed)
This demo uses your live MongoDB when available, and falls back to the
export JSON at `backend/product-service/exports/database-export.json`.
It is read-only: it will only call the fashion service HTTP endpoints and
will not modify your database files directly.
"""

import os
import json
import random
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from local .env if present
base = Path(__file__).resolve().parent
env_path = base / '.env'
if not env_path.exists():
    fallback = base.parent / 'product-service' / '.env'
    if fallback.exists():
        env_path = fallback
load_dotenv(dotenv_path=env_path)

# Config
# Read MONGODB_URI from the loaded .env (uses same env pattern as main.py).
# Fall back to localhost if not set to keep demo runnable.
MONGODB_URI = os.getenv('MONGODB_URI')
if not MONGODB_URI:
    MONGODB_URI = 'mongodb://localhost:27017'
PORT = int(os.getenv('PORT', '8000'))
FASHION_SERVICE_URL = f'http://localhost:{PORT}'
MONGODB_DATABASE = os.getenv('MONGODB_DATABASE', 'products')

# Customer session id (non-persistent)
CUSTOMER_ID = os.getenv('DEMO_CUSTOMER_ID', f'customer_demo_{random.randint(1000,9999)}')

# Optional pymongo import
try:
    from pymongo import MongoClient
    PYMONGO = True
except Exception:
    MongoClient = None
    PYMONGO = False

# Try to connect to MongoDB (read-only). If unavailable, we'll load export.json

def connect_database():
    if not PYMONGO:
        return None
    try:
        client = MongoClient(MONGODB_URI)
        db = client[MONGODB_DATABASE]
        client.admin.command('ping')
        print(f"✅ Connected to MongoDB database: {MONGODB_DATABASE}")
        return db
    except Exception as e:
        print(f"⚠️  Could not connect to MongoDB: {e}")
        return None


def load_export_products():
    # primary expected export path
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
                print(f"✅ Loaded {len(products)} products from export: {p}")
                return products
            except Exception as e:
                print(f"⚠️  Failed to load export file {p}: {e}")
    print("⚠️  No export file found; interactive demo needs either MongoDB or the export JSON.")
    return []


# Product browsing that works with either db or export list
def browse_products(db, products_export, category=None, limit=10):
    if db is not None:
        try:
            products_collection = db.products
            pipeline = []
            if category:
                pipeline.append({"$match": {"category": {"$regex": category, "$options": "i"}}})
            pipeline.extend([
                {"$sample": {"size": limit}},
                {"$project": {"name": 1, "brand": 1, "category": 1, "defaultPrice": 1, "images": {"$slice": ["$images", 1]}}}
            ])
            products = list(products_collection.aggregate(pipeline))
            return products
        except Exception as e:
            print(f"⚠️  DB browse failed: {e}")
            # fallback to export
    # use export list
    if not products_export:
        return []
    sample = random.sample(products_export, min(limit, len(products_export)))
    return sample


def display_products(products, total_available=None):
    if not products:
        print("No products to show")
        return
    def _get_category(p):
        # Several shapes may appear depending on source (export JSON, DB, or service projection)
        # 1) p['category'] as a simple string
        # 2) p['categoryId'] as a dict with articleType/subCategory/masterCategory
        # 3) p may contain nested keys returned by service (try common variants)
        if not p:
            return 'Unknown'
        if isinstance(p.get('category'), str) and p.get('category').strip():
            return p.get('category')
        cid = p.get('categoryId') or p.get('category_id') or p.get('categoryId_str')
        if isinstance(cid, dict):
            return cid.get('articleType') or cid.get('subCategory') or cid.get('masterCategory') or 'Unknown'
        # sometimes the service projects category into a nested path e.g. {'category': {'articleType': '...'}}
        catobj = p.get('category')
        if isinstance(catobj, dict):
            return catobj.get('articleType') or catobj.get('subCategory') or 'Unknown'
        return str(cid) if cid else 'Unknown'

    total = getattr(products, '__len__', None) and len(products)
    print('\nAvailable products:')
    print('-'*80)
    for i, p in enumerate(products, 1):
        name = p.get('name') or p.get('title') or 'Unknown'
        brand = p.get('brand', 'Unknown')
        price = p.get('defaultPrice', 0) or p.get('price', 0)
        cat = _get_category(p)
        pid = p.get('_id') or p.get('id') or p.get('product_id') or 'unknown'
        # Ensure short representation for displayed id
        pid_str = str(pid)
        print(f"{i:2d}. {name[:50]:50} | {brand:15} | {price:8,} VND | {cat} | id={pid_str[:12]}")
    if total_available is not None:
        print('-'*80)
        print(f"Showing {len(products)} of {total_available} products (sample or page)")


def track_interaction(product_id, interaction_type):
    try:
        resp = requests.post(
            f"{FASHION_SERVICE_URL}/api/v1/track/interaction",
            params={'user_id': CUSTOMER_ID, 'product_id': product_id, 'interaction_type': interaction_type},
            timeout=10
        )
        if resp.status_code == 200:
            print(f"✅ Tracked {interaction_type} for {product_id}")
            return True
        else:
            print(f"⚠️  Track endpoint returned {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        print(f"❌ Track error: {e}")
        return False


def get_similar(product_id):
    try:
        resp = requests.post(f"{FASHION_SERVICE_URL}/api/v1/recommendations/product/{product_id}", params={'k': 6}, timeout=20)
        if resp.status_code == 200:
            data = resp.json()
            items = data.get('data', [])
            print(f"✅ Service returned {len(items)} similar items")
            return items
        else:
            print(f"⚠️  Similar endpoint returned {resp.status_code}: {resp.text}")
            return []
    except Exception as e:
        print(f"❌ Similar request error: {e}")
        return []


def get_personalized():
    try:
        resp = requests.post(f"{FASHION_SERVICE_URL}/api/v1/recommendations/user/{CUSTOMER_ID}", params={'k': 6}, timeout=20)
        if resp.status_code == 200:
            data = resp.json()
            items = data.get('data', [])
            print(f"✅ Service returned {len(items)} personalized items")
            return items
        else:
            print(f"⚠️  Personalized endpoint returned {resp.status_code}: {resp.text}")
            return []
    except Exception as e:
        print(f"❌ Personalized request error: {e}")
        return []


def interactive():
    print('Interactive Fashion Demo (read-only)')
    print('Service:', FASHION_SERVICE_URL)
    db = connect_database()
    products_export = []
    if db is None:
        products_export = load_export_products()
        if not products_export:
            print('No data source available. Exiting.')
            return
        else:
            print(f"ℹ️  Export dataset contains {len(products_export)} products (used as read-only fallback).")

    # main loop
    while True:
        print('\n' + '='*50)
        print('1) Browse products')
        print('2) Search (calls /api/v1/search/text)')
        print('3) Personalized recommendations (calls /api/v1/recommendations/user)')
        print('4) Exit')
        choice = input('Choose an action (1-4): ').strip()
        if choice == '1':
            cat = input('Optional category filter (press Enter to skip): ').strip() or None
            # Ask how many to show (default 8). Allow 'all' to show all export products when using fallback.
            limit_in = input('How many products to display? (default 8, or type all): ').strip().lower()
            if limit_in == 'all':
                limit = len(products_export) if products_export else 100
            else:
                try:
                    limit = int(limit_in) if limit_in else 8
                except Exception:
                    limit = 8
            products = browse_products(db, products_export, cat, limit=limit)
            display_products(products)
            if products:
                sel = input('Select number to interact with, or Enter to go back: ').strip()
                if sel.isdigit():
                    idx = int(sel)-1
                    if 0 <= idx < len(products):
                        prod = products[idx]
                        pid = prod.get('_id')
                        # If export product uses ObjectId-like, keep as string
                        pid = str(pid)
                        print(f"Selected {prod.get('name')}")
                        action = input('Action: (v)iew, (p)urchase, (l)ike, (s)imilar: ').strip().lower()
                        if action in ('v','view'):
                            track_interaction(pid, 'view')
                        elif action in ('p','purchase'):
                            track_interaction(pid, 'purchase')
                            # show similar
                            sims = get_similar(pid)
                            display_products(sims, total_available=len(products_export) if products_export else None)
                        elif action in ('l','like'):
                            track_interaction(pid, 'like')
                        elif action in ('s','similar'):
                            sims = get_similar(pid)
                            display_products(sims, total_available=len(products_export) if products_export else None)
        elif choice == '2':
            q = input('Enter natural-language query: ').strip()
            if not q:
                continue
            try:
                resp = requests.post(f"{FASHION_SERVICE_URL}/api/v1/search/text", params={'q': q, 'k': 6}, timeout=30)
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get('data', [])
                    display_products(results, total_available=len(products_export) if products_export else None)
                    # allow interactions similar to browse
                    if results:
                        sel = input('Select number to interact with, or Enter to continue: ').strip()
                        if sel.isdigit():
                            idx = int(sel)-1
                            if 0 <= idx < len(results):
                                pid = str(results[idx].get('_id'))
                                track_interaction(pid, 'search')
                else:
                    print(f"Search returned {resp.status_code}: {resp.text}")
            except Exception as e:
                print(f"Search error: {e}")
        elif choice == '3':
            items = get_personalized()
            display_products(items, total_available=len(products_export) if products_export else None)
        elif choice == '4':
            print('Goodbye — demo session ended.')
            break
        else:
            print('Invalid choice')


if __name__ == '__main__':
    interactive()
