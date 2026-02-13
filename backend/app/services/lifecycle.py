"""
Document Lifecycle & Integrity Service
Handles document state machine (DRAFT -> POSTED -> VOIDED) and reversals.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from google.cloud import firestore
from app.core.firebase import get_db
from app.core.audit import get_audit_logger
from app.models.core import DocumentStatus

class LifecycleService:
    """Manages document lifecycle and reversal logic."""
    
    def __init__(self, user_id: str = "system", company_id: str = "default"):
        self.db = get_db()
        self.audit = get_audit_logger(user_id, company_id)
        self.user_id = user_id
        self.company_id = company_id
    
    def void_journal_entry(self, je_id: str, reason: str = "") -> str:
        """
        Void a posted journal entry by creating a reversal entry.
        
        Args:
            je_id: Journal Entry ID to void
            reason: Reason for voiding
        
        Returns:
            Reversal Journal Entry ID
        """
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _execute(transaction, db):
            # 1. Read original JE
            je_ref = db.collection("journal_entries").document(je_id)
            je_snap = je_ref.get(transaction=transaction)
            
            if not je_snap.exists:
                raise ValueError(f"Journal Entry {je_id} not found")
            
            je_data = je_snap.to_dict()
            
            # 2. Verify it's posted (can only void posted documents)
            if je_data.get("status") != DocumentStatus.POSTED:
                raise ValueError(f"Can only void POSTED documents. Current status: {je_data.get('status')}")
            
            # 3. Create reversal entry (swap debits and credits)
            reversal_lines = []
            for line in je_data.get("lines", []):
                reversal_lines.append({
                    "account_id": line["account_id"],
                    "debit": line.get("credit", "0.0000"),
                    "credit": line.get("debit", "0.0000"),
                    "description": f"Reversal: {line.get('description', '')}"
                })
            
            reversal_ref = db.collection("journal_entries").document()
            reversal_data = {
                "number": f"REV-{je_data.get('number', je_id)}",
                "date": firestore.SERVER_TIMESTAMP,
                "description": f"Reversal of {je_data.get('number')}: {reason}",
                "status": DocumentStatus.POSTED,
                "source_document_type": "REVERSAL",
                "original_je_id": je_id,
                "lines": reversal_lines,
                "company_id": self.company_id
            }
            
            # 4. Write reversal
            transaction.set(reversal_ref, reversal_data)
            
            # 5. Mark original as VOIDED (not deleted)
            transaction.update(je_ref, {
                "status": DocumentStatus.VOIDED,
                "voided_at": firestore.SERVER_TIMESTAMP,
                "voided_by": self.user_id,
                "voided_reason": reason,
                "reversal_je_id": reversal_ref.id
            })
            
            return reversal_ref.id, je_data
        
        reversal_id, original_data = _execute(transaction, self.db)
        
        # 6. Log to audit trail
        self.audit.log_void(
            collection="journal_entries",
            doc_id=je_id,
            original=original_data,
            description=f"Voided JE {original_data.get('number')} - Reason: {reason}"
        )
        
        return reversal_id
    
    def can_edit_document(self, doc_id: str, collection: str) -> bool:
        """Check if a document can still be edited (only DRAFT status)."""
        doc = self.db.collection(collection).document(doc_id).get()
        if not doc.exists:
            return False
        
        status = doc.to_dict().get("status")
        return status == DocumentStatus.DRAFT
    
    def post_document(self, doc_id: str, collection: str) -> bool:
        """
        Finalize a document (DRAFT -> POSTED).
        Posted documents cannot be edited, only voided.
        """
        doc_ref = self.db.collection(collection).document(doc_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise ValueError(f"Document {doc_id} not found")
        
        doc_data = doc.to_dict()
        if doc_data.get("status") != DocumentStatus.DRAFT:
            raise ValueError(f"Can only post DRAFT documents. Current: {doc_data.get('status')}")
        
        doc_ref.update({
            "status": DocumentStatus.POSTED,
            "posted_at": firestore.SERVER_TIMESTAMP,
            "posted_by": self.user_id
        })
        
        self.audit.log_post(
            collection=collection,
            doc_id=doc_id,
            data=doc_data,
            description=f"Posted {doc_data.get('number', doc_id)}"
        )
        
        return True


def get_lifecycle_service(user_id: str = "system", company_id: str = "default") -> LifecycleService:
    """Factory function to get a lifecycle service instance."""
    return LifecycleService(user_id=user_id, company_id=company_id)
