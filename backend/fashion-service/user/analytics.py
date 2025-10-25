# user_profile_builder.py
"""
User Profile Builder for Fashion Recommendation System
Creates user embeddings from search history and interactions
"""

import os
import json
import numpy as np
from datetime import datetime
from collections import defaultdict, Counter
import torch

# Import your existing modules
from ..models.similarity import load_model, embed_text
from ..config.config import config

class UserProfileBuilder:
    """Build user profiles from search history and interactions"""
    
    def __init__(self, checkpoint_path=None):
        """Initialize with model for text embedding"""
        self.checkpoint_path = checkpoint_path or str(config.CHECKPOINT_BEST)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Load model for text embeddings
        print("🔄 Loading model for profile building...")
        self.model, self.processor, self.cfg = load_model(self.checkpoint_path, self.device)
        print("✅ Model loaded successfully")
        
        # Load gallery embeddings for item-based profiles
        self.gallery_embeddings = None
        self.gallery_paths = None
        self._load_gallery_embeddings()
    
    def _load_gallery_embeddings(self):
        """Load pre-computed gallery embeddings"""
        try:
            npz = np.load(str(config.GALLERY_EMBEDDINGS), allow_pickle=True)
            self.gallery_embeddings = npz["vecs"].astype("float32")
            self.gallery_paths = list(npz["paths"])
            print(f"✅ Loaded {len(self.gallery_embeddings)} gallery embeddings")
        except Exception as e:
            print(f"⚠️ Could not load gallery embeddings: {e}")
    
    def load_user_history(self, history_path):
        """Load user history from JSON file"""
        with open(history_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def extract_user_data(self, history_data):
        """Extract and organize data by user"""
        users_data = defaultdict(lambda: {
            'searches': [],
            'clicked_items': [],
            'timestamps': [],
            'search_patterns': Counter()
        })
        
        for entry in history_data:
            user_id = entry.get('user_id')
            if not user_id:
                continue
                
            query = entry.get('query', '').strip()
            clicked_item = entry.get('clicked_item')
            timestamp = entry.get('timestamp')
            
            # Store search data
            if query:
                users_data[user_id]['searches'].append(query)
                users_data[user_id]['timestamps'].append(timestamp)
                
                # Extract search patterns
                query_lower = query.lower()
                words = query_lower.split()
                for word in words:
                    if len(word) > 2:  # Skip very short words
                        users_data[user_id]['search_patterns'][word] += 1
            
            # Store clicked items
            if clicked_item:
                users_data[user_id]['clicked_items'].append(clicked_item)
        
        return dict(users_data)
    
    def build_search_based_profile(self, user_searches):
        """Build user profile from search queries using text embeddings"""
        if not user_searches:
            return None
            
        print(f"  📝 Processing {len(user_searches)} search queries...")
        embeddings = []
        
        for query in user_searches:
            try:
                # Skip image queries for text embedding
                if query.startswith('[IMAGE]'):
                    continue
                    
                # Get text embedding
                embedding = embed_text(self.model, self.processor, query, self.device, self.cfg)
                embeddings.append(embedding[0])  # embedding is shape (1, 256)
                
            except Exception as e:
                print(f"    ⚠️ Error embedding query '{query}': {e}")
                continue
        
        if not embeddings:
            return None
            
        # Average all search embeddings
        profile_embedding = np.mean(embeddings, axis=0)
        
        # L2 normalize
        profile_embedding = profile_embedding / (np.linalg.norm(profile_embedding) + 1e-8)
        
        return profile_embedding.astype('float32')
    
    def build_item_based_profile(self, clicked_items):
        """Build user profile from clicked/purchased items"""
        if not clicked_items or not self.gallery_embeddings:
            return None
            
        embeddings = []
        
        for item_id in clicked_items:
            try:
                # Find item in gallery (assuming item_id matches filename)
                item_indices = [i for i, path in enumerate(self.gallery_paths) 
                               if item_id in os.path.basename(path)]
                
                if item_indices:
                    # Use the first match
                    item_embedding = self.gallery_embeddings[item_indices[0]]
                    embeddings.append(item_embedding)
                    
            except Exception as e:
                print(f"    ⚠️ Error getting embedding for item '{item_id}': {e}")
                continue
        
        if not embeddings:
            return None
            
        # Average all item embeddings
        profile_embedding = np.mean(embeddings, axis=0)
        
        # L2 normalize
        profile_embedding = profile_embedding / (np.linalg.norm(profile_embedding) + 1e-8)
        
        return profile_embedding.astype('float32')
    
    def build_hybrid_profile(self, search_embedding, item_embedding, search_weight=0.7):
        """Combine search-based and item-based profiles"""
        if search_embedding is None and item_embedding is None:
            return None
        elif search_embedding is None:
            return item_embedding
        elif item_embedding is None:
            return search_embedding
        else:
            # Weighted combination
            hybrid = search_weight * search_embedding + (1 - search_weight) * item_embedding
            # L2 normalize
            hybrid = hybrid / (np.linalg.norm(hybrid) + 1e-8)
            return hybrid.astype('float32')
    
    def build_user_profiles(self, history_path, output_dir=None):
        """Main function to build all user profiles"""
        if output_dir is None:
            output_dir = str(config.PROJECT_ROOT / "data")
            
        print("🔄 Building user profiles from history...")
        
        # Load history
        history_data = self.load_user_history(history_path)
        print(f"📊 Loaded {len(history_data)} history entries")
        
        # Extract user data
        users_data = self.extract_user_data(history_data)
        print(f"👥 Found {len(users_data)} unique users")
        
        # Build profiles
        user_profiles = {}
        profile_embeddings = {}
        
        for user_id, user_data in users_data.items():
            print(f"\n🔄 Building profile for user: {user_id}")
            
            # Build search-based profile
            search_profile = self.build_search_based_profile(user_data['searches'])
            
            # Build item-based profile (if clicks available)
            item_profile = self.build_item_based_profile(user_data['clicked_items'])
            
            # Create hybrid profile
            final_profile = self.build_hybrid_profile(search_profile, item_profile)
            
            if final_profile is not None:
                # Store metadata
                user_profiles[user_id] = {
                    'user_id': user_id,
                    'profile_created': datetime.now().isoformat(),
                    'num_searches': len(user_data['searches']),
                    'num_clicks': len(user_data['clicked_items']),
                    'top_search_terms': dict(user_data['search_patterns'].most_common(10)),
                    'profile_type': 'hybrid' if search_profile is not None and item_profile is not None 
                                   else 'search_based' if search_profile is not None 
                                   else 'item_based',
                    'embedding_dim': len(final_profile)
                }
                
                # Store embedding
                profile_embeddings[user_id] = final_profile
                
                print(f"  ✅ Profile created: {user_profiles[user_id]['profile_type']}")
                print(f"     Searches: {user_profiles[user_id]['num_searches']}")
                print(f"     Clicks: {user_profiles[user_id]['num_clicks']}")
                print(f"     Top terms: {list(user_profiles[user_id]['top_search_terms'].keys())[:3]}")
            else:
                print(f"  ❌ Could not create profile (no valid data)")
        
        # Save profiles
        self._save_user_profiles(user_profiles, profile_embeddings, output_dir)
        
        return user_profiles, profile_embeddings
    
    def _save_user_profiles(self, user_profiles, profile_embeddings, output_dir):
        """Save user profiles to files"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save metadata as JSON
        profiles_json_path = os.path.join(output_dir, 'user_profiles.json')
        with open(profiles_json_path, 'w', encoding='utf-8') as f:
            json.dump(user_profiles, f, indent=2, ensure_ascii=False)
        print(f"✅ Saved profile metadata: {profiles_json_path}")
        
        # Save embeddings as NPZ
        profiles_npz_path = os.path.join(output_dir, 'user_profiles.npz')
        np.savez_compressed(
            profiles_npz_path,
            user_ids=np.array(list(profile_embeddings.keys()), dtype=object),
            embeddings=np.array(list(profile_embeddings.values()), dtype='float32')
        )
        print(f"✅ Saved profile embeddings: {profiles_npz_path}")
        
        print(f"\n🎉 User profiles built successfully!")
        print(f"   Users: {len(user_profiles)}")
        print(f"   Embeddings: {len(profile_embeddings)}")
        
def main():
    """Main execution function"""
    history_path = str(config.USER_HISTORY)
    
    if not os.path.exists(history_path):
        print(f"❌ History file not found: {history_path}")
        return
    
    # Create profile builder
    builder = UserProfileBuilder()
    
    # Build profiles
    user_profiles, profile_embeddings = builder.build_user_profiles(history_path)
    
    print("\n📊 Profile Summary:")
    for user_id, profile in user_profiles.items():
        print(f"  {user_id}: {profile['profile_type']} profile")
        print(f"    Searches: {profile['num_searches']}, Clicks: {profile['num_clicks']}")

if __name__ == "__main__":
    main()