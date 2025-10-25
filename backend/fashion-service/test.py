#!/usr/bin/env python3
"""
Fashion Service Test
Simple test script for the Fashion Service
Now supports environment-based URL/port detection.
"""

import requests
import time
import os
from pathlib import Path
try:
    from dotenv import load_dotenv
    # Load .env next to this test file
    load_dotenv(dotenv_path=Path(__file__).with_name('.env'))
except Exception:
    pass

# Resolve base URL: prefer explicit FASHION_SERVICE_URL, else use PORT env
def get_base_url():
    url = os.getenv("FASHION_SERVICE_URL")
    if url:
        return url.rstrip("/")
    port = os.getenv("PORT", "8000")
    return f"http://localhost:{port}"

BASE_URL = get_base_url()

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("[OK] Health check passed")
            return True
        else:
            print(f"[ERROR] Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"[ERROR] Cannot connect to service: {e}")
        return False

def test_endpoints():
    """Test basic endpoints"""
    print("\nTesting basic endpoints...")
    
    # Test product details
    try:
        response = requests.get(f"{BASE_URL}/api/v1/products/test_product")
        if response.status_code in [200, 404]:
            print("[OK] Product endpoint working")
        else:
            print(f"[ERROR] Product endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"[ERROR] Product endpoint error: {e}")
        return False
    
    # Test recommendations
    try:
        response = requests.post(f"{BASE_URL}/api/v1/recommendations/user/test_user?k=3")
        if response.status_code == 200:
            print("[OK] Recommendations endpoint working")
        else:
            print(f"[ERROR] Recommendations endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"[ERROR] Recommendations endpoint error: {e}")
        return False
    
    return True

def main():
    """Main test function"""
    print("Fashion Service Test")
    print("=" * 30)
    print(f"Target: {BASE_URL}")
    print("Make sure the Fashion Service is running at the URL above")
    print()
    
    # Wait a moment
    time.sleep(1)
    
    # Run tests
    health_ok = test_health()
    endpoints_ok = test_endpoints()
    
    print("\n" + "=" * 30)
    if health_ok and endpoints_ok:
        print("[OK] All tests passed!")
        print("Fashion Service is working correctly")
    else:
        print("[ERROR] Some tests failed")
        print("Check the service is running and try again")

if __name__ == "__main__":
    main()
