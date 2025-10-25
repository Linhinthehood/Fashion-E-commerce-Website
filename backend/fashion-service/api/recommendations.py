"""
Recommendation API for Fashion Recommender System
Centralized interface for all recommendation and personalization functions
"""

import numpy as np
from typing import List, Tuple, Optional, Dict, Any

from ..user.profile_manager import UserProfileManager
from ..user.history import save_query, get_recent_embedding, get_top_items, get_top_queries
from ..user.analytics import UserProfileBuilder
from ..models.similarity import search


class RecommendationEngine:
    """
    Central recommendation engine that combines all personalization features
    """
    
    def __init__(self, model=None, processor=None, config=None):
        self.model = model
        self.processor = processor 
        self.config = config
        self.profile_manager = UserProfileManager()
        self.profile_builder = UserProfileBuilder() if model else None
        
    def get_personalized_recommendations(
        self, 
        user_id: str, 
        gallery_embeddings: np.ndarray,
        gallery_paths: List[str],
        top_k: int = 10,
        include_recent: bool = True
    ) -> List[Tuple[float, str]]:
        """
        Get personalized recommendations for a user
        
        Args:
            user_id: User identifier
            gallery_embeddings: Pre-computed gallery embeddings
            gallery_paths: Corresponding image paths
            top_k: Number of recommendations to return
            include_recent: Whether to avoid recently viewed items
            
        Returns:
            List of (similarity_score, image_path) tuples
        """
        try:
            # Try to get recommendations from user profile
            recommendations = self.profile_manager.recommend_items_for_user(
                user_id, gallery_embeddings, gallery_paths, top_k
            )
            
            if recommendations:
                return recommendations
                
        except Exception as e:
            print(f"Profile-based recommendations failed: {e}")
        
        # Fallback: Use recent embeddings to create recommendations
        try:
            recent_embeddings = get_recent_embedding(user_id, n=5)
            if recent_embeddings:
                # Average recent embeddings to create user preference vector
                user_vector = np.mean(recent_embeddings, axis=0)
                
                # Compute similarities
                similarities = np.dot(gallery_embeddings, user_vector)
                top_indices = np.argsort(similarities)[::-1][:top_k]
                
                recommendations = []
                for idx in top_indices:
                    score = similarities[idx]
                    path = gallery_paths[idx]
                    recommendations.append((score, path))
                    
                return recommendations
                
        except Exception as e:
            print(f"History-based recommendations failed: {e}")
        
        # Final fallback: Return popular items
        return self.get_popular_recommendations(top_k)
    
    def get_popular_recommendations(self, top_k: int = 10) -> List[Tuple[float, str]]:
        """
        Get recommendations based on globally popular items
        """
        try:
            popular_items = get_top_items(top_k)
            # Convert to expected format (score, path)
            return [(1.0, item) for item in popular_items]
        except:
            return []
    
    def get_similar_user_recommendations(
        self, 
        user_id: str, 
        gallery_embeddings: np.ndarray,
        gallery_paths: List[str],
        top_k: int = 10
    ) -> List[Tuple[float, str]]:
        """
        Get recommendations based on similar users' preferences
        """
        try:
            similar_users = self.profile_manager.find_similar_users(user_id, top_k=3)
            
            # Collect items liked by similar users
            recommended_items = set()
            
            for similar_user_id, similarity in similar_users:
                # Get recent items for similar user
                similar_user_embeddings = get_recent_embedding(similar_user_id, n=3)
                if similar_user_embeddings:
                    # Find items similar to what this user likes
                    user_vector = np.mean(similar_user_embeddings, axis=0)
                    similarities = np.dot(gallery_embeddings, user_vector)
                    top_indices = np.argsort(similarities)[::-1][:5]
                    
                    for idx in top_indices:
                        recommended_items.add((similarities[idx], gallery_paths[idx]))
            
            # Sort by similarity and return top_k
            recommendations = sorted(recommended_items, key=lambda x: x[0], reverse=True)
            return recommendations[:top_k]
            
        except Exception as e:
            print(f"Similar user recommendations failed: {e}")
            return []
    
    def get_hybrid_recommendations(
        self,
        user_id: str,
        query_text: Optional[str] = None,
        query_embedding: Optional[np.ndarray] = None,
        gallery_embeddings: np.ndarray = None,
        gallery_paths: List[str] = None,
        top_k: int = 10,
        personalization_weight: float = 0.6
    ) -> List[Tuple[float, str]]:
        """
        Get hybrid recommendations combining search results with personalization
        
        Args:
            user_id: User identifier
            query_text: Optional text query
            query_embedding: Optional pre-computed query embedding
            gallery_embeddings: Gallery embeddings
            gallery_paths: Gallery image paths
            top_k: Number of results
            personalization_weight: Weight for personalization (0-1)
            
        Returns:
            List of (combined_score, image_path) tuples
        """
        search_results = []
        personal_results = []
        
        # Get search-based results if query provided
        if query_text and self.model:
            try:
                search_results = search(
                    model=self.model,
                    processor=self.processor,
                    query_text=query_text,
                    k=top_k * 2,  # Get more results for blending
                    device=self.config.get('device', 'cpu'),
                    cfg=self.config,
                    npz_path=None,  # Use provided embeddings
                    index_path=None,
                    images_dir=None,
                    embeddings=gallery_embeddings,
                    paths=gallery_paths
                )
            except Exception as e:
                print(f"Search failed: {e}")
        
        # Get personalized results
        try:
            personal_results = self.get_personalized_recommendations(
                user_id, gallery_embeddings, gallery_paths, top_k * 2
            )
        except Exception as e:
            print(f"Personalization failed: {e}")
        
        # Combine results
        if not search_results and not personal_results:
            return self.get_popular_recommendations(top_k)
        
        if not search_results:
            return personal_results[:top_k]
        
        if not personal_results:
            return search_results[:top_k]
        
        # Blend search and personal results
        combined_scores = {}
        
        # Add search results
        for i, (score, path) in enumerate(search_results):
            # Normalize score based on ranking
            normalized_score = (len(search_results) - i) / len(search_results)
            combined_scores[path] = (1 - personalization_weight) * normalized_score
        
        # Add personal results
        for i, (score, path) in enumerate(personal_results):
            # Normalize score based on ranking
            normalized_score = (len(personal_results) - i) / len(personal_results)
            if path in combined_scores:
                combined_scores[path] += personalization_weight * normalized_score
            else:
                combined_scores[path] = personalization_weight * normalized_score
        
        # Sort by combined score and return top_k
        final_results = sorted(
            combined_scores.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        return [(score, path) for path, score in final_results[:top_k]]
    
    def track_user_interaction(
        self, 
        user_id: str, 
        interaction_type: str, 
        query_text: Optional[str] = None,
        item_path: Optional[str] = None,
        embedding: Optional[np.ndarray] = None
    ):
        """
        Track user interaction for future recommendations
        
        Args:
            user_id: User identifier
            interaction_type: "search", "click", "purchase", etc.
            query_text: Search query if applicable
            item_path: Item path if applicable
            embedding: Associated embedding vector
        """
        try:
            save_query(
                user_id=user_id,
                query_type=interaction_type,
                query_text=query_text,
                product_id=item_path,
                embedding=embedding
            )
        except Exception as e:
            print(f"Failed to track interaction: {e}")
    
    def get_user_analytics(self, user_id: str) -> Dict[str, Any]:
        """
        Get comprehensive user analytics and preferences
        """
        try:
            return self.profile_manager.get_profile_summary(user_id)
        except Exception as e:
            print(f"Failed to get user analytics: {e}")
            return {}
    
    def rebuild_user_profiles(self, history_path: str = None):
        """
        Rebuild all user profiles from interaction history
        """
        if self.profile_builder:
            try:
                history_path = history_path or "data/history.json"
                self.profile_builder.build_user_profiles(history_path)
                # Reload the profile manager to get updated profiles
                self.profile_manager = UserProfileManager()
            except Exception as e:
                print(f"Failed to rebuild profiles: {e}")