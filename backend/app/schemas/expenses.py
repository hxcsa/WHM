from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from enum import Enum

class ExpenseStatus(str, Enum):
    DRAFT = "DRAFT"
    PAID = "PAID"
    VOIDED = "VOIDED"

class ExpenseCreate(BaseModel):
    date: str # ISO
    description: str
    amount: float
    expense_account_id: str # The expense category (e.g. Rent, Utilities)
    payment_account_id: str # Where money came from (e.g. Cash, Bank)
    reference: Optional[str] = None
    vendor: Optional[str] = None
    notes: Optional[str] = None
    # No tax/lines for simple expenses yet, can add later

class Expense(ExpenseCreate):
    id: str
    number: str
    status: ExpenseStatus
    company_id: str
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None
    journal_entry_id: Optional[str] = None
