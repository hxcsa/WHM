"""
Fiscal Period & Opening Balances Service
Handles period closing and opening balance entries.
"""
from datetime import datetime, date
from decimal import Decimal
from typing import List, Dict, Any
from google.cloud import firestore
from app.core.firebase import get_db
from app.core.audit import get_audit_logger
from app.models.core import DocumentStatus

class FiscalService:
    """Manages fiscal periods and opening balances."""
    
    PERIODS_COLLECTION = "fiscal_periods"
    
    def __init__(self, user_id: str = "system", company_id: str = "default"):
        self.db = get_db()
        self.audit = get_audit_logger(user_id, company_id)
        self.user_id = user_id
        self.company_id = company_id
    
    def close_period(self, year: int, month: int) -> str:
        """
        Close a fiscal period (month).
        Once closed, no transactions can be posted to this period.
        
        Args:
            year: Fiscal year
            month: Month number (1-12)
        
        Returns:
            Period document ID
        """
        period_key = f"{self.company_id}_{year}_{month:02d}"
        period_ref = self.db.collection(self.PERIODS_COLLECTION).document(period_key)
        
        # Check if already closed
        existing = period_ref.get()
        if existing.exists and existing.to_dict().get("status") == "CLOSED":
            raise ValueError(f"Period {year}-{month:02d} is already closed")
        
        period_data = {
            "company_id": self.company_id,
            "year": year,
            "month": month,
            "status": "CLOSED",
            "closed_at": firestore.SERVER_TIMESTAMP,
            "closed_by": self.user_id
        }
        
        period_ref.set(period_data)
        
        self.audit.log_action(
            action="CLOSE_PERIOD",
            collection=self.PERIODS_COLLECTION,
            doc_id=period_key,
            after=period_data,
            description=f"Closed fiscal period {year}-{month:02d}"
        )
        
        return period_key
    
    def is_period_open(self, transaction_date: date) -> bool:
        """Check if a transaction date falls within an open period."""
        year = transaction_date.year
        month = transaction_date.month
        
        period_key = f"{self.company_id}_{year}_{month:02d}"
        period_doc = self.db.collection(self.PERIODS_COLLECTION).document(period_key).get()
        
        if not period_doc.exists:
            return True  # Period not explicitly closed = open
        
        return period_doc.to_dict().get("status") != "CLOSED"
    
    def reopen_period(self, year: int, month: int) -> str:
        """Reopen a closed period (admin only)."""
        period_key = f"{self.company_id}_{year}_{month:02d}"
        period_ref = self.db.collection(self.PERIODS_COLLECTION).document(period_key)
        
        existing = period_ref.get()
        if not existing.exists:
            raise ValueError(f"Period {year}-{month:02d} does not exist")
        
        period_ref.update({
            "status": "OPEN",
            "reopened_at": firestore.SERVER_TIMESTAMP,
            "reopened_by": self.user_id
        })
        
        self.audit.log_action(
            action="REOPEN_PERIOD",
            collection=self.PERIODS_COLLECTION,
            doc_id=period_key,
            before=existing.to_dict(),
            description=f"Reopened fiscal period {year}-{month:02d}"
        )
        
        return period_key
    
    def create_opening_balances(self, balances: List[Dict[str, Any]], effective_date: date) -> str:
        """
        Create opening balance journal entry.
        
        Args:
            balances: List of {account_id, debit, credit} for opening balances
            effective_date: Date of opening balances
        
        Returns:
            Journal Entry ID
        """
        from app.services.numbering import get_numbering_service
        
        numbering = get_numbering_service(self.company_id)
        je_number = numbering.get_next_number("journal_entry", effective_date.year)
        
        lines = []
        for balance in balances:
            lines.append({
                "account_id": balance["account_id"],
                "debit": str(balance.get("debit", "0.0000")),
                "credit": str(balance.get("credit", "0.0000")),
                "description": "Opening Balance"
            })
        
        je_ref = self.db.collection("journal_entries").document()
        je_data = {
            "number": je_number,
            "date": firestore.SERVER_TIMESTAMP,
            "description": f"Opening Balances as of {effective_date.isoformat()}",
            "status": DocumentStatus.POSTED,
            "source_document_type": "OPENING_BALANCE",
            "company_id": self.company_id,
            "lines": lines
        }
        
        je_ref.set(je_data)
        
        self.audit.log_create(
            collection="journal_entries",
            doc_id=je_ref.id,
            data=je_data,
            description=f"Created opening balances JE: {je_number}"
        )
        
        return je_ref.id


def get_fiscal_service(user_id: str = "system", company_id: str = "default") -> FiscalService:
    """Factory function to get a fiscal service instance."""
    return FiscalService(user_id=user_id, company_id=company_id)
