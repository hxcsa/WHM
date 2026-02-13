from typing import List, Optional
from datetime import datetime
from enum import Enum
from pydantic import BaseModel

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

class IntentStatus(str, Enum):
    REQUESTED = "requested"
    GUARANTEED = "guaranteed"
    REJECTED = "rejected"
    IN_WAREHOUSE = "in_warehouse"
    READY = "ready"
    DONE = "done"

class IntentType(str, Enum):
    GIVE = "give"
    GET = "get"

# --- Account Schemas ---
class AccountBase(BaseModel):
    code: str
    name: str
    type: AccountType
    is_group: bool = False
    parent_id: Optional[str] = None

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    id: str

# --- Item Schemas ---
class ItemBase(BaseModel):
    sku: str
    name: str
    barcode: Optional[str] = None
    unit: str
    storage_type: StorageType = StorageType.DRY
    selling_price: str = "0.0000"
    inventory_account_id: str
    cogs_account_id: str
    revenue_account_id: str
    customer_id: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: str
    current_qty: str = "0.0000"
    current_wac: str = "0.0000"
    total_value: str = "0.0000"
    created_at: Optional[datetime] = None

# --- Warehouse & UOM Schemas ---
class WarehouseBase(BaseModel):
    code: Optional[str] = None
    name: str
    capacity: Optional[str] = None
    location: Optional[str] = None

class WarehouseCreate(WarehouseBase):
    pass

class Warehouse(WarehouseBase):
    id: str

class UOMBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None

class UOMCreate(UOMBase):
    pass

class UOM(UOMBase):
    id: str

# --- Journal Schemas ---
class JournalLineBase(BaseModel):
    account_id: str
    debit: str = "0.0000"
    credit: str = "0.0000"
    description: Optional[str] = None

class JournalLineCreate(JournalLineBase):
    pass

class JournalEntryBase(BaseModel):
    number: str
    date: Optional[datetime] = None
    description: Optional[str] = None

class JournalEntryCreate(JournalEntryBase):
    lines: List[JournalLineCreate]

class AdjustmentStatus(str, Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    REJECTED = "rejected"

# --- Inventory Transaction Schemas ---
class GRNLine(BaseModel):
    item_id: str
    warehouse_id: str
    quantity: str
    unit_cost: str
    batch_number: Optional[str] = None

class GRNCreate(BaseModel):
    number: str
    date: Optional[datetime] = None
    lines: List[GRNLine]
    supplier_id: Optional[str] = None
    supplier_account_id: str

# --- Sales Transaction Schemas ---
class DeliveryNoteLine(BaseModel):
    item_id: str
    warehouse_id: str
    quantity: str
    batch_number: Optional[str] = None

class DeliveryNoteCreate(BaseModel):
    number: str
    date: Optional[datetime] = None
    lines: List[DeliveryNoteLine]
    customer_account_id: str

# --- Transfer & Adjustment Schemas ---
class TransferLine(BaseModel):
    item_id: str
    quantity: str
    batch_number: Optional[str] = None

class TransferCreate(BaseModel):
    number: str
    date: Optional[datetime] = None
    from_warehouse_id: str
    to_warehouse_id: str
    customer_id: str
    items: List[TransferLine]
    notes: Optional[str] = None

class AdjustmentLine(BaseModel):
    item_id: str
    quantity: str # Delta (positive for increase, negative for decrease)
    batch_number: Optional[str] = None

class AdjustmentCreate(BaseModel):
    number: str
    date: Optional[datetime] = None
    warehouse_id: str
    customer_id: str
    items: List[AdjustmentLine]
    notes: Optional[str] = None
    status: AdjustmentStatus = AdjustmentStatus.DRAFT

# --- Intent Schemas ---
class IntentItem(BaseModel):
    item_id: str
    quantity: str
    note: Optional[str] = None

class IntentBase(BaseModel):
    number: str
    client_id: str
    type: IntentType
    status: IntentStatus = IntentStatus.REQUESTED
    eta: Optional[datetime] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    delivery_guy: Optional[str] = None
    car_number: Optional[str] = None
    notes: Optional[str] = None

class IntentCreate(IntentBase):
    items: List[IntentItem]

class Intent(IntentBase):
    id: str
    items: List[IntentItem]
    created_at: datetime
    company_id: str
# --- User/Employee Schemas ---
class EmployeeCreate(BaseModel):
    email: str
    password: str
    role: str
    allowed_tabs: Optional[List[str]] = None
