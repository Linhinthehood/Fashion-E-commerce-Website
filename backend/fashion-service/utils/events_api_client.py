# utils/events_api_client.py
"""
HTTP API client for Order Service (Events/Analytics APIs).
Used to fetch popularity scores and user affinity for hybrid recommendation scoring.
Includes Redis caching for improved performance.
"""

import os
import json
import requests
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# Get Order Service URL from environment (via API Gateway or direct)
ORDER_SERVICE_URL = os.getenv('ORDER_SERVICE_URL', 'http://localhost:3003')
API_GATEWAY_URL = os.getenv('API_GATEWAY_URL', 'http://localhost:3000')

# Use API Gateway if available, otherwise direct to order-service
BASE_URL = API_GATEWAY_URL if os.getenv('USE_API_GATEWAY', 'true').lower() == 'true' else ORDER_SERVICE_URL

# Redis configuration
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_DB = int(os.getenv('REDIS_DB', 0))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', None)
REDIS_ENABLED = os.getenv('REDIS_ENABLED', 'true').lower() == 'true'

# Cache TTL (Time To Live) in seconds
POPULARITY_CACHE_TTL = int(os.getenv('POPULARITY_CACHE_TTL', 3600))  # 1 hour
AFFINITY_CACHE_TTL = int(os.getenv('AFFINITY_CACHE_TTL', 1800))  # 30 minutes

# Try to import and initialize Redis
_redis_client = None
try:
    import redis
    if REDIS_ENABLED:
        _redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            db=REDIS_DB,
            password=REDIS_PASSWORD,
            decode_responses=True,  # Automatically decode bytes to strings
            socket_connect_timeout=2,
            socket_timeout=2
        )
        # Test connection
        _redis_client.ping()
        logger.info(f"Redis connected: {REDIS_HOST}:{REDIS_PORT}")
    else:
        logger.info("Redis disabled (REDIS_ENABLED=false)")
except ImportError:
    logger.warning("redis package not installed, caching disabled")
    _redis_client = None
except Exception as e:
    logger.warning(f"Redis connection failed: {e}, falling back to API-only mode")
    _redis_client = None


def get_redis_client():
    """Get Redis client instance"""
    return _redis_client


