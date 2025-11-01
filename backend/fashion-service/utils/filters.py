# utils/filters.py
"""
Filtering and ranking logic for product recommendations.
Applies business rules to refine similarity-based recommendations.
"""

from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


def filter_by_price_range(
    products: List[Dict],
    target_price: float,
    tolerance: float = 0.5
) -> List[Dict]:
    """
    Filter products within a price range of the target product.
    
    Args:
        products: List of product documents
        target_price: Price of the target product
        tolerance: Price tolerance as a fraction (0.5 = ±50%)
        
    Returns:
        Filtered list of products within price range
    """
    if not products or target_price <= 0:
        return products
    
    min_price = target_price * (1 - tolerance)
    max_price = target_price * (1 + tolerance)
    
    filtered = []
    for product in products:
        product_price = product.get('defaultPrice', 0)
        if product_price and min_price <= product_price <= max_price:
            filtered.append(product)
    
    logger.debug(
        f"Price filter: {len(products)} → {len(filtered)} products "
        f"(range: {min_price:.0f} - {max_price:.0f})"
    )
    
    return filtered


def filter_by_gender(
    products: List[Dict],
    target_gender: str,
    allow_unisex: bool = True
) -> List[Dict]:
    """
    Filter products by gender compatibility.
    
    Args:
        products: List of product documents
        target_gender: Gender of target product (Male/Female/Unisex)
        allow_unisex: Whether to include Unisex items
        
    Returns:
        Filtered list of gender-compatible products
    """
    if not products or not target_gender:
        return products
    
    filtered = []
    for product in products:
        product_gender = product.get('gender', '')
        
        # Exact match
        if product_gender == target_gender:
            filtered.append(product)
        # Unisex items work with everything
        elif allow_unisex and (product_gender == 'Unisex' or target_gender == 'Unisex'):
            filtered.append(product)
    
    logger.debug(
        f"Gender filter ({target_gender}): {len(products)} → {len(filtered)} products"
    )
    
    return filtered


def filter_by_usage(
    products: List[Dict],
    target_usage: str,
    allow_casual_fallback: bool = True
) -> List[Dict]:
    """
    Filter products by usage type.
    
    Args:
        products: List of product documents
        target_usage: Usage type of target product (Casual/Formal/Sports/Daily)
        allow_casual_fallback: Allow Casual items as fallback for other usage types
        
    Returns:
        Filtered list of usage-compatible products
    """
    if not products or not target_usage:
        return products
    
    filtered = []
    for product in products:
        product_usage = product.get('usage', '')
        
        # Exact match
        if product_usage == target_usage:
            filtered.append(product)
        # Casual works with most things as fallback
        elif allow_casual_fallback and (product_usage == 'Casual' or target_usage == 'Casual'):
            filtered.append(product)
    
    logger.debug(
        f"Usage filter ({target_usage}): {len(products)} → {len(filtered)} products"
    )
    
    return filtered


def filter_by_category(
    products: List[Dict],
    target_product: Dict,
    same_category_only: bool = True
) -> List[Dict]:
    """
    Filter products by category using articleType, masterCategory, and subCategory.
    
    Args:
        products: List of product documents
        target_product: Target product with category fields
        same_category_only: Require matching articleType, masterCategory, subCategory
        
    Returns:
        Filtered list of products matching category constraints
    """
    if not products or not same_category_only:
        return products
    
    # Extract target category fields
    target_article_type = target_product.get('articleType')
    target_master_category = target_product.get('masterCategory')
    target_sub_category = target_product.get('subCategory')
    
    # If none of the 3 fields exist, check categoryId as fallback
    if not target_article_type and not target_master_category and not target_sub_category:
        category_info = target_product.get('categoryId', {})
        if isinstance(category_info, dict):
            target_article_type = category_info.get('articleType')
            target_master_category = category_info.get('masterCategory')
            target_sub_category = category_info.get('subCategory')
    
    filtered = []
    
    for product in products:
        matches = True
        
        # Get product's category fields
        product_article_type = product.get('articleType')
        product_master_category = product.get('masterCategory')
        product_sub_category = product.get('subCategory')
        
        # If not in product root, check categoryId
        if not product_article_type and not product_master_category and not product_sub_category:
            category_info = product.get('categoryId', {})
            if isinstance(category_info, dict):
                product_article_type = category_info.get('articleType')
                product_master_category = category_info.get('masterCategory')
                product_sub_category = category_info.get('subCategory')
        
        # Check articleType match
        if target_article_type:
            if product_article_type != target_article_type:
                matches = False
        
        # Check masterCategory match
        if target_master_category:
            if product_master_category != target_master_category:
                matches = False
        
        # Check subCategory match
        if target_sub_category:
            if product_sub_category != target_sub_category:
                matches = False
        
        if matches:
            filtered.append(product)
    
    logger.debug(
        f"Category filter (articleType={target_article_type}, masterCategory={target_master_category}, "
        f"subCategory={target_sub_category}): {len(products)} → {len(filtered)} products"
    )
    
    return filtered


