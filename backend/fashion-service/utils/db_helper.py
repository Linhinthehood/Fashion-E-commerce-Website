# utils/db_helper.py
"""
Database helper functions for fashion recommendation service.
Handles all MongoDB operations and data retrieval.
"""

from bson import ObjectId
from typing import List, Dict, Optional, Any
import logging

logger = logging.getLogger(__name__)


def safe_object_id(id_value: Any) -> Optional[ObjectId]:
    """
    Safely convert various ID formats to ObjectId.
    
    Args:
        id_value: Can be string, ObjectId, or dict with '$oid'
        
    Returns:
        ObjectId or None if conversion fails
    """
    try:
        if isinstance(id_value, ObjectId):
            return id_value
        if isinstance(id_value, dict) and "$oid" in id_value:
            return ObjectId(id_value["$oid"])
        if isinstance(id_value, str):
            return ObjectId(id_value)
        return None
    except Exception as e:
        logger.warning(f"Failed to convert to ObjectId: {id_value}, error: {e}")
        return None


def safe_id_to_string(id_value: Any) -> str:
    """
    Convert ObjectId to string for JSON serialization.
    
    Args:
        id_value: ObjectId, string, or dict
        
    Returns:
        String representation of ID
    """
    if isinstance(id_value, ObjectId):
        return str(id_value)
    if isinstance(id_value, dict) and "$oid" in id_value:
        return id_value["$oid"]
    return str(id_value)


def get_product_by_id(db, product_id: str) -> Optional[Dict]:
    """
    Fetch a single product by ID with populated category information.
    
    Args:
        db: MongoDB database connection
        product_id: Product ID as string
        
    Returns:
        Product document with populated category, or None if not found
    """
    try:
        products_coll = db.get_collection('products')
        categories_coll = db.get_collection('categories')
        
        # Convert string ID to ObjectId
        oid = safe_object_id(product_id)
        if not oid:
            logger.error(f"Invalid product ID format: {product_id}")
            return None
        
        # Fetch product
        product = products_coll.find_one({'_id': oid, 'isActive': True})
        if not product:
            logger.warning(f"Product not found: {product_id}")
            return None
        
        # Populate category if it's an ObjectId reference
        if isinstance(product.get('categoryId'), ObjectId):
            category = categories_coll.find_one({'_id': product['categoryId']})
            if category:
                product['categoryId'] = category
        
        return product
        
    except Exception as e:
        logger.error(f"Error fetching product {product_id}: {e}")
        return None


def get_products_by_category(db, category_id: str, limit: Optional[int] = None) -> List[Dict]:
    """
    Fetch all active products in a specific category.
    
    Args:
        db: MongoDB database connection
        category_id: Category ID as string
        limit: Optional limit on number of results
        
    Returns:
        List of product documents
    """
    try:
        products_coll = db.get_collection('products')
        
        # Convert to ObjectId
        cat_oid = safe_object_id(category_id)
        if not cat_oid:
            logger.error(f"Invalid category ID: {category_id}")
            return []
        
        # Query
        query = {'categoryId': cat_oid, 'isActive': True}
        cursor = products_coll.find(query)
        
        if limit:
            cursor = cursor.limit(limit)
        
        products = list(cursor)
        
        # Populate categories for all products
        products = populate_category_info(db, products)
        
        return products
        
    except Exception as e:
        logger.error(f"Error fetching products by category {category_id}: {e}")
        return []


def get_all_active_products(db, category_filter: Optional[str] = None) -> List[Dict]:
    """
    Fetch all active products, optionally filtered by category.
    
    Args:
        db: MongoDB database connection
        category_filter: Optional category ID to filter by
        
    Returns:
        List of product documents with populated categories
    """
    try:
        products_coll = db.get_collection('products')
        
        # Build query
        query = {'isActive': True}
        
        if category_filter:
            cat_oid = safe_object_id(category_filter)
            if cat_oid:
                query['categoryId'] = cat_oid
        
        # Fetch products
        products = list(products_coll.find(query))
        
        # Populate categories
        products = populate_category_info(db, products)
        
        logger.info(f"Fetched {len(products)} active products")
        return products
        
    except Exception as e:
        logger.error(f"Error fetching all products: {e}")
        return []


def populate_category_info(db, products: List[Dict]) -> List[Dict]:
    """
    Populate category information for a list of products.
    Converts ObjectId references to full category documents.
    
    Args:
        db: MongoDB database connection
        products: List of product documents
        
    Returns:
        Products with populated categoryId field
    """
    try:
        categories_coll = db.get_collection('categories')
        
        # Collect unique category IDs that need population
        category_ids = set()
        for p in products:
            cat_id = p.get('categoryId')
            if isinstance(cat_id, ObjectId):
                category_ids.add(cat_id)
        
        # Fetch all categories in one query
        categories = {}
        if category_ids:
            for cat in categories_coll.find({'_id': {'$in': list(category_ids)}}):
                categories[cat['_id']] = cat
        
        # Populate each product
        for product in products:
            cat_id = product.get('categoryId')
            if isinstance(cat_id, ObjectId) and cat_id in categories:
                product['categoryId'] = categories[cat_id]
        
        return products
        
    except Exception as e:
        logger.error(f"Error populating categories: {e}")
        return products


