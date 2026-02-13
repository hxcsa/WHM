from decimal import Decimal
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from google.cloud import firestore
from app.core.firebase import get_db
from app.models.core import DocumentStatus
from app.services.posting import PostingEngine

class ReturnCreate(BaseModel):
    number: str
    original_document_id: str
    original_document_type: str  # "GRN" or "DO"
    lines: list
    reason: str

class TransferCreate(BaseModel):
    number: str
    from_warehouse_id: str
    to_warehouse_id: str
    lines: list  # [{item_id, quantity}]

class IntegrationService:
    """Handles Returns, Transfers, and complex integrations."""
    
    def __init__(self):
        self.db = get_db()
        self.posting_engine = PostingEngine()

    async def create_sales_return(self, data: ReturnCreate):
        """Reverses a Delivery Note: Stock In + Reverse COGS/Revenue."""
        transaction = self.db.transaction()
        return self._do_sales_return(transaction, data)

    @firestore.transactional
    def _do_sales_return(self, transaction, data: ReturnCreate):
        # 1. Create reversal Journal Entry
        je_ref = self.db.collection("journal_entries").document()
        je_id = je_ref.id
        
        lines_data = []
        total_cogs = Decimal("0")
        total_sales = Decimal("0")

        for line in data.lines:
            item_id = line["item_id"]
            quantity = Decimal(str(line["quantity"]))
            
            # Get item data
            item_snap = self.db.collection("items").document(item_id).get(transaction=transaction)
            item_data = item_snap.to_dict()
            wac = Decimal(item_data.get("current_wac", "0"))
            
            # Stock IN (positive movement)
            self.posting_engine.record_stock_movement(
                transaction, item_id, line["warehouse_id"],
                quantity, wac, je_id, "RETURN"
            )
            
            cogs_value = quantity * wac
            sales_value = Decimal(str(line.get("unit_price", wac))) * quantity
            
            total_cogs += cogs_value
            total_sales += sales_value
            
            # Reverse COGS (Credit COGS, Debit Inventory)
            lines_data.append({
                "account_id": item_data["inventory_account_id"],
                "debit": str(cogs_value), "credit": "0.0000",
                "description": f"Return Stock In: {item_data['sku']}"
            })
            lines_data.append({
                "account_id": item_data["cogs_account_id"],
                "debit": "0.0000", "credit": str(cogs_value),
                "description": f"Reverse COGS: {item_data['sku']}"
            })

        # Reverse Revenue (Debit Revenue, Credit Receivable)
        lines_data.append({
            "account_id": data.lines[0].get("revenue_account_id", ""),
            "debit": str(total_sales), "credit": "0.0000",
            "description": f"Reverse Revenue for Return {data.number}"
        })
        lines_data.append({
            "account_id": data.lines[0].get("receivable_account_id", ""),
            "debit": "0.0000", "credit": str(total_sales),
            "description": f"Reduce Receivable for Return {data.number}"
        })

        transaction.set(je_ref, {
            "number": f"JE-RET-{data.number}",
            "date": firestore.SERVER_TIMESTAMP,
            "description": f"Sales Return: {data.reason}",
            "status": DocumentStatus.DRAFT,
            "source_document_type": "RETURN",
            "lines": lines_data
        })
        
        # Pre-fetch accounts
        account_ids = list(set(line["account_id"] for line in lines_data))
        accounts_data = self.posting_engine.get_accounts_for_transaction(transaction, account_ids)
        
        self.posting_engine.post_journal_entry(transaction, je_id, lines_data, accounts_data)
        return je_id

    async def create_purchase_return(self, data: ReturnCreate):
        """Reverses a GRN: Stock OUT + Reverse Payable."""
        transaction = self.db.transaction()
        return self._do_purchase_return(transaction, data)

    @firestore.transactional
    def _do_purchase_return(self, transaction, data: ReturnCreate):
        je_ref = self.db.collection("journal_entries").document()
        je_id = je_ref.id
        
        total_value = Decimal("0")
        lines_data = []

        for line in data.lines:
            item_id = line["item_id"]
            quantity = Decimal(str(line["quantity"]))
            
            item_snap = self.db.collection("items").document(item_id).get(transaction=transaction)
            item_data = item_snap.to_dict()
            wac = Decimal(item_data.get("current_wac", "0"))
            
            # Stock OUT (negative)
            self.posting_engine.record_stock_movement(
                transaction, item_id, line["warehouse_id"],
                -quantity, wac, je_id, "PURCHASE_RETURN"
            )
            
            value = quantity * wac
            total_value += value
            
            # Reverse Inventory (Credit)
            lines_data.append({
                "account_id": item_data["inventory_account_id"],
                "debit": "0.0000", "credit": str(value),
                "description": f"Return to Supplier: {item_data['sku']}"
            })

        # Reverse Payable (Debit Payable)
        lines_data.append({
            "account_id": line.get("payable_account_id", ""),
            "debit": str(total_value), "credit": "0.0000",
            "description": f"Reduce Payable for Return {data.number}"
        })

        transaction.set(je_ref, {
            "number": f"JE-PRET-{data.number}",
            "date": firestore.SERVER_TIMESTAMP,
            "description": f"Purchase Return: {data.reason}",
            "status": DocumentStatus.DRAFT,
            "source_document_type": "PURCHASE_RETURN",
            "lines": lines_data
        })
        
        # Pre-fetch accounts
        account_ids = list(set(line["account_id"] for line in lines_data))
        accounts_data = self.posting_engine.get_accounts_for_transaction(transaction, account_ids)

        self.posting_engine.post_journal_entry(transaction, je_id, lines_data, accounts_data)
        return je_id

    async def create_stock_transfer(self, data: TransferCreate):
        """Transfers stock between warehouses. No financial impact."""
        for line in data.lines:
            item_id = line["item_id"]
            quantity = Decimal(str(line["quantity"]))
            
            item_snap = self.db.collection("items").document(item_id).get()
            item_data = item_snap.to_dict()
            wac = Decimal(item_data.get("current_wac", "0"))
            
            # OUT from source warehouse
            self.db.collection("stock_ledger").add({
                "timestamp": firestore.SERVER_TIMESTAMP,
                "item_id": item_id,
                "warehouse_id": data.from_warehouse_id,
                "quantity": str(-quantity),
                "unit_cost": str(wac),
                "valuation_rate": str(wac),
                "source_document_type": "TRANSFER_OUT"
            })
            
            # IN to destination warehouse
            self.db.collection("stock_ledger").add({
                "timestamp": firestore.SERVER_TIMESTAMP,
                "item_id": item_id,
                "warehouse_id": data.to_warehouse_id,
                "quantity": str(quantity),
                "unit_cost": str(wac),
                "valuation_rate": str(wac),
                "source_document_type": "TRANSFER_IN"
            })
        
        return {"message": f"Transfer {data.number} completed"}
