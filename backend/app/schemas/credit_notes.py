from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

class CreditNoteStatus(str, Enum):
    DRAFT = "DRAFT"
    ISSUED = "ISSUED" # Finalized/Posted
    VOIDED = "VOIDED"

class CreditNoteLine(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    amount: float
    account_id: Optional[str] = None # Revenue/Returns account override

class CreditNoteCreate(BaseModel):
    customer_id: str
    date: str # ISO Date
    reason: str
    lines: List[CreditNoteLine]
    total: float
    note: Optional[str] = None
    invoice_links: Optional[List[str]] = [] # IDs of invoices this CN applies to (informational or functional)

class CreditNote(CreditNoteCreate):
    id: str
    number: str
    status: CreditNoteStatus
    company_id: str
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None
    journal_entry_id: Optional[str] = None
