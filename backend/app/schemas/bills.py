from typing import List, Optional
from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class BillStatus(str, Enum):
    DRAFT = "DRAFT"
    POSTED = "POSTED"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    VOIDED = "VOIDED"

class BillLine(BaseModel):
    item_id: Optional[str] = None
    description: str
    quantity: float
    unit_cost: float
    total: float

class BillCreate(BaseModel):
    bill_number: Optional[str] = None
    supplier_id: str
    date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    lines: List[BillLine]
    notes: Optional[str] = None

class Bill(BaseModel):
    id: str
    bill_number: str
    supplier_id: str
    supplier_name: str
    date: datetime
    due_date: datetime
    total: float
    paid_amount: float = 0.0
    remaining_amount: float
    status: BillStatus
    company_id: str
    journal_id: Optional[str] = None
