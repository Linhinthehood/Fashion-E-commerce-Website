"""Configuration package for Fashion Recommender System"""

from .config import config, ensure_directories, resolve_image_path

__all__ = [
    "config",
    "ensure_directories", 
    "resolve_image_path"
]
