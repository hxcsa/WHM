from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class DocumentStatus(str, Enum):
    DRAFT = "DRAFT"
    POSTED = "POSTED"
    VOIDED = "VOIDED"

class AccountType(str, Enum):
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    EQUITY = "EQUITY"
    REVENUE = "REVENUE"
    EXPENSE = "EXPENSE"

class StorageType(str, Enum):
    DRY = "DRY"
    COLD = "COLD"
    FROZEN = "FROZEN"
    OTHER = "OTHER"

class UnitOfMeasure(BaseModel):
    id: Optional[str] = None
    code: str
    name: str
    description: Optional[str] = None
    company_id: str

class Warehouse(BaseModel):
    id: Optional[str] = None
    code: str
    name: str
    capacity: Optional[str] = None
    location: Optional[str] = None
    company_id: str

class Account(BaseModel):
    id: Optional[str] = None # Firestore Doc ID
    code: str
    name: str
    type: AccountType
    parent_id: Optional[str] = None
    is_group: bool = False

class JournalLine(BaseModel):
    account_id: str
    debit: str = "0.0000"  # Stored as string for precision
    credit: str = "0.0000"
    description: Optional[str] = None

class JournalEntry(BaseModel):
    id: Optional[str] = None
    number: str
    date: datetime = Field(default_factory=datetime.utcnow)
    description: Optional[str] = None
    status: DocumentStatus = DocumentStatus.DRAFT
    lines: List[JournalLine] = []
    
    source_document_id: Optional[str] = None
    source_document_type: Optional[str] = None

class Item(BaseModel):
    id: Optional[str] = None
    sku: str
    name: str
    barcode: Optional[str] = None
    description: Optional[str] = None
    unit: str # This should ideally be a UOM ID or Code
    storage_type: StorageType = StorageType.DRY
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    inventory_account_id: str
    cogs_account_id: str
    revenue_account_id: str
    customer_id: Optional[str] = None
    company_id: str

class StockMovement(BaseModel):
    id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    item_id: str
    warehouse_id: str
    
    quantity: str # Negative for OUT, Positive for IN
    unit_cost: str
    valuation_rate: str # WAC calculated at this point
    
    source_document_id: Optional[str] = None
    source_document_type: Optional[str] = None