def apply_brand_boost(
    products_with_scores: List[Tuple[Dict, float]],
    target_brand: str,
    boost_amount: float = 0.05
) -> List[Tuple[Dict, float]]:
    """
    Boost similarity scores for products from the same brand.
    
    Args:
        products_with_scores: List of (product, similarity_score) tuples
        target_brand: Brand of the target product
        boost_amount: Amount to boost score (e.g., 0.05 = +5%)
        
    Returns:
        List with boosted scores for same-brand products
    """
    if not products_with_scores or not target_brand:
        return products_with_scores
    
    boosted = []
    for product, score in products_with_scores:
        product_brand = product.get('brand', '')
        
        # Boost same brand
        if product_brand and product_brand.lower() == target_brand.lower():
            boosted_score = min(score + boost_amount, 1.0)  # Cap at 1.0
            boosted.append((product, boosted_score))
            logger.debug(f"Boosted {product.get('name')} from {score:.3f} to {boosted_score:.3f}")
        else:
            boosted.append((product, score))
    
    return boosted


def apply_business_rules(
    products_with_scores: List[Tuple[Dict, float]],
    target_product: Dict,
    options: Optional[Dict] = None
) -> List[Tuple[Dict, float]]:
    """
    Apply business rules using SCORING instead of hard filtering.
    Only category is a hard filter. Price/gender/usage boost scores instead of removing products.
    
    Args:
        products_with_scores: List of (product, similarity_score) tuples
        target_product: The target product for recommendations
        options: Filter options dict with keys:
            - price_tolerance: float (default 0.5)
            - filter_gender: bool (default True)
            - filter_usage: bool (default True)
            - same_category_only: bool (default True)
            - brand_boost: float (default 0.05)
            - min_similarity: float (default 0.0)
        
    Returns:
        Scored list of (product, adjusted_score) tuples
    """
    if not products_with_scores:
        return []
    
    # Default options
    options = options or {}
    price_tolerance = options.get('price_tolerance', 0.5)
    filter_gender = options.get('filter_gender', True)
    filter_usage = options.get('filter_usage', True)
    same_category_only = options.get('same_category_only', True)
    brand_boost = options.get('brand_boost', 0.05)
    min_similarity = options.get('min_similarity', 0.0)
    
    # Extract products and scores
    products = [p for p, _ in products_with_scores]
    scores_dict = {str(p.get('_id', '')): s for p, s in products_with_scores}
    
    # Get target product info
    target_price = target_product.get('defaultPrice', 0)
    target_gender = target_product.get('gender', '')
    target_usage = target_product.get('usage', '')
    target_brand = target_product.get('brand', '')
    
    # HARD FILTER: Only category filtering removes products
    filtered = products
    before_category = len(filtered)
    if same_category_only:
        filtered = filter_by_category(filtered, target_product, same_category_only=True)
    logger.info(f"Category filter (HARD): {before_category} → {len(filtered)} products")
    
    # Build scored results with SOFT filters (boost/penalty instead of removal)
    scored_results = []
    
    for product in filtered:
        base_score = scores_dict[str(product.get('_id', ''))]
        adjusted_score = base_score
        
        # 1. Price scoring (boost if within range, small penalty if outside)
        if target_price > 0:
            product_price = product.get('defaultPrice', 0)
            if product_price > 0:
                min_price = target_price * (1 - price_tolerance)
                max_price = target_price * (1 + price_tolerance)
                
                if min_price <= product_price <= max_price:
                    # Within range: boost +10%
                    adjusted_score = min(adjusted_score + 0.10, 1.0)
                else:
                    # Outside range: small penalty -5%
                    adjusted_score = max(adjusted_score - 0.05, 0.0)
        
        # 2. Gender scoring
        if filter_gender and target_gender:
            product_gender = product.get('gender', '')
            if product_gender == target_gender:
                # Exact match: boost +8%
                adjusted_score = min(adjusted_score + 0.08, 1.0)
            elif product_gender == 'Unisex' or target_gender == 'Unisex':
                # Unisex: boost +5%
                adjusted_score = min(adjusted_score + 0.05, 1.0)
            else:
                # Mismatch: penalty -10%
                adjusted_score = max(adjusted_score - 0.10, 0.0)
        
        # 3. Usage scoring
        if filter_usage and target_usage:
            product_usage = product.get('usage', '')
            if product_usage == target_usage:
                # Exact match: boost +8%
                adjusted_score = min(adjusted_score + 0.08, 1.0)
            elif product_usage == 'Casual' or target_usage == 'Casual':
                # Casual fallback: boost +3%
                adjusted_score = min(adjusted_score + 0.03, 1.0)
            else:
                # Mismatch: penalty -8%
                adjusted_score = max(adjusted_score - 0.08, 0.0)
        
        # 4. Brand boost
        if brand_boost > 0 and target_brand:
            product_brand = product.get('brand', '')
            if product_brand and product_brand.lower() == target_brand.lower():
                adjusted_score = min(adjusted_score + brand_boost, 1.0)
        
        scored_results.append((product, adjusted_score))
    
    # 5. Filter by minimum similarity threshold
    if min_similarity > 0:
        scored_results = [
            (p, s) for p, s in scored_results
            if s >= min_similarity
        ]
    
    # Sort by adjusted score (highest first)
    scored_results.sort(key=lambda x: -x[1])
    
    logger.info(
        f"Applied business rules (scoring): {len(products_with_scores)} → {len(scored_results)} products "
        f"(category filtered, then price/gender/usage scored)"
    )
    
    return scored_results


