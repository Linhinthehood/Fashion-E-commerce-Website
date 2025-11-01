# utils/product_api_client.py
"""
HTTP API client for Product Service.
Replaces direct MongoDB access with API calls.
"""

import os
import requests
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# Get Product Service URL from environment
PRODUCT_SERVICE_URL = os.getenv('PRODUCT_SERVICE_URL', 'http://localhost:3002')


class ProductAPIClient:
    """Client for interacting with Product Service API"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or PRODUCT_SERVICE_URL
        self.timeout = 10  # seconds
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Optional[Dict]:
        """
        Make HTTP request to Product Service.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            **kwargs: Additional request parameters
            
        Returns:
            Response JSON or None on error
        """
        url = f"{self.base_url}{endpoint}"
        try:
            response = requests.request(
                method=method,
                url=url,
                timeout=self.timeout,
                **kwargs
            )
            response.raise_for_status()
            data = response.json()
            
            # Handle nested response structure: {success: true, data: {...}}
            if isinstance(data, dict) and 'data' in data:
                return data['data']
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {method} {url}, error: {e}")
            return None
        except ValueError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            return None
    
    def get_product_by_id(self, product_id: str) -> Optional[Dict]:
        """
        Fetch a single product by ID.
        
        Args:
            product_id: Product ID as string
            
        Returns:
            Product document or None if not found
        """
        endpoint = f"/api/products/{product_id}"
        data = self._make_request('GET', endpoint)
        
        # Extract product from nested structure if needed
        if isinstance(data, dict) and 'product' in data:
            return data['product']
        return data
    
    def get_all_active_products(self) -> List[Dict]:
        """
        Fetch all active products.
        
        Returns:
            List of product documents
        """
        # Product Service has default limit=12, so we pass limit=1000 to get all products
        endpoint = "/api/products?limit=1000"
        data = self._make_request('GET', endpoint)
        
        # Handle various response structures
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and 'products' in data:
            return data['products']
        if isinstance(data, dict) and 'data' in data:
            if isinstance(data['data'], list):
                return data['data']
            if isinstance(data['data'], dict) and 'products' in data['data']:
                return data['data']['products']
        
        logger.warning(f"Unexpected response structure for get_all_active_products: {type(data)}")
        return []
    
    def get_products_by_category(self, category_id: str, limit: Optional[int] = None) -> List[Dict]:
        """
        Fetch products in a specific category.
        
        Args:
            category_id: Category ID as string
            limit: Maximum number of products to return
            
        Returns:
            List of product documents
        """
        endpoint = f"/api/products?categoryId={category_id}"
        if limit:
            endpoint += f"&limit={limit}"
        
        data = self._make_request('GET', endpoint)
        
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and 'products' in data:
            return data['products']
        
        return []
    
    def search_products(self, query: Dict) -> List[Dict]:
        """
        Search products with filters.
        
        Args:
            query: Search filters (e.g., {gender: 'Male', usage: 'Sports'})
            
        Returns:
            List of matching products
        """
        endpoint = "/api/products/search"
        data = self._make_request('POST', endpoint, json=query)
        
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and 'products' in data:
            return data['products']
        
        return []


# Global client instance
_client = None


def get_client() -> ProductAPIClient:
    """Get or create global ProductAPIClient instance"""
    global _client
    if _client is None:
        _client = ProductAPIClient()
    return _client


# Convenience functions that match old db_helper API
def get_product_by_id(db, product_id: str) -> Optional[Dict]:
    """
    Fetch product by ID using API (replaces MongoDB version).
    Note: 'db' parameter kept for backward compatibility but not used.
    """
    client = get_client()
    return client.get_product_by_id(product_id)


def get_all_active_products(db) -> List[Dict]:
    """
    Fetch all active products using API (replaces MongoDB version).
    Note: 'db' parameter kept for backward compatibility but not used.
    """
    client = get_client()
    return client.get_all_active_products()


def get_products_by_category(db, category_id: str, limit: Optional[int] = None) -> List[Dict]:
    """
    Fetch products by category using API (replaces MongoDB version).
    Note: 'db' parameter kept for backward compatibility but not used.
    """
    client = get_client()
    return client.get_products_by_category(category_id, limit)
