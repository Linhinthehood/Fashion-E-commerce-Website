#!/usr/bin/env python3
"""
Build image-embedding index from product export JSON (with Cloudinary URLs)

Inputs:
  --export <path>   Path to database export JSON (e.g., backend/product-service/exports/database-export.json)
  --out-dir <path>  Output directory for embeddings and index (default: ../data/embeddings)

Outputs:
  <out-dir>/gallery_embeddings.npz  # contains: vecs (float32), product_ids (object), image_urls (object)
  <out-dir>/gallery_ip.index        # FAISS inner-product index

Requirements: torch, transformers, pillow, requests, faiss-cpu, numpy
"""

import argparse
import json
import os
import sys
from pathlib import Path
from io import BytesIO

import numpy as np
import requests
from PIL import Image

import torch
from transformers import CLIPModel, CLIPProcessor
import faiss


def load_products(export_path: Path):
    with open(export_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    products = data.get('products', [])
    items = []
    for p in products:
        pid = str(p.get('_id'))
        images = p.get('images') or []
        if images:
            items.append((pid, images[0]))  # use the first image as representative
    return items


def download_image(url: str) -> Image.Image:
    resp = requests.get(url, timeout=20)
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert('RGB')


@torch.no_grad()
def embed_images(items, model, processor, device, batch_size=8):
    vecs = []
    product_ids = []
    image_urls = []

    batch_imgs = []
    batch_pids = []
    batch_urls = []

    for pid, url in items:
        try:
            img = download_image(url)
            batch_imgs.append(img)
            batch_pids.append(pid)
            batch_urls.append(url)
        except Exception as e:
            print(f"[WARN] Skip {pid} ({url}): {e}")
            continue

        if len(batch_imgs) >= batch_size:
            enc = processor(text=[""] * len(batch_imgs), images=batch_imgs, return_tensors="pt", padding=True)
            pixel_values = enc['pixel_values'].to(device)
            outputs = model.get_image_features(pixel_values=pixel_values)
            feats = outputs.cpu().numpy().astype('float32')
            # normalize for cosine / inner product
            norms = np.linalg.norm(feats, axis=1, keepdims=True) + 1e-8
            feats = feats / norms
            vecs.append(feats)
            product_ids.extend(batch_pids)
            image_urls.extend(batch_urls)
            batch_imgs, batch_pids, batch_urls = [], [], []

    # flush remaining
    if batch_imgs:
        enc = processor(text=[""] * len(batch_imgs), images=batch_imgs, return_tensors="pt", padding=True)
        pixel_values = enc['pixel_values'].to(device)
        outputs = model.get_image_features(pixel_values=pixel_values)
        feats = outputs.cpu().numpy().astype('float32')
        norms = np.linalg.norm(feats, axis=1, keepdims=True) + 1e-8
        feats = feats / norms
        vecs.append(feats)
        product_ids.extend(batch_pids)
        image_urls.extend(batch_urls)

    if not vecs:
        raise RuntimeError("No embeddings were generated. Check image URLs/network.")

    return np.vstack(vecs), np.array(product_ids, dtype=object), np.array(image_urls, dtype=object)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--export', default=None, help='Path to database-export.json (defaults to repo export)')
    ap.add_argument('--out-dir', default=str(Path(__file__).resolve().parents[1] / 'data' / 'embeddings'))
    ap.add_argument('--model', default='openai/clip-vit-base-patch32')
    ap.add_argument('--device', default='cuda' if torch.cuda.is_available() else 'cpu')
    ap.add_argument('--batch-size', type=int, default=8)
    args = ap.parse_args()

    # Resolve export path: CLI arg > env var > default repo path
    if args.export:
        export_path = Path(args.export)
    else:
        env_path = os.getenv('FASHION_EXPORT_PATH')
        if env_path:
            export_path = Path(env_path)
        else:
            export_path = Path(__file__).resolve().parents[2] / 'product-service' / 'exports' / 'database-export.json'

    if not export_path.exists():
        print(f"[ERROR] Export file not found: {export_path}")
        print('  - Pass --export <path> or set FASHION_EXPORT_PATH')
        print('  - Example (from scripts dir): --export ..\\..\\product-service\\exports\\database-export.json')
        sys.exit(2)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    npz_path = out_dir / 'gallery_embeddings.npz'
    index_path = out_dir / 'gallery_ip.index'

    print(f"[INFO] Loading products from: {export_path}")
    items = load_products(export_path)
    print(f"[INFO] Found {len(items)} products with images")

    print(f"[INFO] Loading model: {args.model}")
    processor = CLIPProcessor.from_pretrained(args.model)
    model = CLIPModel.from_pretrained(args.model).to(args.device)
    model.eval()

    print("[INFO] Embedding images...")
    vecs, product_ids, image_urls = embed_images(items, model, processor, args.device, args.batch_size)
    print(f"[OK] Created embeddings: {vecs.shape}")

    print(f"[INFO] Saving NPZ to: {npz_path}")
    np.savez(npz_path, vecs=vecs, product_ids=product_ids, image_urls=image_urls)

    print(f"[INFO] Building FAISS index (Inner Product)")
    d = vecs.shape[1]
    index = faiss.IndexFlatIP(d)
    index.add(vecs)
    faiss.write_index(index, str(index_path))
    print(f"[OK] Saved index to: {index_path}")

    print("[DONE] Embedding pipeline completed.")


if __name__ == '__main__':
    main()
