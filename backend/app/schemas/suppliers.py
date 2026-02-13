from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    tax_id: Optional[str] = None
    ap_account_id: Optional[str] = None # Control account link
    status: str = "active"

class SupplierCreate(SupplierBase):
    pass

class Supplier(SupplierBase):
    id: str
    company_id: Optional[str] = None
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None
