#!/usr/bin/env python3
"""
Benchmark and smoke-test for FashionCLIP checkpoint.

- Loads model using models.similarity.load_model
- Embeds a small sample of product names (text) and product images (if available)
- Builds a FAISS index on image embeddings and measures k-NN search latency
- Reports average and p95 latencies and throughput

Usage (from repo root):
python backend\fashion-service\scripts\benchmark_model.py --export ..\..\product-service\exports\database-export.json --samples 50 --k 6

Requirements:
- torch, transformers, pillow, numpy, faiss (faiss-cpu), requests

This script attempts to be robust when some deps or images are missing.
"""

import argparse
import time
import sys
from pathlib import Path
import json
import random
import statistics

# Ensure service package imports work when running from repo root
THIS = Path(__file__).resolve()
SERVICE_ROOT = THIS.parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

import numpy as np
try:
    import faiss
except Exception:
    faiss = None

import torch

from models.similarity import load_model, embed_text, embed_one_image
from config.config import config
from config.config import resolve_image_path

try:
    import requests
except Exception:
    requests = None

try:
    import psutil
except Exception:
    psutil = None


def load_export(export_path: Path):
    with open(export_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('products', [])


def sample_products(products, n):
    if len(products) <= n:
        return products
    return random.sample(products, n)


def measure_text_embeddings(model, processor, cfg, device, texts):
    latencies = []
    embeddings = []
    for t in texts:
        start = time.perf_counter()
        emb = embed_text(model, processor, t, device, cfg)
        end = time.perf_counter()
        if emb is None:
            continue
        latencies.append((end-start)*1000)
        embeddings.append(emb.squeeze())
    return embeddings, latencies


def measure_image_embeddings(model, processor, cfg, device, image_paths):
    latencies = []
    embeddings = []
    for p in image_paths:
        try:
            start = time.perf_counter()
            emb = embed_one_image(model, processor, p, device, cfg)
            end = time.perf_counter()
        except Exception as e:
            print(f"  [WARN] embedding failed for {p}: {e}")
            continue
        if emb is None:
            continue
        latencies.append((end-start)*1000)
        embeddings.append(emb.squeeze())
    return embeddings, latencies


def build_faiss_index(vecs: np.ndarray):
    d = vecs.shape[1]
    if faiss is None:
        raise RuntimeError('faiss not installed')
    index = faiss.IndexFlatIP(d)
    index.add(vecs)
    return index


def measure_search_latency(index, queries: np.ndarray, k=6, repeat=5):
    times = []
    for _ in range(repeat):
        start = time.perf_counter()
        sims, idxs = index.search(queries, k)
        end = time.perf_counter()
        times.append((end-start)*1000)
    return times


def mem_info():
    if psutil is None:
        return None
    p = psutil.Process()
    return p.memory_info().rss / (1024*1024)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--checkpoint', default=str(config.checkpoint_path))
    ap.add_argument('--export', default=str(SERVICE_ROOT.parent / 'product-service' / 'exports' / 'database-export.json'))
    ap.add_argument('--samples', type=int, default=50)
    ap.add_argument('--k', type=int, default=6)
    ap.add_argument('--device', default=None, help='cpu or cuda (auto detects if not set)')
    args = ap.parse_args()

    device = torch.device(args.device if args.device else ('cuda' if torch.cuda.is_available() else 'cpu'))
    print(f"Using device: {device}")
    print(f"Checkpoint: {args.checkpoint}")

    # Load model
    try:
        model, processor, cfg = load_model(args.checkpoint, device)
    except Exception as e:
        print(f"Failed to load model: {e}")
        return
    print("Model loaded")

    # Load export
    export_path = Path(args.export)
    if not export_path.exists():
        print(f"Export not found: {export_path}")
        products = []
    else:
        products = load_export(export_path)
    print(f"Products in export: {len(products)}")

    samples = sample_products(products, args.samples)

    # Prepare text queries (use product names)
    texts = [p.get('name','') for p in samples if p.get('name')]

    # Prepare image paths (try resolve_image_path for first available image)
    image_paths = []
    for p in samples:
        imgs = p.get('images') or []
        if not imgs:
            continue
        src = imgs[0]
        # If URL and requests available, download to temp file; otherwise try to resolve local file
        if isinstance(src, str) and src.startswith('http') and requests is not None:
            # download to service tmp
            try:
                r = requests.get(src, timeout=10)
                if r.status_code == 200:
                    tmp_dir = SERVICE_ROOT / 'tmp_bench'
                    tmp_dir.mkdir(exist_ok=True)
                    fn = tmp_dir / (p.get('_id','img') + '_' + Path(src).name)
                    with open(fn, 'wb') as f:
                        f.write(r.content)
                    image_paths.append(str(fn))
            except Exception as e:
                # skip
                continue
        else:
            # try resolve path
            try:
                resolved = resolve_image_path(src)
                image_paths.append(resolved)
            except Exception:
                continue

    print(f"Prepared {len(texts)} text queries and {len(image_paths)} image paths for embedding")

    # Measure text embeddings
    text_embs, text_times = measure_text_embeddings(model, processor, cfg, device, texts)
    if text_times:
        print(f"Text embed: count={len(text_times)} avg={statistics.mean(text_times):.2f}ms p95={np.percentile(text_times,95):.2f}ms")
    else:
        print("No text embeddings measured")

    # Measure image embeddings
    img_embs, img_times = measure_image_embeddings(model, processor, cfg, device, image_paths)
    if img_times:
        print(f"Image embed: count={len(img_times)} avg={statistics.mean(img_times):.2f}ms p95={np.percentile(img_times,95):.2f}ms")
    else:
        print("No image embeddings measured")

    # Build FAISS and measure search if we have image embeddings
    if img_embs and faiss is not None:
        vecs = np.stack(img_embs)
        index = build_faiss_index(vecs.astype('float32'))
        # use first min(10, len(vecs)) as queries
        q = vecs[:min(10, vecs.shape[0])].astype('float32')
        search_times = measure_search_latency(index, q, k=args.k, repeat=5)
        print(f"FAISS search: repeat=5 avg={statistics.mean(search_times):.2f}ms p95={np.percentile(search_times,95):.2f}ms")
    elif img_embs and faiss is None:
        print("FAISS not installed; skipping search benchmarking")

    # Memory info
    mem = mem_info()
    if mem is not None:
        print(f"RSS memory: {mem:.1f} MB")

    print("Benchmark complete")


if __name__ == '__main__':
    main()
