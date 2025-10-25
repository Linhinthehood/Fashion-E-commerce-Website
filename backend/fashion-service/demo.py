
import json
import os
import sys
from pathlib import Path

import requests
from pymongo import MongoClient

try:
    from dotenv import load_dotenv
    # Load .env beside this script if present
    load_dotenv(dotenv_path=Path(__file__).with_name('.env'))
except Exception:
    pass


def resolve_base_url() -> str:
    url = os.getenv('FASHION_SERVICE_URL')
    if url:
        return url.rstrip('/')
    port = os.getenv('PORT', '3002')
    return f"http://localhost:{port}"


def resolve_export_path() -> Path:
    p = os.getenv('FASHION_EXPORT_PATH')
    if p:
        return Path(p)
    # Default to repo path: backend/product-service/exports/database-export.json
    return Path(__file__).resolve().parents[2] / 'product-service' / 'exports' / 'database-export.json'


def load_products(export_path: Path):
    if not export_path.exists():
        print(f"[ERROR] Export not found: {export_path}")
        sys.exit(2)
    with open(export_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    prods = data.get('products', [])
    # Ensure consistent shape: {_id, name, images: []}
    items = []
    for p in prods:
        pid = str(p.get('_id'))
        nm = p.get('name') or '(no name)'
        imgs = p.get('images') or []
        items.append({'_id': pid, 'name': nm, 'images': imgs})
    return items


def connect_mongo():
    uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    db_name = os.getenv('MONGODB_DATABASE')
    try:
        client = MongoClient(uri)
        # Derive db name from URI if not provided
        if not db_name:
            try:
                db_name = client.get_default_database().name
            except Exception:
                db_name = 'fashion_ecommerce_products'
        db = client[db_name]
        # quick ping
        client.admin.command('ping')
        return db.products
    except Exception as e:
        print(f"[WARN] Mongo connection failed: {e}")
        return None


def search_products_mongo(col, term: str | None, limit: int = 50):
    query = {}
    if term:
        query = { 'name': { '$regex': term, '$options': 'i' } }
    cur = col.find(query, { '_id': 1, 'name': 1, 'images': 1 }).limit(limit)
    items = []
    for d in cur:
        pid = str(d.get('_id'))
        nm = d.get('name') or '(no name)'
        imgs = d.get('images') or []
        items.append({'_id': pid, 'name': nm, 'images': imgs})
    return items


def choose_product_list(products, default_name: str | None = None):
    def search(term: str):
        t = term.lower()
        return [p for p in products if t in p['name'].lower()]

    if default_name:
        matches = search(default_name)
        if len(matches) == 1:
            return matches[0]

    print("\nType part of a product name to search. Press Enter to list all.")
    term = default_name or input("Search term (optional): ").strip()
    lst = search(term) if term else products

    if not lst:
        print("No matches. Showing all products.")
        lst = products

    # Show up to 50 options
    print("\nSelect a product:")
    for i, p in enumerate(lst[:50], 1):
        print(f" {i:2d}. {p['name']}  ({p['_id']})")

    while True:
        choice = input("Enter number: ").strip()
        if not choice.isdigit():
            print("Please enter a valid number.")
            continue
        idx = int(choice)
        if 1 <= idx <= min(50, len(lst)):
            return lst[idx - 1]
        print("Out of range. Try again.")


def choose_product_mongo(col, default_name: str | None = None):
    print("\nType part of a product name to search (Mongo). Press Enter to list some.")
    term = default_name or input("Search term (optional): ").strip()
    lst = search_products_mongo(col, term, limit=50)
    if not lst:
        print("No matches from Mongo. Try a different term or ensure data exists.")
        return None
    print("\nSelect a product:")
    for i, p in enumerate(lst, 1):
        print(f" {i:2d}. {p['name']}  ({p['_id']})")
    while True:
        choice = input("Enter number: ").strip()
        if not choice.isdigit():
            print("Please enter a valid number.")
            continue
        idx = int(choice)
        if 1 <= idx <= len(lst):
            return lst[idx - 1]
        print("Out of range. Try again.")


def show_list(items, title: str):
    print(f"\n== {title} ==")
    if not items:
        print("(no items)")
        return
    for i, p in enumerate(items, 1):
        name = p.get('name')
        imgs = p.get('images') or []
        img = imgs[0] if imgs else 'N/A'
        print(f" {i:2d}. {name} -> {img}")


def main():
    base = resolve_base_url()
    export_path = resolve_export_path()
    k = int(os.getenv('DEMO_K', '6'))
    default_name = os.getenv('DEMO_PRODUCT_NAME')

    print("Fashion Service Demo")
    print("=" * 28)
    print(f"Target: {base}")
    print(f"Export: {export_path}")

    # Health
    try:
        h = requests.get(f"{base}/health", timeout=5)
        print("Health:", h.status_code, h.json())
    except Exception as e:
        print(f"[ERROR] Cannot reach service at {base}: {e}")
        sys.exit(1)

    # Prefer Mongo for product lookup
    col = connect_mongo()
    if col is not None:
        chosen = choose_product_mongo(col, default_name)
        if not chosen:
            print("Falling back to export...")
    else:
        chosen = None

    if col is None or not chosen:
        products = load_products(export_path)
        if not products:
            print("[ERROR] No products found in export.")
            sys.exit(1)
        chosen = choose_product_list(products, default_name)
    print(f"\nChosen: {chosen['name']}  ({chosen['_id']})")
    first_img = chosen['images'][0] if chosen.get('images') else None
    if first_img:
        print(f"Image: {first_img}")

    print("\nChoose a test mode:")
    print("  1) Similar by product (FAISS neighbors)")
    print("  2) Search by text (uses .pt)")
    print("  3) Search by image URL (uses .pt)")
    print("  4) Click + Personalized feed (track then recommend)")
    mode = input("Enter 1/2/3/4 [1]: ").strip() or "1"

    try:
        if mode == "1":
            # Product-based neighbors
            r = requests.post(
                f"{base}/api/v1/recommendations/product/{chosen['_id']}",
                params={'k': k},
                timeout=30,
            )
            data = r.json().get('data', []) if r.ok else []
            show_list(data, f"Visually similar (k={k})")
        elif mode == "2":
            # Text query using FashionCLIP
            q = input("Enter search text (e.g., 'áo thun trắng'): ").strip()
            if not q:
                print("No query entered; aborting.")
                return
            r = requests.post(
                f"{base}/api/v1/search/text",
                params={'q': q, 'k': k},
                timeout=40,
            )
            data = r.json().get('data', []) if r.ok else []
            show_list(data, f"Text search results for '{q}' (k={k})")
        elif mode == "3":
            # Image URL query using FashionCLIP
            prompt = "Paste image URL (Enter to use chosen product's first image): "
            img_url = input(prompt).strip() or first_img
            if not img_url:
                print("No image URL available; aborting.")
                return
            r = requests.post(
                f"{base}/api/v1/search/image",
                params={'imageUrl': img_url, 'k': k},
                timeout=60,
            )
            data = r.json().get('data', []) if r.ok else []
            show_list(data, f"Image search results (k={k})")
        elif mode == "4":
            # Simulate user click/purchase, then fetch personalized recommendations
            user = os.getenv('DEMO_USER_ID', 'demoUser')
            # Track interaction
            ti = requests.post(f"{base}/api/v1/track/interaction", data={
                'user_id': user,
                'product_id': chosen['_id'],
                'interaction_type': 'click'
            }, timeout=20)
            print("Track status:", ti.status_code, ti.json())
            # Get personalized recommendations
            rec = requests.post(f"{base}/api/v1/recommendations/user/{user}", params={'k': k}, timeout=30)
            data = rec.json().get('data', []) if rec.ok else []
            show_list(data, f"Personalized recommendations for {user} (k={k})")
        else:
            print("Unknown mode. Please choose 1, 2, or 3.")
    except Exception as e:
        print(f"[ERROR] Request failed: {e}")


if __name__ == '__main__':
    main()
