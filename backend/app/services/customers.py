from typing import List, Optional
from google.cloud import firestore
from app.core.firebase import get_db
from fastapi import HTTPException


class CustomersService:
    def __init__(self, current_user: dict):
        self.db = get_db()
        self.collection = self.db.collection("customers")
        self.current_user = current_user
        self.company_id = current_user.get("company_id")
        self.role = current_user.get("role")

    def list_customers(
        self,
        search: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> dict:
        """List customers with optional search and filters."""
        # Use simpler where syntax to avoid FieldFilter import issues
        query = self.collection.where("company_id", "==", self.company_id)

        if status:
            query = query.where("status", "==", status)

        # Fetch all for the company (client-side search & sort)
        docs = query.stream()

        results = []
        for d in docs:
            item = {"id": d.id, **d.to_dict()}
            # Convert timestamp to ISO string if it exists for JSON safety
            if "created_at" in item and item["created_at"]:
                try:
                    item["created_at"] = item["created_at"].isoformat()
                except: pass
            
            if search:
                search_lower = search.lower()
                name = f"{item.get('first_name', '')} {item.get('last_name', '')}".lower()
                company = (item.get("company_name") or "").lower()
                phone = (item.get("phone") or "").lower()
                email = (item.get("email") or "").lower()
                if not any(search_lower in field for field in [name, company, phone, email]):
                    continue
            
            # Ensure name property exists for frontend
            if not item.get("name"):
                if item.get("company_name"):
                    item["name"] = item["company_name"]
                elif item.get("first_name") or item.get("last_name"):
                    item["name"] = f"{item.get('first_name', '')} {item.get('last_name', '')}".strip()
                else:
                    item["name"] = item.get("email") or "Unknown"

            results.append(item)

        # Sort by created_at DESC (client-side to avoid index dependency)
        results.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        # Paginate
        total = len(results)
        offset = (page - 1) * page_size
        page_results = results[offset:offset + page_size]

        return {
            "customers": page_results,
            "total_count": total,
            "page": page,
            "page_size": page_size
        }

    def get_customer(self, customer_id: str) -> Optional[dict]:
        doc = self.collection.document(customer_id).get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        return None

    def create_customer(self, data: dict) -> str:
        """Create a new customer. Checks for duplicate phone."""
        if self.role not in ["admin", "accountant"]:
            raise HTTPException(status_code=403, detail="Only admin/accountant can create customers")

        # Check duplicate phone within company
        phone = data.get("phone")
        if phone:
            existing = self.collection \
                .where("company_id", "==", self.company_id) \
                .where("phone", "==", phone) \
                .limit(1).get()
            if len(existing) > 0:
                raise HTTPException(status_code=409, detail=f"Customer with phone {phone} already exists")

        doc_ref = self.collection.document()
        customer_data = {
            **data,
            "company_id": self.company_id,
            "created_at": firestore.SERVER_TIMESTAMP,
            "created_by": self.current_user.get("email"),
        }
        doc_ref.set(customer_data)
        return doc_ref.id

    def update_customer(self, customer_id: str, data: dict) -> dict:
        """Update a customer."""
        if self.role not in ["admin", "accountant"]:
            raise HTTPException(status_code=403, detail="Only admin/accountant can update customers")

        doc_ref = self.collection.document(customer_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Customer not found")

        # If phone is being changed, check for duplicates
        if "phone" in data and data["phone"]:
            existing = self.collection \
                .where("company_id", "==", self.company_id) \
                .where("phone", "==", data["phone"]) \
                .limit(1).get()
            for e in existing:
                if e.id != customer_id:
                    raise HTTPException(status_code=409, detail=f"Phone {data['phone']} already in use")

        update_data = {k: v for k, v in data.items() if v is not None}
        update_data["updated_at"] = firestore.SERVER_TIMESTAMP
        doc_ref.update(update_data)
        return {"id": customer_id, **doc.to_dict(), **update_data}


def get_customers_service(current_user: dict = None):
    return CustomersService(current_user)
