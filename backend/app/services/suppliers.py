from typing import List, Optional
from google.cloud import firestore
from app.core.firebase import get_db
from app.schemas.suppliers import SupplierCreate, Supplier


class SuppliersService:
    def __init__(self, current_user: dict):
        self.db = get_db()
        self.collection = self.db.collection("suppliers")
        self.company_id = current_user.get("company_id")
        self.user_email = current_user.get("email")

    def create_supplier(self, data: SupplierCreate) -> str:
        doc_ref = self.collection.document()
        supplier_data = data.model_dump()
        supplier_data.update({
            "company_id": self.company_id,
            "created_at": firestore.SERVER_TIMESTAMP,
            "created_by": self.user_email,
            "status": "active"
        })
        doc_ref.set(supplier_data)
        return doc_ref.id

    def get_supplier(self, supplier_id: str) -> Optional[dict]:
        doc = self.collection.document(supplier_id).get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        return None

    def list_suppliers(self) -> List[dict]:
        docs = self.collection.where("company_id", "==", self.company_id).stream()
        return [{"id": d.id, **d.to_dict()} for d in docs]
