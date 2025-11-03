"""
Generate embeddings for all products in the database.

This script:
1. Connects to Product Service API to fetch all active products
2. Downloads product images and generates embeddings using FashionCLIP
3. Saves embeddings to NPZ file with metadata (URLs, IDs, names)
4. Builds FAISS index for fast similarity search
5. Supports resume/incremental updates (skip already processed products)
6. Shows progress bar and handles errors gracefully

Usage:
    python generate_embeddings.py [--output models/cloud_gallery_embeddings.npz] [--checkpoint models/fashion_clip_best.pt]
"""

import os
import sys
import argparse
import numpy as np
import torch
import faiss
import requests
from pathlib import Path
from PIL import Image
from io import BytesIO
from typing import List, Dict, Optional, Tuple
from tqdm import tqdm
import logging

# Enable AVIF support
try:
    import pillow_avif
except ImportError:
    pass  # AVIF support not available, will skip AVIF images

# Add parent directory to path to import models
sys.path.insert(0, str(Path(__file__).resolve().parent))

from models.FashionCLIP import FashionCLIP
from transformers import CLIPProcessor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class EmbeddingGenerator:
    """Generate embeddings for product images using FashionCLIP."""
    
    def __init__(
        self,
        checkpoint_path: str,
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
        batch_size: int = 32
    ):
        """
        Initialize the embedding generator.
        
        Args:
            checkpoint_path: Path to FashionCLIP checkpoint
            device: Device to run model on ('cpu' or 'cuda')
            batch_size: Number of images to process in parallel
        """
        self.device = torch.device(device)
        self.batch_size = batch_size
        
        logger.info(f"Loading model from: {checkpoint_path}")
        logger.info(f"Device: {self.device}")
        
        # Load model
        self.model, self.processor, self.config = self._load_model(checkpoint_path)
        self.model.eval()
        
        logger.info("✓ Model loaded successfully")
    
    def _load_model(self, checkpoint_path: str) -> Tuple:
        """Load FashionCLIP model from checkpoint."""
        # Load checkpoint
        ckpt = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
        config = ckpt.get("config", {})
        
        model_name = config.get("model_name", "openai/clip-vit-base-patch32")
        embedding_dim = config.get("embedding_dim", 256)
        
        logger.info(f"Model name: {model_name}")
        logger.info(f"Embedding dim: {embedding_dim}")
        
        # Load processor
        processor = CLIPProcessor.from_pretrained(model_name)
        
        # Load model
        model = FashionCLIP(model_name, embedding_dim).to(self.device)
        state_dict = ckpt.get("model_state_dict", ckpt)
        model.load_state_dict(state_dict, strict=True)
        
        return model, processor, config
    
    def _load_image_from_url(self, url: str, timeout: int = 10) -> Optional[Image.Image]:
        """Load image from URL."""
        try:
            response = requests.get(url, timeout=timeout)
            response.raise_for_status()
            img = Image.open(BytesIO(response.content)).convert("RGB")
            return img
        except Exception as e:
            logger.warning(f"Failed to load image from {url}: {e}")
            return None
    
    @torch.no_grad()
    def embed_images(self, images: List[Image.Image]) -> np.ndarray:
        """
        Generate embeddings for a batch of images.
        
        Args:
            images: List of PIL Images
            
        Returns:
            Numpy array of embeddings (N, embedding_dim)
        """
        if not images:
            return np.array([])
        
        max_length = self.config.get("max_length", 77)
        
        # Process images
        inputs = self.processor(
            images=images,
            text=[""] * len(images),  # Empty text for image-only encoding
            return_tensors="pt",
            padding="max_length",
            truncation=True,
            max_length=max_length
        )
        
        pixel_values = inputs["pixel_values"].to(self.device)
        input_ids = inputs["input_ids"].to(self.device)
        attention_mask = inputs["attention_mask"].to(self.device)
        
        # Generate embeddings
        img_emb, _ = self.model(pixel_values, input_ids, attention_mask)
        
        return img_emb.cpu().numpy().astype("float32")
    
    def generate_for_products(
        self,
        products: List[Dict],
        existing_npz: Optional[str] = None
    ) -> Tuple[np.ndarray, List[str], List[str], List[str]]:
        """
        Generate embeddings for a list of products.
        
        Args:
            products: List of product dictionaries from API
            existing_npz: Path to existing NPZ file (for resume capability)
            
        Returns:
            Tuple of (embeddings, urls, ids, names)
        """
        # Load existing data if available
        existing_ids = set()
        existing_vecs = []
        existing_urls = []
        existing_names = []
        
        if existing_npz and os.path.exists(existing_npz):
            logger.info(f"Loading existing embeddings from: {existing_npz}")
            try:
                data = np.load(existing_npz, allow_pickle=True)
                if 'ids' in data:
                    # Keep IDs as list to maintain order
                    existing_ids_list = [str(pid) for pid in data['ids']]
                    existing_ids = set(existing_ids_list)  # Set for fast lookup
                    existing_vecs = list(data['vecs'])
                    existing_urls = list(data.get('urls', data.get('paths', [])))
                    existing_names = list(data.get('names', [''] * len(existing_vecs)))
                    logger.info(f"✓ Loaded {len(existing_ids)} existing embeddings")
                else:
                    existing_ids_list = []
            except Exception as e:
                logger.warning(f"Failed to load existing NPZ: {e}")
                existing_ids_list = []
        else:
            existing_ids_list = []
        
        # Prepare data structures
        all_vecs = list(existing_vecs)
        all_urls = list(existing_urls)
        all_ids = list(existing_ids_list)  # Use the ordered list, not the set
        all_names = list(existing_names)
        
        # Filter out already processed products
        new_products = [
            p for p in products 
            if str(p.get('_id', '')) not in existing_ids
        ]
        
        if not new_products:
            logger.info("✓ All products already have embeddings")
            return (
                np.array(all_vecs, dtype='float32'),
                all_urls,
                all_ids,
                all_names
            )
        
        logger.info(f"Processing {len(new_products)} new products...")
        
        # Process in batches
        failed_count = 0
        success_count = 0
        
        for i in tqdm(range(0, len(new_products), self.batch_size), desc="Generating embeddings"):
            batch = new_products[i:i + self.batch_size]
            
            # Collect images and metadata for this batch
            batch_images = []
            batch_urls = []
            batch_ids = []
            batch_names = []
            
            for product in batch:
                product_id = str(product.get('_id', ''))
                # Try both 'name' and 'productDisplayName' fields
                product_name = product.get('name', product.get('productDisplayName', 'Unknown'))
                
                # Get first image URL
                images = product.get('images', [])
                if not images:
                    logger.warning(f"No images for product {product_id}")
                    failed_count += 1
                    continue
                
                image_url = images[0] if isinstance(images, list) else images
                
                # Load image
                image = self._load_image_from_url(image_url)
                if image is None:
                    failed_count += 1
                    continue
                
                batch_images.append(image)
                batch_urls.append(image_url)
                batch_ids.append(product_id)
                batch_names.append(product_name)
            
            # Generate embeddings for batch
            if batch_images:
                try:
                    embeddings = self.embed_images(batch_images)
                    
                    # Add to results
                    all_vecs.extend(embeddings)
                    all_urls.extend(batch_urls)
                    all_ids.extend(batch_ids)
                    all_names.extend(batch_names)
                    
                    success_count += len(batch_images)
                    
                except Exception as e:
                    logger.error(f"Error processing batch: {e}")
                    failed_count += len(batch_images)
        
        logger.info(f"✓ Successfully processed: {success_count}")
        logger.info(f"✗ Failed: {failed_count}")
        logger.info(f"✓ Total embeddings: {len(all_vecs)}")
        
        return (
            np.array(all_vecs, dtype='float32'),
            all_urls,
            all_ids,
            all_names
        )


