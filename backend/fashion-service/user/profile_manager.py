# user_profile_manager.py
"""
User Profile Manager for Fashion Recommendation System
Load, query, and update user profiles for recommendations
"""

import os
import json
import numpy as np
from datetime import datetime
import faiss
from pathlib import Path

from ..config.config import config

class UserProfileManager:
    """Manage user profiles for recommendation system"""
    
    def __init__(self, profiles_dir=None):
        self.profiles_dir = profiles_dir or str(config.PROJECT_ROOT / "data")
        self.profiles_json_path = str(Path(self.profiles_dir) / 'user_profiles.json')
        self.profiles_npz_path = str(Path(self.profiles_dir) / 'user_profiles.npz')
        
        # Load profiles
        self.user_profiles = {}
        self.user_embeddings = {}
        self.user_ids = []
        
        self._load_profiles()
    
    def _load_profiles(self):
        """Load user profiles from files"""
        # Load metadata
        if os.path.exists(self.profiles_json_path):
            with open(self.profiles_json_path, 'r', encoding='utf-8') as f:
                self.user_profiles = json.load(f)
            print(f"✅ Loaded {len(self.user_profiles)} user profiles")
        else:
            print("⚠️ No user profiles found")
            return
        
        # Load embeddings
        if os.path.exists(self.profiles_npz_path):
            npz_data = np.load(self.profiles_npz_path, allow_pickle=True)
            self.user_ids = list(npz_data['user_ids'])
            embeddings = npz_data['embeddings']
            
            # Create user_id -> embedding mapping
            for user_id, embedding in zip(self.user_ids, embeddings):
                self.user_embeddings[user_id] = embedding
            
            print(f"✅ Loaded {len(self.user_embeddings)} user embeddings")
        else:
            print("⚠️ No user embeddings found")
    
    def get_user_profile(self, user_id):
        """Get profile metadata for a user"""
        return self.user_profiles.get(user_id)
    
    def get_user_embedding(self, user_id):
        """Get profile embedding for a user"""
        return self.user_embeddings.get(user_id)
    
    def get_user_preferences(self, user_id):
        """Get user's top search terms and preferences"""
        profile = self.get_user_profile(user_id)
        if profile:
            return profile.get('top_search_terms', {})
        return {}
    
    def find_similar_users(self, user_id, top_k=5):
        """Find users with similar profiles using cosine similarity"""
        user_embedding = self.get_user_embedding(user_id)
        if user_embedding is None:
            return []
        
        similarities = []
        for other_user_id, other_embedding in self.user_embeddings.items():
            if other_user_id != user_id:
                # Cosine similarity
                similarity = np.dot(user_embedding, other_embedding) / (
                    np.linalg.norm(user_embedding) * np.linalg.norm(other_embedding) + 1e-8
                )
                similarities.append((other_user_id, float(similarity)))
        
        # Sort by similarity and return top k
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]
    
    def recommend_items_for_user(self, user_id, gallery_embeddings, gallery_paths, top_k=10):
        """Recommend items based on user profile"""
        user_embedding = self.get_user_embedding(user_id)
        if user_embedding is None:
            return []
        
        # Use FAISS for efficient similarity search
        d = gallery_embeddings.shape[1]
        index = faiss.IndexFlatIP(d)  # Inner product for cosine similarity
        index.add(gallery_embeddings.astype('float32'))
        
        # Search for more items than needed to account for duplicates
        search_k = min(top_k * 3, len(gallery_paths))  # Get 3x more results to filter
        user_query = user_embedding.reshape(1, -1).astype('float32')
        similarities, indices = index.search(user_query, search_k)
        
        # Remove duplicates and build recommendations
        recommendations = []
        seen_items = set()
        
        for idx, sim in zip(indices[0], similarities[0]):
            if idx < len(gallery_paths):
                item_path = gallery_paths[idx]
                item_name = os.path.basename(item_path)
                item_id = os.path.splitext(item_name)[0]
                
                # Skip if we've already seen this item
                if item_id not in seen_items:
                    seen_items.add(item_id)
                    recommendations.append({
                        'item_path': item_path,
                        'item_name': item_name,
                        'similarity_score': float(sim),
                        'item_id': item_id
                    })
                    
                    # Stop when we have enough unique recommendations
                    if len(recommendations) >= top_k:
                        break
        
        return recommendations
    
    def get_profile_summary(self, user_id):
        """Get a human-readable summary of user profile"""
        profile = self.get_user_profile(user_id)
        if not profile:
            return f"No profile found for user {user_id}"
        
        summary = f"""
👤 User Profile: {user_id}
📅 Created: {profile['profile_created'][:10]}
📊 Profile Type: {profile['profile_type']}
🔍 Total Searches: {profile['num_searches']}
🛒 Total Clicks: {profile['num_clicks']}
🏷️ Top Interests: {', '.join(list(profile['top_search_terms'].keys())[:5])}
🔢 Embedding Dimension: {profile['embedding_dim']}
"""
        return summary.strip()
    
    def list_all_users(self):
        """List all users with profiles"""
        return list(self.user_profiles.keys())
    
    def get_system_stats(self):
        """Get overall system statistics"""
        if not self.user_profiles:
            return "No user profiles available"
        
        total_users = len(self.user_profiles)
        total_searches = sum(p['num_searches'] for p in self.user_profiles.values())
        total_clicks = sum(p['num_clicks'] for p in self.user_profiles.values())
        
        profile_types = {}
        for profile in self.user_profiles.values():
            ptype = profile['profile_type']
            profile_types[ptype] = profile_types.get(ptype, 0) + 1
        
        return f"""
📊 System Statistics:
👥 Total Users: {total_users}
🔍 Total Searches: {total_searches}
🛒 Total Clicks: {total_clicks}
📈 Avg Searches/User: {total_searches/total_users:.1f}
📊 Profile Types: {dict(profile_types)}
"""

def main():
    """Demonstration of user profile management"""
    # Load profile manager
    manager = UserProfileManager()
    
    if not manager.user_profiles:
        print("❌ No user profiles found. Run user_profile_builder.py first.")
        return
    
    print("🎯 User Profile Manager Demo")
    print("=" * 50)
    
    # System stats
    print(manager.get_system_stats())
    
    # Profile details for each user
    for user_id in manager.list_all_users():
        print("\n" + "="*50)
        print(manager.get_profile_summary(user_id))
        
        # Show top preferences
        preferences = manager.get_user_preferences(user_id)
        if preferences:
            print(f"\n🎯 Interest Analysis:")
            for term, count in list(preferences.items())[:5]:
                print(f"  {term}: {count} searches")
        
        # Find similar users (if multiple users exist)
        if len(manager.user_profiles) > 1:
            similar_users = manager.find_similar_users(user_id, top_k=3)
            if similar_users:
                print(f"\n👥 Similar Users:")
                for sim_user, similarity in similar_users:
                    print(f"  {sim_user}: {similarity:.3f} similarity")
    
    # Demo recommendation (you'll need to load gallery data)
    print("\n" + "="*50)
    print("💡 To get item recommendations, use:")
    print("   manager.recommend_items_for_user(user_id, gallery_embeddings, gallery_paths)")

if __name__ == "__main__":
    main()