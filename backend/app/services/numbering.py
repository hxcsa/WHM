"""
Document Numbering Service
Generates sequential document numbers: JE-2026-000001
"""
from datetime import datetime
from google.cloud import firestore
from app.core.firebase import get_db

class NumberingService:
    """Generates unique, sequential document numbers."""
    
    COLLECTION = "sequences"
    
    # Document type prefixes
    PREFIXES = {
        "journal_entry": "JE",
        "grn": "GRN",
        "delivery_note": "DO",
        "invoice": "INV",
        "payment": "PAY",
        "receipt": "RCV"
    }
    
    def __init__(self, company_id: str = "default"):
        self.db = get_db()
        self.company_id = company_id
    
    def get_next_number(self, doc_type: str, year: int = None) -> str:
        """
        Get the next sequential number for a document type.
        
        Args:
            doc_type: Type of document (e.g., 'journal_entry', 'grn')
            year: Fiscal year (defaults to current year)
        
        Returns:
            Formatted document number (e.g., 'JE-2026-000001')
        """
        if year is None:
            year = datetime.now().year
        
        prefix = self.PREFIXES.get(doc_type, doc_type.upper()[:3])
        sequence_key = f"{self.company_id}_{doc_type}_{year}"
        
        # Use Firestore transaction for atomic increment
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _get_next(transaction, db):
            seq_ref = db.collection(self.COLLECTION).document(sequence_key)
            seq_doc = seq_ref.get(transaction=transaction)
            
            if seq_doc.exists:
                current = seq_doc.to_dict().get("current", 0)
            else:
                current = 0
            
            next_num = current + 1
            
            transaction.set(seq_ref, {
                "current": next_num,
                "doc_type": doc_type,
                "year": year,
                "company_id": self.company_id,
                "last_updated": firestore.SERVER_TIMESTAMP
            })
            
            return next_num
        
        next_num = _get_next(transaction, self.db)
        
        # Format: PREFIX-YEAR-NNNNNN
        return f"{prefix}-{year}-{next_num:06d}"
    
    def get_current_number(self, doc_type: str, year: int = None) -> int:
        """Get the current sequence number without incrementing."""
        if year is None:
            year = datetime.now().year
        
        sequence_key = f"{self.company_id}_{doc_type}_{year}"
        seq_doc = self.db.collection(self.COLLECTION).document(sequence_key).get()
        
        if seq_doc.exists:
            return seq_doc.to_dict().get("current", 0)
        return 0


def get_numbering_service(company_id: str = "default") -> NumberingService:
    """Factory function to get a numbering service instance."""
    return NumberingService(company_id=company_id)
