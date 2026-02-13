import firebase_admin
from firebase_admin import credentials, auth, firestore
import os
import json
from pathlib import Path

def init_firebase():
    """Initialize Firebase Admin SDK."""
    # Priority 1: Environment Variable (Best for Production/Cloud Run)
    env_cred = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    
    # Priority 2: Local File (Development)
    # Assuming script is in backend/scripts/
    backend_dir = Path(__file__).parent.parent
    cred_path = backend_dir / "service_account.json"
    
    if env_cred:
        print("[Firebase] Initializing from environment variable...")
        cred_dict = json.loads(env_cred)
        cred = credentials.Certificate(cred_dict)
    elif cred_path.exists():
        print(f"[Firebase] Initializing from file: {cred_path}")
        cred = credentials.Certificate(str(cred_path))
    else:
        raise FileNotFoundError(f"Firebase credentials not found at {cred_path}")
    
    # Initialize only if not already done
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    
    print("[Firebase] Initialized successfully!")

def set_admin_claims(uid, email):
    print(f"\nSetting admin claims for user: {email} ({uid})")
    
    custom_claims = {
        'role': 'admin',
        'company_id': 'comp_default'
    }
    
    auth.set_custom_user_claims(uid, custom_claims)
    print("✅ Custom claims set successfully!")
    print(f"Claims: {custom_claims}")
    print("\n⚠️  IMPORTANT: You must LOGOUT and LOGIN again on the frontend for changes to take effect.")

def check_shifts_index():
    print("\n[Index Check] Verifying Shifts Index...")
    db = firestore.client()
    try:
        # Try the query that was failing with 500
        docs = (
            db.collection("shifts")
            .where("company_id", "==", "comp_default")
            .order_by("date", direction=firestore.Query.DESCENDING)
            .limit(1)
            .stream()
        )
        for doc in docs:
            pass
        print("✅ Shifts index appears to be working (or valid).")
    except Exception as e:
        print("❌ Shifts query failed. This likely indicates a missing index.")
        print(f"Error: {e}")
        
        # Write error to file to ensure we capture the URL
        with open("index_url.txt", "w", encoding="utf-8") as f:
            f.write(str(e))
            
        if "FAILED_PRECONDITION" in str(e) or "index" in str(e).lower():
            print("\n👉 LOOK HERE: The error message usually contains a URL to create the index.")
            print("   Copy that URL and open it in your browser to create the index.")

def main():
    try:
        init_firebase()
        
        print("\nFetching users...")
        page = auth.list_users()
        users = []
        for user in page.users:
            users.append({'uid': user.uid, 'email': user.email})
        
        if not users:
            print("No users found in Firebase Authentication.")
            return

        selected_user = None
        if len(users) == 1:
            print(f"Found 1 user: {users[0]['email']}")
            selected_user = users[0]
        else:
            print(f"Found {len(users)} users:")
            for i, u in enumerate(users):
                print(f"{i+1}. {u['email']} ({u['uid']})")
            
            # For automation simplicity, if multiple users, we'll pick the first one 
            # or try to match 'evano' if possible, otherwise first.
            # In a real interactive script we'd ask input, but here we want to run it via tool.
            
            # Try to find one with 'evano' in email
            for u in users:
                if 'evano' in u['email'].lower():
                    selected_user = u
                    break
            
            if not selected_user:
                selected_user = users[0]
                print(f"Defaulting to first user: {selected_user['email']}")
            else:
                 print(f"Auto-selected user matching 'evano': {selected_user['email']}")

        set_admin_claims(selected_user['uid'], selected_user['email'])
        
        # Check index
        check_shifts_index()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main()
