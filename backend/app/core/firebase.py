"""
Firebase Core - Optimized Connection Management
Fixes cold-start issues with singleton pattern and connection reuse.
"""
import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path
from functools import lru_cache

# Singleton Firestore client - CRITICAL for performance
_db = None
_initialized = False


def init_firebase():
    """Initialize Firebase Admin SDK once at startup."""
    global _db, _initialized
    
    if _initialized:
        return _db
    
    import os
    import json
    
    # Priority 1: Environment Variable (Best for Production/Cloud Run)
    env_cred = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    
    # Priority 2: Local File (Development)
    backend_dir = Path(__file__).parent.parent.parent
    cred_path = backend_dir / "service_account.json"
    
    if env_cred:
        print("[Firebase] Initializing from environment variable...")
        cred_dict = json.loads(env_cred)
        cred = credentials.Certificate(cred_dict)
    elif cred_path.exists():
        print(f"[Firebase] Initializing from file: {cred_path}")
        cred = credentials.Certificate(str(cred_path))
    else:
        raise FileNotFoundError("Firebase credentials not found (env: FIREBASE_SERVICE_ACCOUNT or file: service_account.json)")
    
    # Initialize only if not already done
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    
    _db = firestore.client()
    _initialized = True
    print("[Firebase] Initialized successfully!")
    
    return _db


def get_db():
    """
    Get Firestore database client.
    Uses singleton pattern to avoid re-initialization overhead.
    """
    global _db, _initialized
    
    if not _initialized or _db is None:
        return init_firebase()
    
    return _db


# Preload on import to avoid first-request latency
try:
    init_firebase()
except Exception as e:
    print(f"[Firebase] Deferred initialization: {e}")
