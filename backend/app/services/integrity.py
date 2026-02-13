"""
Data Integrity & Idempotency Service
Prevents duplicate postings and ensures atomic transactions.
"""
from datetime import datetime
from typing import Optional
from google.cloud import firestore
from app.core.firebase import get_db

class IntegrityService:
    """Ensures data integrity and prevents duplicate operations."""
    
    IDEMPOTENCY_COLLECTION = "idempotency_keys"
    KEY_EXPIRY_HOURS = 24  # Keys expire after 24 hours
    
    def __init__(self, company_id: str = "default"):
        self.db = get_db()
        self.company_id = company_id
    
    def check_and_set_idempotency(self, key: str) -> bool:
        """
        Check if an operation has already been performed.
        If not, mark it as performed.
        
        Args:
            key: Unique idempotency key (e.g., 'grn_GRN-2026-000001')
        
        Returns:
            True if this is a new operation, False if duplicate
        """
        full_key = f"{self.company_id}_{key}"
        key_ref = self.db.collection(self.IDEMPOTENCY_COLLECTION).document(full_key)
        
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _check_and_set(transaction, ref):
            doc = ref.get(transaction=transaction)
            
            if doc.exists:
                # Check if expired
                created_at = doc.to_dict().get("created_at")
                if created_at:
                    # Firestore timestamps need special handling
                    return False  # Already exists, duplicate
                return False
            
            # New key, set it
            transaction.set(ref, {
                "key": key,
                "company_id": self.company_id,
                "created_at": firestore.SERVER_TIMESTAMP,
                "processed": True
            })
            return True
        
        return _check_and_set(transaction, key_ref)
    
    def generate_idempotency_key(self, doc_type: str, doc_number: str) -> str:
        """Generate a standardized idempotency key."""
        return f"{doc_type}_{doc_number}"
    
    def is_document_locked(self, collection: str, doc_id: str) -> bool:
        """Check if a document is locked (posted or voided)."""
        doc = self.db.collection(collection).document(doc_id).get()
        
        if not doc.exists:
            return False
        
        status = doc.to_dict().get("status")
        return status in ["POSTED", "VOIDED"]
    
    def lock_document(self, collection: str, doc_id: str) -> bool:
        """
        Lock a document by changing its status to POSTED.
        Locked documents cannot be edited.
        """
        doc_ref = self.db.collection(collection).document(doc_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise ValueError(f"Document {doc_id} not found")
        
        current_status = doc.to_dict().get("status")
        if current_status in ["POSTED", "VOIDED"]:
            raise ValueError(f"Document is already locked (status: {current_status})")
        
        doc_ref.update({
            "status": "POSTED",
            "posted_at": firestore.SERVER_TIMESTAMP
        })
        
        return True
    
    def validate_transaction_balance(self, lines: list) -> bool:
        """
        Validate that debits equal credits in a journal entry.
        Essential for double-entry integrity.
        """
        from decimal import Decimal
        
        total_debit = Decimal("0")
        total_credit = Decimal("0")
        
        for line in lines:
            total_debit += Decimal(str(line.get("debit", "0")))
            total_credit += Decimal(str(line.get("credit", "0")))
        
        return total_debit == total_credit


def get_integrity_service(company_id: str = "default") -> IntegrityService:
    """Factory function to get an integrity service instance."""
    return IntegrityService(company_id=company_id)
