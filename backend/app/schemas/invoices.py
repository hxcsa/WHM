from typing import List, Optional
from datetime import datetime
from enum import Enum
from pydantic import BaseModel

class InvoiceStatus(str, Enum):
    DRAFT = "DRAFT"
    ISSUED = "ISSUED"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    VOIDED = "VOIDED"

class InvoiceLine(BaseModel):
    product_id: Optional[str] = None
    description: str
    quantity: float
    unit_price: float
    discount: float = 0.0
    total: float

class InvoiceBase(BaseModel):
    invoice_number: Optional[str] = None  # Auto-generated if empty
    customer_id: Optional[str] = None
    customer_name: str
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    due_days: int = 30
    warehouse_id: Optional[str] = None
    warehouse_name: Optional[str] = None
    invoice_type: Optional[str] = "sale"  # sale, delivery, service
    time: Optional[str] = None
    driver_name: Optional[str] = None
    vehicle_info: Optional[str] = None
    important_notes: Optional[str] = None
    notes: Optional[str] = None
    
    subtotal: float = 0.0
    discount_total: float = 0.0
    tax_total: float = 0.0
    total: float = 0.0
    paid_amount: float = 0.0
    remaining_amount: float = 0.0
    
    lines: List[InvoiceLine] = []

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceUpdate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    warehouse_id: Optional[str] = None
    warehouse_name: Optional[str] = None
    invoice_type: Optional[str] = None
    time: Optional[str] = None
    driver_name: Optional[str] = None
    vehicle_info: Optional[str] = None
    important_notes: Optional[str] = None
    notes: Optional[str] = None
    due_days: Optional[int] = None
    due_date: Optional[datetime] = None
    subtotal: Optional[float] = None
    discount_total: Optional[float] = None
    tax_total: Optional[float] = None
    total: Optional[float] = None
    lines: Optional[List[InvoiceLine]] = None

class Invoice(InvoiceBase):
    id: str
    status: InvoiceStatus
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    company_id: Optional[str] = None