def rank_and_limit(
    products_with_scores: List[Tuple[Dict, float]],
    limit: int = 6,
    diversity_boost: bool = False
) -> List[Tuple[Dict, float]]:
    """
    Rank products by score and return top N.
    
    Args:
        products_with_scores: List of (product, score) tuples
        limit: Maximum number of results to return
        diversity_boost: If True, slightly favor diverse categories
        
    Returns:
        Top N ranked products with scores
    """
    if not products_with_scores:
        return []
    
    # Sort by score (descending)
    ranked = sorted(products_with_scores, key=lambda x: -x[1])
    
    # Optional: Add diversity (avoid showing 6 identical items)
    if diversity_boost and len(ranked) > limit:
        # This is a simple heuristic - could be more sophisticated
        diverse_results = []
        seen_brands = set()
        seen_colors = set()
        
        for product, score in ranked:
            brand = product.get('brand', '')
            color = product.get('color', '')
            
            # Prefer products with different brands/colors
            if len(diverse_results) < limit:
                diverse_results.append((product, score))
                seen_brands.add(brand)
                seen_colors.add(color)
            elif brand not in seen_brands or color not in seen_colors:
                # Replace lowest scored item if this adds diversity
                if score > diverse_results[-1][1]:
                    diverse_results[-1] = (product, score)
                    diverse_results.sort(key=lambda x: -x[1])
                    seen_brands.add(brand)
                    seen_colors.add(color)
        
        return diverse_results[:limit]
    
    return ranked[:limit]


def get_fallback_products(
    db,
    target_product: Dict,
    limit: int = 6
) -> List[Dict]:
    """
    Get fallback products when no good matches are found.
    Returns popular/recent products from the same category.
    
    Args:
        db: MongoDB database connection (kept for backward compatibility, not used)
        target_product: Target product document
        limit: Number of fallback products to return
        
    Returns:
        List of fallback product documents
    """
    try:
        from .product_api_client import get_all_active_products
        
        # Extract target category fields
        target_article_type = target_product.get('articleType')
        target_master_category = target_product.get('masterCategory')
        target_sub_category = target_product.get('subCategory')
        
        # Fallback to categoryId if not in root
        if not target_article_type and not target_master_category and not target_sub_category:
            category_info = target_product.get('categoryId', {})
            if isinstance(category_info, dict):
                target_article_type = category_info.get('articleType')
                target_master_category = category_info.get('masterCategory')
                target_sub_category = category_info.get('subCategory')
        
        # Get all products and filter by category
        all_products = get_all_active_products(db)
        filtered_products = []
        
        target_id = str(target_product.get('_id', ''))
        
        for product in all_products:
            # Skip target product
            if str(product.get('_id', '')) == target_id:
                continue
            
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
                filtered_products.append(product)
        
        # Sort by creation date (newer first)
        filtered_products.sort(key=lambda p: p.get('createdAt', ''), reverse=True)
        
        return filtered_products[:limit]
        
    except Exception as e:
        logger.error(f"Error getting fallback products: {e}")
        return []


def format_recommendation_response(
    products_with_scores: List[Tuple[Dict, float]],
    target_product: Optional[Dict] = None
) -> Dict:
    """
    Format recommendation results for API response.
    
    Args:
        products_with_scores: List of (product, similarity_score) tuples
        target_product: Optional target product document
        
    Returns:
        Formatted response dict
    """
    from .db_helper import serialize_product
    
    recommendations = []
    for product, score in products_with_scores:
        recommendations.append({
            'product': serialize_product(product),
            'similarity': round(score, 4)
        })
    
    response = {
        'recommendations': recommendations,
        'count': len(recommendations)
    }
    
    if target_product:
        response['targetProduct'] = serialize_product(target_product)
    
    return response