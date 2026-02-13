from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, field_validator, model_validator
from decimal import Decimal

# --- Enums ---

class AccountType(str, Enum):
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    EQUITY = "EQUITY"
    REVENUE = "REVENUE"
    EXPENSE = "EXPENSE"

class DocumentStatus(str, Enum):
    DRAFT = "DRAFT"
    POSTED = "POSTED"
    VOIDED = "VOIDED"

class PaymentMethod(str, Enum):
    CASH = "CASH"
    BANK = "BANK"
    CHECK = "CHECK"
    CARD = "CARD"
    OTHERS = "OTHERS"

class SubledgerType(str, Enum):
    NONE = "NONE"
    CUSTOMER = "CUSTOMER"
    SUPPLIER = "SUPPLIER"
    EMPLOYEE = "EMPLOYEE"

# --- Chart of Accounts (COA) ---

class AccountBase(BaseModel):
    code: str
    name_ar: str
    name_en: str
    type: AccountType
    parent_id: Optional[str] = None
    is_group: bool = False
    is_reconcilable: bool = False
    currency: str = "IQD"
    company_id: str
    active: bool = True
    subledger_type: Optional[str] = None

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    id: str
    total_debit: str = "0.0000"
    total_credit: str = "0.0000"
    balance: str = "0.0000"

# --- Journal Entries ---

class JournalLineBase(BaseModel):
    account_id: str
    debit: str = "0.0000"
    credit: str = "0.0000"
    memo: Optional[str] = None
    cost_center_id: Optional[str] = None

class JournalEntryCreate(BaseModel):
    number: str
    date: datetime = datetime.now()
    description: Optional[str] = None
    lines: List[JournalLineBase]
    company_id: Optional[str] = None
    attachments: List[str] = []

    @model_validator(mode='after')
    def validate_balance(self) -> 'JournalEntryCreate':
        total_debit = sum(Decimal(line.debit) for line in self.lines)
        total_credit = sum(Decimal(line.credit) for line in self.lines)
        if abs(total_debit - total_credit) > Decimal("0.0001"):
            raise ValueError(f"Journal does not balance. Total Debit: {total_debit}, Total Credit: {total_credit}")
        return self

# --- Vouchers ---

class PaymentRequestCreate(BaseModel):
    request_number: str
    date: datetime = datetime.now()
    amount: str
    expense_account_id: str
    description: str
    attachments: List[str] = []
    company_id: str

class InvoicePayment(BaseModel):
    invoice_id: str
    amount: str

class PaymentVoucherCreate(BaseModel):
    voucher_number: str
    date: datetime = datetime.now()
    payee: str
    amount: str
    currency: str = "IQD"
    payment_method: PaymentMethod
    request_id: Optional[str] = None
    cash_bank_account_id: str # The source account (Cr)
    expense_account_id: str   # The destination account (Dr)
    linked_bills: List[InvoicePayment] = [] # Bills being settled
    company_id: Optional[str] = None # Injected by API

class ReceiptVoucherCreate(BaseModel):
    receipt_number: str
    date: datetime = datetime.now()
    customer_id: str
    amount: str
    currency: str = "IQD"
    payment_method: PaymentMethod
    cash_bank_account_id: str # The destination account (Dr)
    linked_invoices: List[InvoicePayment] = [] # Specific invoices settled
    company_id: Optional[str] = None # Injected by API

class CreditNoteCreate(BaseModel):
    cn_number: str
    date: datetime = datetime.now()
    customer_id: str
    original_invoice_ref: Optional[str] = None
    amount: str
    reason: str
    company_id: Optional[str] = None # Injected by API