class EventsAPIClient:
    """Client for interacting with Order Service Events/Analytics API with Redis caching"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or BASE_URL
        self.timeout = 5  # seconds (short timeout for recommendations)
        self.redis = get_redis_client()
    
    def _cache_key_popularity(self, limit: int, start_date: Optional[str], end_date: Optional[str]) -> str:
        """Generate cache key for popularity scores"""
        date_key = f"{start_date or 'all'}_{end_date or 'all'}"
        return f"popularity:scores:limit_{limit}:{date_key}"
    
    def _cache_key_affinity(self, user_id: str, limit: int, start_date: Optional[str], end_date: Optional[str]) -> str:
        """Generate cache key for user affinity"""
        date_key = f"{start_date or 'all'}_{end_date or 'all'}"
        return f"affinity:user:{user_id}:limit_{limit}:{date_key}"
    
    def _get_from_cache(self, key: str) -> Optional[Dict]:
        """Get data from Redis cache"""
        if not self.redis:
            return None
        try:
            cached = self.redis.get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.debug(f"Cache get failed for key {key}: {e}")
        return None
    
    def _set_to_cache(self, key: str, value: Dict, ttl: int):
        """Store data in Redis cache with TTL"""
        if not self.redis:
            return
        try:
            self.redis.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.debug(f"Cache set failed for key {key}: {e}")
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Optional[Dict]:
        """
        Make HTTP request to Order Service (via API Gateway or direct).
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path (e.g., '/api/events/aggregates/popularity')
            **kwargs: Additional request parameters
            
        Returns:
            Response JSON data or None on error
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
            if isinstance(data, dict) and 'success' in data and 'data' in data:
                return data['data']
            if isinstance(data, dict) and 'data' in data:
                return data['data']
            return data
            
        except requests.exceptions.Timeout:
            logger.warning(f"Request timeout: {method} {url}")
            return None
        except requests.exceptions.RequestException as e:
            logger.warning(f"API request failed: {method} {url}, error: {e}")
            return None
        except ValueError as e:
            logger.warning(f"Failed to parse JSON response: {e}")
            return None
    
    def get_popularity_scores(
        self,
        limit: int = 200,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, float]:
        """
        Fetch popularity scores for products (with Redis caching).
        
        Args:
            limit: Maximum number of products to return
            start_date: Optional start date (ISO format: YYYY-MM-DD)
            end_date: Optional end date (ISO format: YYYY-MM-DD)
            
        Returns:
            Dict mapping itemId -> popularity score (float)
        """
        # Try to get from cache first
        cache_key = self._cache_key_popularity(limit, start_date, end_date)
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            logger.debug(f"Cache HIT for popularity scores: {cache_key}")
            return cached_data
        
        # Cache miss - fetch from API
        logger.debug(f"Cache MISS for popularity scores: {cache_key}")
        endpoint = f"/api/events/aggregates/popularity?limit={limit}"
        if start_date:
            endpoint += f"&startDate={start_date}"
        if end_date:
            endpoint += f"&endDate={end_date}"
        
        data = self._make_request('GET', endpoint)
        if not data or not isinstance(data, list):
            return {}
        
        # Parse response: [{itemId: "...", score: 123, counts: {...}}, ...]
        popularity_map = {}
        for item in data:
            item_id = item.get('itemId')
            score = item.get('score', 0.0)
            if item_id:
                popularity_map[str(item_id)] = float(score)
        
        # Store in cache
        if popularity_map:
            self._set_to_cache(cache_key, popularity_map, POPULARITY_CACHE_TTL)
        
        return popularity_map
    
    def get_user_affinity(
        self,
        user_id: str,
        limit: int = 500,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, float]:
        """
        Fetch user affinity scores (itemId -> affinity score) with Redis caching.
        
        Args:
            user_id: User ID
            limit: Maximum number of items to return
            start_date: Optional start date (ISO format: YYYY-MM-DD)
            end_date: Optional end date (ISO format: YYYY-MM-DD)
            
        Returns:
            Dict mapping itemId -> affinity score (float)
        """
        # Try to get from cache first
        cache_key = self._cache_key_affinity(user_id, limit, start_date, end_date)
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            logger.debug(f"Cache HIT for user affinity: {cache_key}")
            return cached_data
        
        # Cache miss - fetch from API
        logger.debug(f"Cache MISS for user affinity: {cache_key}")
        endpoint = f"/api/events/aggregates/affinity?userId={user_id}&limit={limit}"
        if start_date:
            endpoint += f"&startDate={start_date}"
        if end_date:
            endpoint += f"&endDate={end_date}"
        
        data = self._make_request('GET', endpoint)
        if not data or not isinstance(data, list):
            return {}
        
        # Parse response: [{itemId: "...", score: 123, counts: {...}}, ...]
        affinity_map = {}
        for item in data:
            item_id = item.get('itemId')
            score = item.get('score', 0.0)
            if item_id:
                affinity_map[str(item_id)] = float(score)
        
        # Store in cache
        if affinity_map:
            self._set_to_cache(cache_key, affinity_map, AFFINITY_CACHE_TTL)
        
        return affinity_map
    
    def get_category_affinity(
        self,
        user_id: str,
        categories: Optional[List[str]] = None
    ) -> Dict[str, float]:
        """
        Compute category-level affinity from user events.
        For now, we aggregate from item-level affinity.
        TODO: Implement dedicated category aggregation endpoint in order-service.
        
        Args:
            user_id: User ID
            categories: Optional list of category IDs to filter
            
        Returns:
            Dict mapping categoryId -> affinity score (float)
        """
        # Get user item affinity first
        item_affinity = self.get_user_affinity(user_id, limit=500)
        if not item_affinity:
            return {}
        
        # TODO: We need product data to map itemId -> categoryId
        # For now, return empty dict - will be enhanced when we have product data in context
        # This is a placeholder for future implementation
        return {}


# Global client instance
_client = None


def get_client() -> EventsAPIClient:
    """Get or create global EventsAPIClient instance"""
    global _client
    if _client is None:
        _client = EventsAPIClient()
    return _client

