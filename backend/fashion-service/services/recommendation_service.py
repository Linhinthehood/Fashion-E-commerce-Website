# services/recommendation_service.py
"""
Hybrid Recommendation Service using FashionCLIP + FAISS.
Provides fast visual similarity recommendations with fallback to on-the-fly embedding generation.
"""

import os
import numpy as np
import torch
import faiss
import requests
from PIL import Image
from io import BytesIO
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import logging

from transformers import CLIPProcessor
from models.FashionCLIP import FashionCLIP
from utils.product_api_client import (
    get_product_by_id,
    get_all_active_products
)
from utils.db_helper import (
    get_first_image,
    serialize_product
)
from utils.filters import (
    apply_business_rules,
    rank_and_limit,
    format_recommendation_response,
    get_fallback_products
)

logger = logging.getLogger(__name__)


class RecommendationService:
    """
    Hybrid recommendation service combining FAISS index search with on-the-fly embedding generation.
    
    Primary mode: Fast FAISS lookup (pre-computed embeddings)
    Fallback mode: Generate embeddings on-the-fly for new products
    """
    
    def __init__(
        self,
        model_path: str,
        index_path: Optional[str] = None,
        npz_path: Optional[str] = None,
        device: str = "cpu"
    ):
        """
        Initialize the recommendation service.
        
        Args:
            model_path: Path to trained FashionCLIP model checkpoint
            index_path: Path to FAISS index file (optional, for fast mode)
            npz_path: Path to embeddings NPZ file (optional, for fast mode)
            device: Device to run model on ('cpu' or 'cuda')
        """
        self.device = torch.device(device)
        logger.info(f"Initializing RecommendationService on {self.device}")
        
        # Initialize these FIRST before loading anything
        self.embeddings = None
        self.image_paths = None  # Will store URLs
        self.product_ids = None  # Will store product IDs from NPZ
        self.product_names = None  # Will store product names from NPZ
        self.image_to_index = {}
        self.id_to_index = {}
        self.use_faiss = False
        self.index = None
        self.embedding_cache = {}
        
        # Load model
        self.model, self.processor, self.config = self._load_model(model_path)
        logger.info("✓ Model loaded successfully")
        
        # Load pre-computed embeddings if available
        if npz_path and os.path.exists(npz_path):
            self._load_npz_data(npz_path)
        else:
            logger.info("ℹ NPZ file not provided or doesn't exist, will use on-the-fly mode")
        
        # Load FAISS index if available (only if we have valid embeddings)
        if (index_path and os.path.exists(index_path) and 
            self.image_paths is not None and len(self.image_paths) > 0):
            self._load_faiss_index(index_path)
        else:
            logger.info("ℹ FAISS index not available or prerequisites not met")
        
        logger.info("✓ RecommendationService initialized successfully")
        self._log_initialization_summary()
    
    def _load_npz_data(self, npz_path: str):
        """Load embeddings and paths from NPZ file."""
        try:
            logger.info(f"Loading NPZ data from: {npz_path}")
            data = np.load(npz_path, allow_pickle=True)
            
            # Check what keys are in the NPZ file
            logger.info(f"NPZ file contains keys: {list(data.keys())}")
            
            # Load embeddings (required)
            if 'vecs' not in data:
                logger.error("NPZ file missing 'vecs' key")
                return
            
            self.embeddings = data['vecs'].astype('float32')
            logger.info(f"✓ Loaded embeddings with shape: {self.embeddings.shape}")
            
            # Load URLs/paths (required)
            # Try 'urls' first (your format), then fall back to 'paths'
            if 'urls' in data:
                self.image_paths = [str(url) for url in data['urls']]
                logger.info(f"✓ Loaded {len(self.image_paths)} image URLs")
            elif 'paths' in data:
                self.image_paths = [str(path) for path in data['paths']]
                logger.info(f"✓ Loaded {len(self.image_paths)} image paths")
            else:
                logger.error("NPZ file missing both 'urls' and 'paths' keys")
                self.embeddings = None
                return
            
            # Load product IDs (optional but useful)
            if 'ids' in data:
                self.product_ids = [str(pid) for pid in data['ids']]
                logger.info(f"✓ Loaded {len(self.product_ids)} product IDs")
                
                # Build ID-to-index mapping
                for idx, pid in enumerate(self.product_ids):
                    self.id_to_index[pid] = idx
                logger.info(f"✓ Built ID-to-index mapping with {len(self.id_to_index)} entries")
            
            # Load product names (optional, for debugging)
            if 'names' in data:
                self.product_names = [str(name) for name in data['names']]
                logger.info(f"✓ Loaded {len(self.product_names)} product names")
            
            # Log first few samples for debugging
            if self.image_paths:
                logger.info("Sample data:")
                for i in range(min(3, len(self.image_paths))):
                    logger.info(f"  [{i}] URL: {self.image_paths[i][:70]}...")
                    if self.product_ids:
                        logger.info(f"      ID:  {self.product_ids[i]}")
                    if self.product_names:
                        logger.info(f"      Name: {self.product_names[i]}")
            
            # Build URL-to-index mapping
            self.image_to_index = {}
            for idx, url in enumerate(self.image_paths):
                self.image_to_index[url] = idx
            logger.info(f"✓ Built URL-to-index mapping with {len(self.image_to_index)} entries")
            
            # Validate data consistency
            if len(self.embeddings) != len(self.image_paths):
                logger.warning(
                    f"Mismatch: {len(self.embeddings)} embeddings but "
                    f"{len(self.image_paths)} URLs"
                )
            
        except Exception as e:
            logger.error(f"Failed to load NPZ data: {e}", exc_info=True)
            self.embeddings = None
            self.image_paths = None
            self.product_ids = None
            self.product_names = None
            self.image_to_index = {}
            self.id_to_index = {}
    
    def _load_faiss_index(self, index_path: str):
        """Load FAISS index."""
        try:
            logger.info(f"Loading FAISS index from: {index_path}")
            self.index = faiss.read_index(index_path)
            
            # Validate index
            if self.index.ntotal == 0:
                logger.error("FAISS index is empty")
                self.index = None
                return
            
            # Check if index size matches embeddings
            if self.embeddings is not None:
                if self.index.ntotal != len(self.embeddings):
                    logger.warning(
                        f"Index size mismatch: FAISS has {self.index.ntotal} vectors, "
                        f"but NPZ has {len(self.embeddings)} embeddings"
                    )
            
            self.use_faiss = True
            logger.info(f"✓ FAISS index loaded: {self.index.ntotal} vectors")
            
        except Exception as e:
            logger.error(f"Failed to load FAISS index: {e}", exc_info=True)
            self.index = None
            self.use_faiss = False
    
    def _log_initialization_summary(self):
        """Log initialization summary."""
        logger.info("=" * 60)
        logger.info("INITIALIZATION SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Mode: {'FAISS' if self.use_faiss else 'ON-THE-FLY'}")
        logger.info(f"FAISS enabled: {self.use_faiss}")
        logger.info(f"Index vectors: {self.index.ntotal if self.index else 0}")
        logger.info(f"Embeddings loaded: {len(self.embeddings) if self.embeddings is not None else 0}")
        logger.info(f"Image URLs loaded: {len(self.image_paths) if self.image_paths is not None else 0}")
        logger.info(f"Product IDs loaded: {len(self.product_ids) if self.product_ids else 0}")
        logger.info(f"Device: {self.device}")
        logger.info("=" * 60)
    
    def _load_model(self, checkpoint_path: str) -> Tuple:
        """Load FashionCLIP model from checkpoint."""
        try:
            logger.info(f"Loading model from: {checkpoint_path}")
            
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
            model.eval()
            
            return model, processor, config
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}", exc_info=True)
            raise
    
    def _load_image_from_url(self, url: str) -> Optional[Image.Image]:
        """Load image from URL."""
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            img = Image.open(BytesIO(response.content)).convert("RGB")
            return img
        except Exception as e:
            logger.error(f"Failed to load image from {url}: {e}")
            return None
    
    @torch.no_grad()
    def _embed_image(self, image: Image.Image) -> Optional[np.ndarray]:
        """Generate embedding for a single image."""
        try:
            max_length = self.config.get("max_length", 77)
            
            inputs = self.processor(
                images=[image],
                text=[""],
                return_tensors="pt",
                padding="max_length",
                truncation=True,
                max_length=max_length
            )
            
            pixel_values = inputs["pixel_values"].to(self.device)
            input_ids = inputs["input_ids"].to(self.device)
            attention_mask = inputs["attention_mask"].to(self.device)
            
            img_emb, _ = self.model(pixel_values, input_ids, attention_mask)
            
            return img_emb.cpu().numpy().astype("float32")[0]
            
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None
    
    def _embed_product(self, product: Dict) -> Optional[np.ndarray]:
        """
        Generate embedding for a product.
        Uses cache if available.
        """
        product_id = str(product.get('_id', ''))
        
        # Check cache first
        if product_id in self.embedding_cache:
            logger.debug(f"Using cached embedding for product {product_id}")
            return self.embedding_cache[product_id]
        
        # Get first image
        image_url = get_first_image(product)
        if not image_url:
            logger.warning(f"No image for product {product_id}")
            return None
        
        # Load and embed image
        image = self._load_image_from_url(image_url)
        if image is None:
            return None
        
        embedding = self._embed_image(image)
        
        # Cache it
        if embedding is not None:
            self.embedding_cache[product_id] = embedding
            logger.debug(f"Cached embedding for product {product_id}")
        
        return embedding
    
    def _find_in_faiss(self, query_embedding: np.ndarray, k: int = 50) -> Tuple[np.ndarray, np.ndarray]:
        """
        Search FAISS index for similar embeddings.
        
        Args:
            query_embedding: Query embedding vector
            k: Number of results to return
            
        Returns:
            Tuple of (similarities, indices)
        """
        if self.index is None:
            raise ValueError("FAISS index not loaded")
        
        # Ensure query is 2D and float32
        query = query_embedding.reshape(1, -1).astype('float32')
        
        # Limit k to available vectors
        k = min(k, self.index.ntotal)
        
        # Search index
        similarities, indices = self.index.search(query, k)
        
        return similarities[0], indices[0]
    
    def _map_indices_to_products(
        self, 
        db, 
        indices: np.ndarray, 
        similarities: np.ndarray
    ) -> List[Tuple[Dict, float]]:
        """
        Map FAISS indices to product documents.
        
        Args:
            db: MongoDB database connection
            indices: Array of FAISS indices
            similarities: Array of similarity scores
            
        Returns:
            List of (product, similarity) tuples
        """
        results = []
        
        # Validate prerequisites
        if self.image_paths is None:
            logger.error("image_paths is None, cannot map indices")
            return results
        
        if len(self.image_paths) == 0:
            logger.error("image_paths is empty, cannot map indices")
            return results
        
        # Cache all products for efficiency
        logger.info("Fetching all active products from database...")
        all_products = get_all_active_products(db)
        logger.info(f"Retrieved {len(all_products)} products from database")
        
        # Build lookup dictionaries for faster matching
        product_by_image = {}
        product_by_id = {}
        
        for product in all_products:
            product_id = str(product.get('_id', ''))
            product_image = get_first_image(product)
            
            if product_image:
                product_by_image[product_image] = product
            
            if product_id:
                product_by_id[product_id] = product
        
        logger.info(f"Built lookup dictionaries: {len(product_by_image)} by image, {len(product_by_id)} by ID")
        
        matched_count = 0
        for idx, sim in zip(indices, similarities):
            # Skip invalid indices
            if idx < 0 or idx >= len(self.image_paths):
                logger.debug(f"Skipping invalid index: {idx}")
                continue
            
            product = None
            
            # Strategy 1: Try matching by product ID (most reliable)
            if self.product_ids and idx < len(self.product_ids):
                product_id = self.product_ids[idx]
                if product_id in product_by_id:
                    product = product_by_id[product_id]
                    matched_count += 1
                    logger.debug(f"Matched by ID: {product_id}")
            
            # Strategy 2: Try matching by image URL
            if product is None:
                image_url = self.image_paths[idx]
                
                # Exact match
                if image_url in product_by_image:
                    product = product_by_image[image_url]
                    matched_count += 1
                    logger.debug(f"Matched by exact URL")
                else:
                    # Fuzzy match
                    for db_image, db_product in product_by_image.items():
                        if self._images_match(image_url, db_image):
                            product = db_product
                            matched_count += 1
                            logger.debug(f"Matched by fuzzy URL")
                            break
            
            if product:
                results.append((product, float(sim)))
            else:
                if self.product_names and idx < len(self.product_names):
                    logger.debug(f"No match for: {self.product_names[idx]}")
        
        logger.info(f"Mapped {matched_count} out of {len(indices)} indices to products")
        return results
    
    def _images_match(self, url1: str, url2: str) -> bool:
        """
        Check if two image URLs refer to the same image.
        Handles different URL formats and protocols.
        """
        if url1 == url2:
            return True
        
        # Extract Cloudinary public ID if present
        def extract_public_id(url):
            try:
                # Cloudinary URLs typically have format: .../upload/v{version}/{public_id}.{ext}
                if 'cloudinary.com' in url and '/upload/' in url:
                    parts = url.split('/upload/')
                    if len(parts) > 1:
                        # Get the part after /upload/
                        rest = parts[1]
                        # Skip version if present
                        if rest.startswith('v'):
                            rest = '/'.join(rest.split('/')[1:])
                        # Get public ID (without extension)
                        public_id = rest.rsplit('.', 1)[0]
                        return public_id
            except:
                pass
            return None
        
        id1 = extract_public_id(url1)
        id2 = extract_public_id(url2)
        
        if id1 and id2 and id1 == id2:
            return True
        
        # Check if one contains the other
        if url1 in url2 or url2 in url1:
            return True
        
        return False
    
    def _search_with_faiss(
        self,
        db,
        target_product: Dict,
        k: int = 50
    ) -> List[Tuple[Dict, float]]:
        """
        Search for similar products using FAISS index (fast path).
        
        Args:
            db: MongoDB database connection
            target_product: Target product document
            k: Number of candidates to retrieve
            
        Returns:
            List of (product, similarity_score) tuples
        """
        product_name = target_product.get('name', 'Unknown')
        logger.info(f"Using FAISS search for product: {product_name}")
        
        # Validate FAISS is available
        if not self.use_faiss or self.index is None or self.image_paths is None:
            logger.warning("FAISS not properly initialized, returning empty results")
            return []
        
        # Get target product info
        target_id = str(target_product.get('_id', ''))
        target_image_url = get_first_image(target_product)
        
        if not target_image_url:
            logger.warning("Target product has no image")
            return []
        
        logger.info(f"Target ID: {target_id}")
        logger.info(f"Target image: {target_image_url[:70]}...")
        
        # Find query embedding
        query_embedding = None
        
        # Strategy 1: Match by product ID (most reliable)
        if target_id in self.id_to_index:
            idx = self.id_to_index[target_id]
            query_embedding = self.embeddings[idx]
            logger.info(f"✓ Found by ID in index at position {idx}")
        
        # Strategy 2: Match by image URL
        elif target_image_url in self.image_to_index:
            idx = self.image_to_index[target_image_url]
            query_embedding = self.embeddings[idx]
            logger.info(f"✓ Found by URL in index at position {idx}")
        
        # Strategy 3: Fuzzy match by image URL
        else:
            for indexed_url, idx in self.image_to_index.items():
                if self._images_match(target_image_url, indexed_url):
                    query_embedding = self.embeddings[idx]
                    logger.info(f"✓ Found by fuzzy URL match at position {idx}")
                    break
        
        # Strategy 4: Generate embedding on-the-fly
        if query_embedding is None:
            logger.info("Target not in index, generating embedding on-the-fly...")
            query_embedding = self._embed_product(target_product)
            if query_embedding is None:
                logger.error("Failed to generate embedding for target product")
                return []
        
        try:
            # Search FAISS
            similarities, indices = self._find_in_faiss(query_embedding, k)
            logger.info(f"FAISS search returned {len(indices)} results")
            
            # Map to products
            results = self._map_indices_to_products(db, indices, similarities)
            
            # Remove target product itself
            results = [(p, s) for p, s in results if str(p.get('_id', '')) != target_id]
            
            logger.info(f"After filtering target, {len(results)} candidates remain")
            return results
            
        except Exception as e:
            logger.error(f"Error in FAISS search: {e}", exc_info=True)
            return []
    
    def _search_on_the_fly(
        self,
        db,
        target_product: Dict,
        candidate_products: Optional[List[Dict]] = None
    ) -> List[Tuple[Dict, float]]:
        """
        Search for similar products by generating embeddings on-the-fly (fallback path).
        
        Args:
            db: MongoDB database connection
            target_product: Target product document
            candidate_products: Optional list of candidate products (if None, uses all)
            
        Returns:
            List of (product, similarity_score) tuples
        """
        logger.info(f"Using on-the-fly search for product: {target_product.get('name')}")
        
        # Generate target embedding
        target_embedding = self._embed_product(target_product)
        if target_embedding is None:
            logger.error("Failed to generate target embedding")
            return []
        
        # Get candidate products
        if candidate_products is None:
            candidate_products = get_all_active_products(db)
        
        logger.info(f"Searching through {len(candidate_products)} candidate products")
        
        # Remove target product
        target_id = str(target_product.get('_id', ''))
        candidate_products = [
            p for p in candidate_products 
            if str(p.get('_id', '')) != target_id
        ]
        
        # Generate embeddings and compute similarities
        results = []
        for i, product in enumerate(candidate_products):
            if (i + 1) % 10 == 0:
                logger.info(f"Processing product {i + 1}/{len(candidate_products)}...")
            
            product_embedding = self._embed_product(product)
            if product_embedding is None:
                continue
            
            # Compute cosine similarity
            similarity = float(
                np.dot(target_embedding, product_embedding) / 
                (np.linalg.norm(target_embedding) * np.linalg.norm(product_embedding))
            )
            
            results.append((product, similarity))
        
        # Sort by similarity
        results.sort(key=lambda x: -x[1])
        
        logger.info(f"On-the-fly search found {len(results)} similar products")
        return results
    
    def get_similar_products(
        self,
        db,
        product_id: str,
        limit: int = 6,
        options: Optional[Dict] = None
    ) -> Dict:
        """
        Get similar products for a given product ID.
        
        Args:
            db: MongoDB database connection
            product_id: Target product ID
            limit: Number of recommendations to return
            options: Filter options (price_tolerance, same_category_only, etc.)
            
        Returns:
            Dict with recommendations and metadata
        """
        try:
            logger.info(f"Getting similar products for: {product_id}")
            
            # Set default options
            options = options or {}
            options.setdefault('price_tolerance', 0.5)
            options.setdefault('filter_gender', True)
            options.setdefault('filter_usage', True)
            options.setdefault('same_category_only', True)
            options.setdefault('brand_boost', 0.05)
            options.setdefault('min_similarity', 0.6)
            
            # Get target product
            target_product = get_product_by_id(db, product_id)
            if not target_product:
                return {
                    'error': 'Product not found',
                    'recommendations': [],
                    'count': 0
                }
            
            # Pre-filter candidates by category if needed
            candidate_pool = None
            if options.get('same_category_only', True):
                # Extract category fields from target
                target_article_type = target_product.get('articleType')
                target_master_category = target_product.get('masterCategory')
                target_sub_category = target_product.get('subCategory')
                
                # Fallback to categoryId if fields not in root
                if not target_article_type and not target_master_category and not target_sub_category:
                    category_info = target_product.get('categoryId', {})
                    if isinstance(category_info, dict):
                        target_article_type = category_info.get('articleType')
                        target_master_category = category_info.get('masterCategory')
                        target_sub_category = category_info.get('subCategory')
                
                logger.info(f"Pre-filtering by category: articleType={target_article_type}, "
                           f"masterCategory={target_master_category}, subCategory={target_sub_category}")
                
                # Get all products and filter by category fields BEFORE AI search
                all_products = get_all_active_products(db)
                candidate_pool = []
                
                for product in all_products:
                    # Get product's category fields
                    product_article_type = product.get('articleType')
                    product_master_category = product.get('masterCategory')
                    product_sub_category = product.get('subCategory')
                    
                    # Fallback to categoryId
                    if not product_article_type and not product_master_category and not product_sub_category:
                        category_info = product.get('categoryId', {})
                        if isinstance(category_info, dict):
                            product_article_type = category_info.get('articleType')
                            product_master_category = category_info.get('masterCategory')
                            product_sub_category = category_info.get('subCategory')
                    
                    # Check if category fields match
                    matches = True
                    if target_article_type and product_article_type != target_article_type:
                        matches = False
                    if target_master_category and product_master_category != target_master_category:
                        matches = False
                    if target_sub_category and product_sub_category != target_sub_category:
                        matches = False
                    
                    if matches:
                        candidate_pool.append(product)
                
                logger.info(f"Pre-filtered to {len(candidate_pool)} products in same category")
            
            # Choose search strategy
            candidates = []
            method = 'unknown'
            
            if self.use_faiss and self.index is not None:
                # Try FAISS first
                all_faiss_results = self._search_with_faiss(db, target_product, k=50)
                
                # Filter FAISS results by category if pre-filtering is enabled
                if candidate_pool is not None:
                    logger.info(f"Filtering FAISS results by category (got {len(all_faiss_results)} results)")
                    candidates = [
                        (prod, score) for prod, score in all_faiss_results
                        if any(prod.get('_id') == cp.get('_id') for cp in candidate_pool)
                    ]
                    logger.info(f"After category filtering: {len(candidates)} results remain")
                else:
                    candidates = all_faiss_results
                
                method = 'faiss'
            
            # Fallback to on-the-fly if FAISS failed or returned nothing
            if not candidates:
                logger.info("Falling back to on-the-fly mode")
                # Pass pre-filtered candidates to on-the-fly search
                candidates = self._search_on_the_fly(db, target_product, candidate_products=candidate_pool)
                method = 'on-the-fly'
            
            if not candidates:
                # Use fallback products if no matches found
                logger.warning("No similar products found, using fallback")
                fallback = get_fallback_products(db, target_product, limit)
                response = format_recommendation_response(
                    [(p, 0.5) for p in fallback],
                    target_product
                )
                response['method'] = 'fallback'
                return response
            
            # Apply business rules and filters
            filtered = apply_business_rules(candidates, target_product, options)
            
            if not filtered:
                # Loosen constraints if no results
                logger.info("No results after filtering, loosening constraints...")
                options['price_tolerance'] = 1.0
                options['same_category_only'] = False
                filtered = apply_business_rules(candidates, target_product, options)
            
            # Rank and limit results
            top_results = rank_and_limit(filtered, limit)
            
            # Format response
            response = format_recommendation_response(top_results, target_product)
            response['method'] = method
            
            return response
            
        except Exception as e:
            logger.error(f"Error in get_similar_products: {e}", exc_info=True)
            return {
                'error': str(e),
                'recommendations': [],
                'count': 0
            }
    
    def search_by_image(
        self,
        db,
        image_url: str,
        limit: int = 10,
        options: Optional[Dict] = None
    ) -> Dict:
        """
        Search for products similar to a given image.
        
        Args:
            db: MongoDB database connection
            image_url: URL of the query image
            limit: Number of results to return
            options: Filter options (category_filter, price_range, etc.)
            
        Returns:
            Dict with search results
        """
        try:
            logger.info(f"Searching by image: {image_url[:60]}...")
            options = options or {}
            
            # Load query image
            query_image = self._load_image_from_url(image_url)
            if query_image is None:
                return {
                    'error': 'Failed to load image',
                    'results': [],
                    'count': 0
                }
            
            # Generate query embedding
            query_embedding = self._embed_image(query_image)
            if query_embedding is None:
                return {
                    'error': 'Failed to generate embedding',
                    'results': [],
                    'count': 0
                }
            
            # Search using FAISS if available
            if self.use_faiss and self.index is not None:
                similarities, indices = self._find_in_faiss(query_embedding, k=limit * 2)
                results = self._map_indices_to_products(db, indices, similarities)
                method = 'faiss'
            else:
                # On-the-fly search against all products
                all_products = get_all_active_products(db)
                results = []
                
                for product in all_products:
                    product_embedding = self._embed_product(product)
                    if product_embedding is None:
                        continue
                    
                    similarity = float(
                        np.dot(query_embedding, product_embedding) / 
                        (np.linalg.norm(query_embedding) * np.linalg.norm(product_embedding))
                    )
                    
                    results.append((product, similarity))
                
                results.sort(key=lambda x: -x[1])
                method = 'on-the-fly'
            
            # Apply filters if specified
            if 'min_similarity' in options:
                min_sim = options['min_similarity']
                results = [(p, s) for p, s in results if s >= min_sim]
            
            # Limit results
            results = results[:limit]
            
            # Format response
            formatted_results = [
                {
                    'product': serialize_product(product),
                    'similarity': round(score, 4)
                }
                for product, score in results
            ]
            
            return {
                'results': formatted_results,
                'count': len(formatted_results),
                'method': method
            }
            
        except Exception as e:
            logger.error(f"Error in search_by_image: {e}", exc_info=True)
            return {
                'error': str(e),
                'results': [],
                'count': 0
            }
    
    def get_stats(self) -> Dict:
        """Get service statistics."""
        return {
            'mode': 'hybrid' if self.use_faiss else 'on-the-fly',
            'faiss_enabled': self.use_faiss,
            'index_vectors': self.index.ntotal if self.index else 0,
            'indexed_products': len(self.image_paths) if self.image_paths else 0,
            'cached_embeddings': len(self.embedding_cache),
            'device': str(self.device),
            'model_config': self.config
        }

    def retrieve_personalized(
        self,
        db,
        recent_item_ids: Optional[List[str]] = None,
        limit: int = 50,
        options: Optional[Dict] = None
    ) -> Dict:
        """
        Retrieve a set of personalized candidate products by aggregating
        similar items from recent_item_ids and applying simple hybrid scoring.

        Args:
            db: Mongo connection (unused for now beyond product lookups)
            recent_item_ids: List of productIds the user viewed/added/purchased recently
            limit: Max candidates to return
            options: Future use (category/price constraints)
        """
        try:
            options = options or {}
            limit = max(1, min(int(limit), 200))

            if not recent_item_ids or len(recent_item_ids) == 0:
                # Fallback: return popular/safe defaults (reuse similar of a few random or top by index)
                # Here we return top-N by index order as a simple placeholder
                k = min(limit, (self.index.ntotal if self.index else 0))
                if self.index is None or k == 0:
                    return { 'candidates': [], 'count': 0, 'method': 'empty' }
                # Map first k indices to products
                sims = np.linspace(1.0, 0.7, k).astype('float32')
                idxs = np.arange(k)
                mapped = self._map_indices_to_products(db, idxs, sims)
                candidates = [
                    {
                        'product': serialize_product(p),
                        'score': round(float(s), 4)
                    }
                    for p, s in mapped
                ][:limit]
                return { 'candidates': candidates, 'count': len(candidates), 'method': 'fallback-index' }

            # Aggregate candidates from each recent item using FAISS path
            aggregate_scores: Dict[str, float] = {}
            aggregate_products: Dict[str, Dict] = {}

            per_seed_k = 50
            for seed_id in recent_item_ids[:10]:  # cap seeds for perf
                try:
                    seed_res = self.get_similar_products(db, seed_id, limit=per_seed_k, options={ 'same_category_only': False, 'min_similarity': 0.0 })
                    recs = seed_res.get('recommendations', [])
                    for rec in recs:
                        prod = rec.get('product') or {}
                        pid = str(prod.get('_id', ''))
                        sim = float(rec.get('similarity', 0.0))
                        if not pid:
                            continue
                        # Aggregate by max similarity for now
                        if pid not in aggregate_scores or sim > aggregate_scores[pid]:
                            aggregate_scores[pid] = sim
                            aggregate_products[pid] = prod
                except Exception:
                    continue

            if not aggregate_scores:
                return { 'candidates': [], 'count': 0, 'method': 'no-seed-results' }

            # Rank by aggregated score and trim to limit
            ranked = sorted(aggregate_scores.items(), key=lambda kv: -kv[1])[:limit]
            candidates = [
                {
                    'product': aggregate_products[pid],
                    'score': round(float(score), 4)
                }
                for pid, score in ranked
            ]

            return { 'candidates': candidates, 'count': len(candidates), 'method': 'seeds-faiss-aggregate' }

        except Exception as e:
            logger.error(f"Error in retrieve_personalized: {e}", exc_info=True)
            return { 'error': str(e), 'candidates': [], 'count': 0 }