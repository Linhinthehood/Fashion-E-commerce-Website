# config.py
"""
Configuration module for Fashion Recommendation System
Provides portable paths that work across different computers
"""

import os
from pathlib import Path

# Get the directory where this script is located (project root)
PROJECT_ROOT = Path(__file__).parent.parent.parent.absolute()

class Config:
    """Configuration class with portable paths"""
    
    # Project root directory
    PROJECT_ROOT = PROJECT_ROOT
    
    # Model files (now in data/models/)
    CHECKPOINT_BEST = PROJECT_ROOT / "data" / "models" / "fashion_clip_best.pt"
    CHECKPOINT_FINAL = PROJECT_ROOT / "data" / "models" / "fashion_clip_final.pt"
    
    # Data files (now in data/embeddings/)
    GALLERY_EMBEDDINGS = PROJECT_ROOT / "data" / "embeddings" / "gallery_embeddings.npz" 
    GALLERY_INDEX = PROJECT_ROOT / "data" / "embeddings" / "gallery_ip.index"
    USER_HISTORY = PROJECT_ROOT / "data" / "history.json"
    GLOBAL_STATS = PROJECT_ROOT / "data" / "global_stats.json"
    
    # Directories
    IMAGES_DIR = PROJECT_ROOT / "assets" / "images" / "gallery"
    DATA_DIR = PROJECT_ROOT / "data" 
    
    # Convert to strings for backward compatibility
    @property
    def checkpoint_path(self):
        return str(self.CHECKPOINT_BEST)
    
    @property 
    def images_dir_path(self):
        return str(self.IMAGES_DIR)
        
    @property
    def embeddings_path(self):
        return str(self.GALLERY_EMBEDDINGS)
        
    @property
    def index_path(self):
        return str(self.GALLERY_INDEX)
        
    @property
    def data_dir_path(self):
        return str(self.DATA_DIR)

# Create global config instance
config = Config()

# For backward compatibility, provide direct access
DEFAULT_CHECKPOINT = config.checkpoint_path
DEFAULT_IMAGES_DIR = config.images_dir_path  
DEFAULT_NPZ = config.embeddings_path
DEFAULT_INDEX = config.index_path

# Utility functions
def ensure_directories():
    """Create necessary directories if they don't exist"""
    config.IMAGES_DIR.mkdir(exist_ok=True)
    config.DATA_DIR.mkdir(exist_ok=True)
    (config.DATA_DIR / "analytics").mkdir(exist_ok=True)
    (config.DATA_DIR / "logs").mkdir(exist_ok=True)
    (config.DATA_DIR / "user_searches").mkdir(exist_ok=True)
    (config.DATA_DIR / "user_purchases").mkdir(exist_ok=True)

def get_project_root():
    """Get the project root directory"""
    return PROJECT_ROOT

def resolve_image_path(stored_path):
    """
    Resolve image path from embeddings to actual file location.
    Handles cases where embeddings were created with different path structure.
    
    Args:
        stored_path: Path stored in embeddings file (may be outdated)
        
    Returns:
        str: Corrected path that should work on current system
    """
    # Convert to Path for easier manipulation
    stored_path = Path(stored_path)
    
    # Get just the filename (e.g., "10000.jpg")
    filename = stored_path.name
    
    # Try current images directory first
    correct_path = config.IMAGES_DIR / filename
    if correct_path.exists():
        return str(correct_path)
    
    # If the stored path exists as-is, use it
    if stored_path.exists():
        return str(stored_path)
    
    # Try some common alternative locations
    alternatives = [
        # Same parent directory as project
        PROJECT_ROOT.parent / "pic" / filename,
        # One level up from project
        PROJECT_ROOT.parent / filename,
        # Current working directory
        Path.cwd() / "pic" / filename,
        Path.cwd() / filename,
    ]
    
    for alt_path in alternatives:
        if alt_path.exists():
            return str(alt_path)
    
    # If nothing works, return the path we expect (may still fail but gives clear error)
    return str(correct_path)

if __name__ == "__main__":
    # Test the configuration
    print("Project Root:", PROJECT_ROOT)
    print("Checkpoint:", config.checkpoint_path)
    print("Images Dir:", config.images_dir_path)
    print("Embeddings:", config.embeddings_path)
    print("Index:", config.index_path)
    
    # Test path resolution
    test_path = r"D:\Secret\duan\pic\10000.jpg"
    resolved = resolve_image_path(test_path)
    print(f"Test path resolution: {test_path} -> {resolved}")