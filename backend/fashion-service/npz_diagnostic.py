# npz_diagnostic.py
"""
Diagnostic script to inspect NPZ and FAISS files.
Run this to see what's actually in your files.
"""

import numpy as np
import faiss
from pathlib import Path

NPZ_PATH = Path('models/cloud_gallery_embeddings.npz')
INDEX_PATH = Path('models/cloud_gallery_ip.index')

print("=" * 70)
print("NPZ FILE DIAGNOSTIC")
print("=" * 70)

if NPZ_PATH.exists():
    print(f"✓ NPZ file found: {NPZ_PATH}")
    
    try:
        data = np.load(NPZ_PATH, allow_pickle=True)
        
        print(f"\n📦 NPZ Contents:")
        print(f"   Keys: {list(data.keys())}")
        
        for key in data.keys():
            value = data[key]
            print(f"\n   Key: '{key}'")
            print(f"   Type: {type(value)}")
            print(f"   Shape: {value.shape if hasattr(value, 'shape') else 'N/A'}")
            print(f"   Dtype: {value.dtype if hasattr(value, 'dtype') else 'N/A'}")
            
            if key == 'vecs':
                print(f"   → Embeddings shape: {value.shape}")
                print(f"   → Embedding dimension: {value.shape[1] if len(value.shape) > 1 else 'N/A'}")
                print(f"   → Number of embeddings: {value.shape[0] if len(value.shape) > 0 else 'N/A'}")
            
            elif key == 'paths' or key == 'urls':
                print(f"   → Number of {key}: {len(value)}")
                if len(value) > 0:
                    print(f"\n   📝 Sample {key} (first 5):")
                    for i, path in enumerate(value[:5]):
                        print(f"      [{i}] {path}")
                
                # Check for None or empty paths
                none_count = sum(1 for p in value if p is None or str(p).strip() == '')
                if none_count > 0:
                    print(f"   ⚠️  WARNING: {none_count} paths are None or empty!")
        
        # Validate consistency
        if 'vecs' in data and 'paths' in data:
            num_vecs = len(data['vecs'])
            num_paths = len(data['paths'])
            print(f"\n✓ Consistency Check:")
            print(f"   Embeddings: {num_vecs}")
            print(f"   Paths: {num_paths}")
            if num_vecs == num_paths:
                print(f"   ✅ MATCH!")
            else:
                print(f"   ❌ MISMATCH! Embeddings and paths don't align!")
        
    except Exception as e:
        print(f"❌ Error loading NPZ: {e}")
        import traceback
        traceback.print_exc()
else:
    print(f"❌ NPZ file not found: {NPZ_PATH}")

print("\n" + "=" * 70)
print("FAISS INDEX DIAGNOSTIC")
print("=" * 70)

if INDEX_PATH.exists():
    print(f"✓ FAISS index found: {INDEX_PATH}")
    
    try:
        index = faiss.read_index(str(INDEX_PATH))
        
        print(f"\n🔍 FAISS Index Info:")
        print(f"   Total vectors: {index.ntotal}")
        print(f"   Dimension: {index.d}")
        print(f"   Index type: {type(index).__name__}")
        print(f"   Is trained: {index.is_trained}")
        
        if index.ntotal > 0:
            # Test search
            print(f"\n   Testing search with random vector...")
            test_vec = np.random.randn(1, index.d).astype('float32')
            distances, indices = index.search(test_vec, min(5, index.ntotal))
            print(f"   ✓ Search works! Found {len(indices[0])} results")
            print(f"   Sample indices: {indices[0]}")
            print(f"   Sample distances: {distances[0]}")
        
    except Exception as e:
        print(f"❌ Error loading FAISS index: {e}")
        import traceback
        traceback.print_exc()
else:
    print(f"❌ FAISS index not found: {INDEX_PATH}")

print("\n" + "=" * 70)
print("RECOMMENDATIONS")
print("=" * 70)

if NPZ_PATH.exists() and INDEX_PATH.exists():
    try:
        data = np.load(NPZ_PATH, allow_pickle=True)
        index = faiss.read_index(str(INDEX_PATH))
        
        if index.ntotal == len(data['vecs']):
            print("✅ Everything looks good!")
            print("   → Your FAISS index and NPZ file are in sync")
            print("   → The service should work in FAISS mode")
        else:
            print("⚠️  FAISS index and NPZ are out of sync!")
            print(f"   FAISS has {index.ntotal} vectors")
            print(f"   NPZ has {len(data['vecs'])} embeddings")
            print("\n   SOLUTION: Regenerate embeddings by running:")
            print("   python emb.py")
    except:
        pass
elif not NPZ_PATH.exists():
    print("❌ NPZ file missing!")
    print("\n   SOLUTION: Generate embeddings by running:")
    print("   python emb.py")
elif not INDEX_PATH.exists():
    print("❌ FAISS index missing!")
    print("\n   SOLUTION: Generate index by running:")
    print("   python emb.py")
else:
    print("❌ Both NPZ and FAISS files are missing!")
    print("\n   SOLUTION: Generate embeddings by running:")
    print("   python emb.py")

print("=" * 70)