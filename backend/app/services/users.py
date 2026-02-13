from typing import List, Optional
from firebase_admin import auth, firestore
from app.core.firebase import get_db
from fastapi import HTTPException

class UsersService:
    def __init__(self, current_user: dict):
        self.db = get_db()
        self.current_user = current_user
        self.company_id = current_user.get("company_id")
        self.role = current_user.get("role")

    def list_users(self) -> List[dict]:
        """List all users in the current company. Admin only."""
        if self.role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can list users")
            
        docs = self.db.collection("users").where("company_id", "==", self.company_id).stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]

    def create_employee(self, email: str, password: str, role: str, allowed_tabs: List[str] = None) -> str:
        """Create a new Firebase auth user and Firestore profile."""
        if self.role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can create users")

        if role not in ["accountant", "storekeeper", "viewer", "admin"]:
            raise ValueError("Invalid role specified")

        try:
            # 1. Create in Firebase Auth
            user_record = auth.create_user(
                email=email,
                password=password,
                display_name=email.split("@")[0]
            )
            
            # 2. Create profile in Firestore
            user_data = {
                "email": email,
                "role": role,
                "company_id": self.company_id,
                "allowed_tabs": allowed_tabs or [],
                "created_at": firestore.SERVER_TIMESTAMP,
                "created_by": self.current_user["uid"]
            }
            self.db.collection("users").document(user_record.uid).set(user_data)
            
            return user_record.uid
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    def update_user_role(self, user_id: str, new_role: str):
        """Change an employee's role."""
        if self.role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can update roles")
            
        self.db.collection("users").document(user_id).update({"role": new_role})

    def update_permissions(self, user_id: str, allowed_tabs: List[str]):
        """Update granular tab permissions."""
        if self.role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can update permissions")
            
        self.db.collection("users").document(user_id).update({"allowed_tabs": allowed_tabs})

    def delete_user(self, user_id: str):
        """Delete user account. Admin only."""
        if self.role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can delete users")
        
        # 1. Delete from Firebase Auth
        try:
            auth.delete_user(user_id)
        except Exception:
            pass # User might already be deleted in auth
            
        # 2. Delete from Firestore
        self.db.collection("users").document(user_id).delete()

def get_users_service(current_user: dict = None):
    return UsersService(current_user)
