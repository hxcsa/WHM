from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class AddressModel(BaseModel):
    city: Optional[str] = None
    state: Optional[str] = None
    street: Optional[str] = None
    notes: Optional[str] = None


class CustomerCreate(BaseModel):
    first_name: str
    last_name: str
    company_name: Optional[str] = None
    phone: str  # Required, unique per company
    email: Optional[str] = None
    address: Optional[AddressModel] = None
    status: str = "active"
    ar_account_id: Optional[str] = None
    ap_account_id: Optional[str] = None # For customers who are also suppliers


class CustomerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[AddressModel] = None
    status: Optional[str] = None


class Customer(CustomerCreate):
    id: str
    company_id: Optional[str] = None
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None
