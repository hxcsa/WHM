from decimal import Decimal
from datetime import datetime
from app.core.firebase import get_db
from google.cloud import firestore

class QuotationService:
    """Service for managing sales quotations and orders."""
    
    def __init__(self):
        self.db = get_db()
    
    def create_quotation(self, data: dict) -> str:
        """Create a new quotation (عرض سعر)."""
        doc_ref = self.db.collection("quotations").document()
        quotation = {
            "number": data.get("number", f"QO-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
            "customer_name": data.get("customer_name"),
            "customer_contact": data.get("customer_contact", ""),
            "lines": data.get("lines", []),
            "total": str(data.get("total", "0")),
            "currency": data.get("currency", "IQD"),
            "status": "DRAFT",  # DRAFT -> SENT -> ACCEPTED -> CONVERTED -> EXPIRED
            "valid_until": data.get("valid_until"),
            "notes": data.get("notes", ""),
            "created_at": firestore.SERVER_TIMESTAMP,
            "created_by": data.get("created_by", "system")
        }
        doc_ref.set(quotation)
        return doc_ref.id
    
    def list_quotations(self, status: str = None, limit: int = 50) -> list:
        """List quotations with optional status filter."""
        query = self.db.collection("quotations").order_by("created_at", direction=firestore.Query.DESCENDING)
        if status:
            query = query.where("status", "==", status)
        docs = query.limit(limit).stream()
        return [{"id": d.id, **d.to_dict()} for d in docs]
    
    def update_status(self, quotation_id: str, new_status: str) -> dict:
        """Update quotation status."""
        self.db.collection("quotations").document(quotation_id).update({
            "status": new_status,
            "updated_at": firestore.SERVER_TIMESTAMP
        })
        return {"status": "updated", "new_status": new_status}
    
    def convert_to_sales_order(self, quotation_id: str) -> str:
        """Convert accepted quotation to a Sales Order."""
        quo_doc = self.db.collection("quotations").document(quotation_id).get()
        if not quo_doc.exists:
            raise ValueError("Quotation not found")
        
        quo_data = quo_doc.to_dict()
        
        # Create Sales Order
        so_ref = self.db.collection("sales_orders").document()
        sales_order = {
            "number": f"SO-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "quotation_id": quotation_id,
            "customer_name": quo_data.get("customer_name"),
            "lines": quo_data.get("lines", []),
            "total": quo_data.get("total"),
            "currency": quo_data.get("currency", "IQD"),
            "status": "PENDING",  # PENDING -> APPROVED -> DELIVERED -> INVOICED
            "created_at": firestore.SERVER_TIMESTAMP
        }
        so_ref.set(sales_order)
        
        # Update quotation status
        self.db.collection("quotations").document(quotation_id).update({
            "status": "CONVERTED",
            "sales_order_id": so_ref.id
        })
        
        return so_ref.id
    
    def list_sales_orders(self, status: str = None, limit: int = 50) -> list:
        """List sales orders."""
        query = self.db.collection("sales_orders").order_by("created_at", direction=firestore.Query.DESCENDING)
        if status:
            query = query.where("status", "==", status)
        docs = query.limit(limit).stream()
        return [{"id": d.id, **d.to_dict()} for d in docs]


class PurchaseOrderService:
    """Service for managing purchase orders."""
    
    def __init__(self):
        self.db = get_db()
    
    def create_purchase_order(self, data: dict) -> str:
        """Create a new purchase order (طلب شراء)."""
        doc_ref = self.db.collection("purchase_orders").document()
        po = {
            "number": data.get("number", f"PO-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
            "supplier_name": data.get("supplier_name"),
            "supplier_account_id": data.get("supplier_account_id"),
            "lines": data.get("lines", []),
            "total": str(data.get("total", "0")),
            "currency": data.get("currency", "IQD"),
            "status": "DRAFT",  # DRAFT -> APPROVED -> RECEIVED -> PAID
            "expected_delivery": data.get("expected_delivery"),
            "notes": data.get("notes", ""),
            "created_at": firestore.SERVER_TIMESTAMP,
            "created_by": data.get("created_by", "system")
        }
        doc_ref.set(po)
        return doc_ref.id
    
    def list_purchase_orders(self, status: str = None, limit: int = 50) -> list:
        """List purchase orders."""
        query = self.db.collection("purchase_orders").order_by("created_at", direction=firestore.Query.DESCENDING)
        if status:
            query = query.where("status", "==", status)
        docs = query.limit(limit).stream()
        return [{"id": d.id, **d.to_dict()} for d in docs]
    
    def approve_po(self, po_id: str, approver_id: str) -> dict:
        """Approve a purchase order."""
        self.db.collection("purchase_orders").document(po_id).update({
            "status": "APPROVED",
            "approved_by": approver_id,
            "approved_at": firestore.SERVER_TIMESTAMP
        })
        return {"status": "approved"}
    
    def receive_po(self, po_id: str) -> str:
        """Mark PO as received and create GRN reference."""
        self.db.collection("purchase_orders").document(po_id).update({
            "status": "RECEIVED",
            "received_at": firestore.SERVER_TIMESTAMP
        })
        return po_id


def get_quotation_service() -> QuotationService:
    return QuotationService()

def get_purchase_order_service() -> PurchaseOrderService:
    return PurchaseOrderService()