def fetch_all_products(product_service_url: str) -> List[Dict]:
    """Fetch all active products from Product Service API."""
    logger.info(f"Fetching products from: {product_service_url}")
    
    try:
        response = requests.get(
            f"{product_service_url}/api/products",
            params={"limit": 10000, "page": 1},
            timeout=30
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Handle nested response structure: {"success": true, "data": {"products": [...]}}
        if 'data' in data and 'products' in data['data']:
            products = data['data']['products']
        elif 'products' in data:
            products = data['products']
        else:
            products = []
        
        logger.info(f"✓ Fetched {len(products)} products")
        return products
        
    except Exception as e:
        logger.error(f"Failed to fetch products: {e}")
        raise


def save_npz(
    output_path: str,
    vecs: np.ndarray,
    urls: List[str],
    ids: List[str],
    names: List[str]
):
    """Save embeddings and metadata to NPZ file."""
    logger.info(f"Saving NPZ to: {output_path}")
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Save
    np.savez_compressed(
        output_path,
        vecs=vecs,
        urls=np.array(urls, dtype=object),
        ids=np.array(ids, dtype=object),
        names=np.array(names, dtype=object)
    )
    
    logger.info(f"✓ Saved {len(vecs)} embeddings to NPZ")


def build_faiss_index(vecs: np.ndarray, index_path: str):
    """Build and save FAISS index."""
    logger.info("Building FAISS index...")
    
    if len(vecs) == 0:
        logger.warning("No vectors to index!")
        return
    
    # Create index (Inner Product for normalized vectors)
    dimension = vecs.shape[1]
    index = faiss.IndexFlatIP(dimension)
    
    # Add vectors
    index.add(vecs)
    
    # Save index
    os.makedirs(os.path.dirname(index_path), exist_ok=True)
    faiss.write_index(index, index_path)
    
    logger.info(f"✓ FAISS index saved to: {index_path}")
    logger.info(f"✓ Index contains {index.ntotal} vectors")


def main():
    parser = argparse.ArgumentParser(
        description="Generate embeddings for all products in database"
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default="models/fashion_clip_best.pt",
        help="Path to FashionCLIP checkpoint"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="models/cloud_gallery_embeddings.npz",
        help="Path to output NPZ file"
    )
    parser.add_argument(
        "--index",
        type=str,
        default="models/cloud_gallery_ip.index",
        help="Path to output FAISS index file"
    )
    parser.add_argument(
        "--product-service-url",
        type=str,
        default=os.environ.get("PRODUCT_SERVICE_URL", "http://localhost:3002"),
        help="Product Service URL"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Batch size for embedding generation"
    )
    parser.add_argument(
        "--device",
        type=str,
        default="cuda" if torch.cuda.is_available() else "cpu",
        help="Device to run model on (cpu or cuda)"
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from existing NPZ file (skip already processed products)"
    )
    
    args = parser.parse_args()
    
    # Print configuration
    logger.info("=" * 70)
    logger.info("EMBEDDING GENERATION")
    logger.info("=" * 70)
    logger.info(f"Checkpoint: {args.checkpoint}")
    logger.info(f"Output NPZ: {args.output}")
    logger.info(f"Output Index: {args.index}")
    logger.info(f"Product Service: {args.product_service_url}")
    logger.info(f"Batch size: {args.batch_size}")
    logger.info(f"Device: {args.device}")
    logger.info(f"Resume: {args.resume}")
    logger.info("=" * 70)
    
    # Validate checkpoint exists
    if not os.path.exists(args.checkpoint):
        logger.error(f"Checkpoint not found: {args.checkpoint}")
        sys.exit(1)
    
    try:
        # Initialize generator
        generator = EmbeddingGenerator(
            checkpoint_path=args.checkpoint,
            device=args.device,
            batch_size=args.batch_size
        )
        
        # Fetch products
        products = fetch_all_products(args.product_service_url)
        
        if not products:
            logger.error("No products found!")
            sys.exit(1)
        
        # Generate embeddings
        existing_npz = args.output if args.resume else None
        vecs, urls, ids, names = generator.generate_for_products(
            products,
            existing_npz=existing_npz
        )
        
        # Save NPZ
        save_npz(args.output, vecs, urls, ids, names)
        
        # Build FAISS index
        build_faiss_index(vecs, args.index)
        
        # Summary
        logger.info("=" * 70)
        logger.info("SUMMARY")
        logger.info("=" * 70)
        logger.info(f"✓ Total products in database: {len(products)}")
        logger.info(f"✓ Total embeddings generated: {len(vecs)}")
        logger.info(f"✓ NPZ file: {args.output}")
        logger.info(f"✓ FAISS index: {args.index}")
        logger.info("=" * 70)
        logger.info("✓ Done! You can now restart the recommendation service.")
        
    except Exception as e:
        logger.error(f"Failed to generate embeddings: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
