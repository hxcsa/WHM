"""
Audit Trail Middleware - Immutable Activity Logging
Logs every CREATE, UPDATE, VOID action to Firestore.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from app.core.firebase import get_db

class AuditLogger:
    """Immutable audit log for all system actions."""
    
    COLLECTION = "audit_logs"
    
    # Action types
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    VOID = "VOID"
    POST = "POST"
    CLOSE_PERIOD = "CLOSE_PERIOD"
    
    def __init__(self, user_id: str = "system", company_id: str = "default"):
        self.db = get_db()
        self.user_id = user_id
        self.company_id = company_id
    
    def log_action(
        self,
        action: str,
        collection: str,
        doc_id: str,
        before: Optional[Dict[str, Any]] = None,
        after: Optional[Dict[str, Any]] = None,
        description: str = ""
    ) -> str:
        """
        Log an action to the audit trail.
        
        Args:
            action: CREATE, UPDATE, VOID, POST, CLOSE_PERIOD
            collection: Firestore collection name (e.g., 'journal_entries')
            doc_id: Document ID that was affected
            before: Document state before the action (for updates)
            after: Document state after the action
            description: Human-readable description
        
        Returns:
            Audit log document ID
        """
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": self.user_id,
            "company_id": self.company_id,
            "action": action,
            "collection": collection,
            "document_id": doc_id,
            "before": before or {},
            "after": after or {},
            "description": description,
            # Immutability: Once written, cannot be modified
            "immutable": True
        }
        
        doc_ref = self.db.collection(self.COLLECTION).document()
        doc_ref.set(log_entry)
        
        return doc_ref.id
    
    def log_create(self, collection: str, doc_id: str, data: Dict[str, Any], description: str = "") -> str:
        """Log a CREATE action."""
        return self.log_action(
            action=self.CREATE,
            collection=collection,
            doc_id=doc_id,
            after=data,
            description=description or f"Created {collection} document"
        )
    
    def log_update(self, collection: str, doc_id: str, before: Dict[str, Any], after: Dict[str, Any], description: str = "") -> str:
        """Log an UPDATE action."""
        return self.log_action(
            action=self.UPDATE,
            collection=collection,
            doc_id=doc_id,
            before=before,
            after=after,
            description=description or f"Updated {collection} document"
        )
    
    def log_void(self, collection: str, doc_id: str, original: Dict[str, Any], description: str = "") -> str:
        """Log a VOID action."""
        return self.log_action(
            action=self.VOID,
            collection=collection,
            doc_id=doc_id,
            before=original,
            description=description or f"Voided {collection} document"
        )
    
    def log_post(self, collection: str, doc_id: str, data: Dict[str, Any], description: str = "") -> str:
        """Log a POST action (document finalization)."""
        return self.log_action(
            action=self.POST,
            collection=collection,
            doc_id=doc_id,
            after=data,
            description=description or f"Posted {collection} document"
        )


def get_audit_logger(user_id: str = "system", company_id: str = "default") -> AuditLogger:
    """Factory function to get an audit logger instance."""
    return AuditLogger(user_id=user_id, company_id=company_id)