def get_products_by_ids(db, product_ids: List[str]) -> List[Dict]:
    """
    Batch fetch multiple products by their IDs.
    
    Args:
        db: MongoDB database connection
        product_ids: List of product ID strings
        
    Returns:
        List of product documents with populated categories
    """
    try:
        products_coll = db.get_collection('products')
        
        # Convert all IDs to ObjectId
        oids = []
        for pid in product_ids:
            oid = safe_object_id(pid)
            if oid:
                oids.append(oid)
        
        if not oids:
            return []
        
        # Fetch products
        products = list(products_coll.find({
            '_id': {'$in': oids},
            'isActive': True
        }))
        
        # Populate categories
        products = populate_category_info(db, products)
        
        return products
        
    except Exception as e:
        logger.error(f"Error batch fetching products: {e}")
        return []


def get_product_images(product: Dict) -> List[str]:
    """
    Safely extract image URLs from a product document.
    
    Args:
        product: Product document
        
    Returns:
        List of image URLs (may be empty)
    """
    images = product.get('images', [])
    if not isinstance(images, list):
        return []
    return [img for img in images if isinstance(img, str) and img.strip()]


def get_first_image(product: Dict) -> Optional[str]:
    """
    Get the first image URL from a product.
    
    Args:
        product: Product document
        
    Returns:
        First image URL or None
    """
    images = get_product_images(product)
    return images[0] if images else None


def get_category_info(product: Dict) -> Dict[str, str]:
    """
    Extract category information from a product document.
    Handles both populated and unpopulated categoryId.
    
    Args:
        product: Product document
        
    Returns:
        Dict with masterCategory, subCategory, articleType
    """
    category_id = product.get('categoryId')
    
    # If categoryId is already populated as a dict
    if isinstance(category_id, dict):
        return {
            'masterCategory': category_id.get('masterCategory', 'Unknown'),
            'subCategory': category_id.get('subCategory', 'Unknown'),
            'articleType': category_id.get('articleType', 'Unknown'),
            'categoryId': safe_id_to_string(category_id.get('_id', ''))
        }
    
    # If categoryId is just an ObjectId (not populated)
    return {
        'masterCategory': 'Unknown',
        'subCategory': 'Unknown',
        'articleType': 'Unknown',
        'categoryId': safe_id_to_string(category_id) if category_id else ''
    }


def serialize_product(product: Dict) -> Dict:
    """
    Convert product document to JSON-serializable format.
    Converts all ObjectId fields to strings.
    
    Args:
        product: Product document from MongoDB
        
    Returns:
        JSON-serializable product dict
    """
    if not product:
        return {}
    
    # Clone product to avoid modifying original
    result = product.copy()
    
    # Convert _id
    if '_id' in result:
        result['_id'] = safe_id_to_string(result['_id'])
    
    # Convert categoryId if it's populated
    if 'categoryId' in result and isinstance(result['categoryId'], dict):
        if '_id' in result['categoryId']:
            result['categoryId']['_id'] = safe_id_to_string(result['categoryId']['_id'])
    elif 'categoryId' in result:
        result['categoryId'] = safe_id_to_string(result['categoryId'])
    
    return result


def get_products_by_master_category(db, master_category: str) -> List[Dict]:
    """
    Fetch products by master category (e.g., "Apparel", "Footwear", "Accessories").
    
    Args:
        db: MongoDB database connection
        master_category: Master category name
        
    Returns:
        List of product documents
    """
    try:
        products_coll = db.get_collection('products')
        categories_coll = db.get_collection('categories')
        
        # Find all categories with this master category
        category_ids = [
            cat['_id'] 
            for cat in categories_coll.find({'masterCategory': master_category})
        ]
        
        if not category_ids:
            return []
        
        # Fetch products in these categories
        products = list(products_coll.find({
            'categoryId': {'$in': category_ids},
            'isActive': True
        }))
        
        # Populate categories
        products = populate_category_info(db, products)
        
        return products
        
    except Exception as e:
        logger.error(f"Error fetching products by master category {master_category}: {e}")
        return []


def get_products_by_filters(db, filters: Dict[str, Any]) -> List[Dict]:
    """
    Fetch products with multiple filter criteria.
    
    Args:
        db: MongoDB database connection
        filters: Dict with filter criteria (gender, usage, brand, color, etc.)
        
    Returns:
        List of matching product documents
    """
    try:
        products_coll = db.get_collection('products')
        
        # Build query from filters
        query = {'isActive': True}
        
        if 'gender' in filters and filters['gender']:
            query['gender'] = {'$in': [filters['gender'], 'Unisex']}
        
        if 'usage' in filters and filters['usage']:
            query['usage'] = filters['usage']
        
        if 'brand' in filters and filters['brand']:
            query['brand'] = filters['brand']
        
        if 'color' in filters and filters['color']:
            query['color'] = filters['color']
        
        if 'categoryId' in filters and filters['categoryId']:
            cat_oid = safe_object_id(filters['categoryId'])
            if cat_oid:
                query['categoryId'] = cat_oid
        
        # Price range filter
        if 'minPrice' in filters or 'maxPrice' in filters:
            query['defaultPrice'] = {}
            if 'minPrice' in filters:
                query['defaultPrice']['$gte'] = filters['minPrice']
            if 'maxPrice' in filters:
                query['defaultPrice']['$lte'] = filters['maxPrice']
        
        # Fetch products
        products = list(products_coll.find(query))
        
        # Populate categories
        products = populate_category_info(db, products)
        
        return products
        
    except Exception as e:
        logger.error(f"Error fetching products with filters {filters}: {e}")
        return []