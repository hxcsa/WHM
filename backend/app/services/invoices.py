from datetime import datetime, timedelta
from typing import List, Optional
from google.cloud import firestore
from app.core.firebase import get_db
from app.schemas.invoices import InvoiceCreate, InvoiceUpdate, InvoiceStatus, Invoice
from app.schemas.accounting import JournalEntryCreate, JournalLineBase
from app.services.accounting import AccountingService
from app.services.posting import PostingEngine
from decimal import Decimal


class InvoiceService:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db.collection("invoices")
        self.posting_engine = PostingEngine()

    def _next_invoice_number(self, company_id: str) -> str:
        """Generate INV-YYYY-NNNNNN using a Firestore counter."""
        year = datetime.now().strftime("%Y")
        counter_ref = self.db.collection("counters").document(f"invoices_{company_id}_{year}")
        
        transaction = self.db.transaction()
        
        @firestore.transactional
        def increment(transaction):
            snapshot = counter_ref.get(transaction=transaction)
            if snapshot.exists:
                current = snapshot.to_dict().get("value", 0)
            else:
                current = 0
            new_val = current + 1
            transaction.set(counter_ref, {"value": new_val})
            return new_val
        
        seq = increment(transaction)
        return f"INV-{year}-{seq:06d}"

    def create_invoice(self, data: InvoiceCreate, user: dict) -> str:
        """Create a new invoice in DRAFT status."""
        company_id = user.get("company_id")
        doc_ref = self.collection.document()
        
        invoice_data = data.model_dump()
        
        # Server-side total validation
        computed_subtotal = sum(line["quantity"] * line["unit_price"] for line in invoice_data.get("lines", []))
        computed_discount = sum(line.get("discount", 0) for line in invoice_data.get("lines", []))
        computed_total = computed_subtotal - computed_discount
        
        # Auto generate number
        invoice_number = data.invoice_number or self._next_invoice_number(company_id)
        
        # Auto dates
        now = datetime.now()
        issue_date = data.issue_date or now
        due_days = data.due_days or 30
        due_date = data.due_date or (issue_date + timedelta(days=due_days))
        
        invoice_data.update({
            "status": InvoiceStatus.DRAFT,
            "created_at": firestore.SERVER_TIMESTAMP,
            "created_by": user.get("email"),
            "company_id": company_id,
            "invoice_number": invoice_number,
            "issue_date": issue_date,
            "due_date": due_date,
            "subtotal": computed_subtotal,
            "discount_total": computed_discount,
            "total": computed_total,
            "remaining_amount": computed_total,
            "paid_amount": 0.0,
        })
        
        doc_ref.set(invoice_data)
        return doc_ref.id

    def update_invoice(self, invoice_id: str, data: InvoiceUpdate, user: dict) -> dict:
        """Update a DRAFT invoice only."""
        doc_ref = self.collection.document(invoice_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise ValueError("Invoice not found")
        
        current = doc.to_dict()
        if current.get("status") != InvoiceStatus.DRAFT:
            raise ValueError("Only DRAFT invoices can be edited")
        
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        
        # If lines are updated, recompute totals
        if "lines" in update_data:
            lines = update_data["lines"]
            update_data["subtotal"] = sum(l["quantity"] * l["unit_price"] for l in lines)
            update_data["discount_total"] = sum(l.get("discount", 0) for l in lines)
            update_data["total"] = update_data["subtotal"] - update_data["discount_total"]
            update_data["remaining_amount"] = update_data["total"] - current.get("paid_amount", 0)
        
        update_data["updated_at"] = firestore.SERVER_TIMESTAMP
        update_data["updated_by"] = user.get("email")
        doc_ref.update(update_data)
        return {"id": invoice_id, **current, **update_data}

    def list_invoices(self, company_id: str, status: Optional[str] = None, 
                      customer_id: Optional[str] = None, 
                      date_from: Optional[datetime] = None, 
                      date_to: Optional[datetime] = None,
                      page: int = 1,
                      page_size: int = 20) -> dict:
        """List invoices with filters and pagination."""
        from google.cloud.firestore_v1.base_query import FieldFilter
        
        query = self.collection.where(filter=FieldFilter("company_id", "==", company_id))
        
        if status:
            query = query.where(filter=FieldFilter("status", "==", status))
        if customer_id:
            query = query.where(filter=FieldFilter("customer_id", "==", customer_id))
        if date_from:
            query = query.where(filter=FieldFilter("issue_date", ">=", date_from))
        if date_to:
            query = query.where(filter=FieldFilter("issue_date", "<=", date_to))
            
        query = query.order_by("issue_date", direction=firestore.Query.DESCENDING)
        
        offset = (page - 1) * page_size
        docs = query.offset(offset).limit(page_size).stream()
        
        invoices = [{"id": d.id, **d.to_dict()} for d in docs]
        
        return {
            "invoices": invoices,
            "page": page,
            "page_size": page_size,
            "total_count": -1
        }

    def get_invoice(self, invoice_id: str) -> Optional[dict]:
        doc = self.collection.document(invoice_id).get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        return None

    def mark_issued(self, invoice_id: str, user: dict) -> dict:
        """Transition DRAFT -> ISSUED. Lock editing and Post to Ledger."""
        doc_ref = self.collection.document(invoice_id)
        
        transaction = self.db.transaction()

        @firestore.transactional
        def _execute(transaction):
            doc = doc_ref.get(transaction=transaction)
            if not doc.exists:
                raise ValueError("Invoice not found")
            
            data = doc.to_dict()
            if data["status"] != InvoiceStatus.DRAFT:
                raise ValueError("Only DRAFT invoices can be issued")

            company_id = data["company_id"]
            
            # 1. Look up Customer AR Account
            customer_ref = self.db.collection("customers").document(data["customer_id"])
            customer_snap = customer_ref.get(transaction=transaction)
            if not customer_snap.exists:
                raise ValueError("Customer not found")
            
            customer_data = customer_snap.to_dict()
            
            # Dynamic Resolve Account IDs
            ar_account_id = customer_data.get("ar_account_id")
            if not ar_account_id:
                # Resolve code "122" within transaction
                ar_query = self.db.collection("accounts")\
                    .where("company_id", "==", company_id)\
                    .where("code", "==", "122")\
                    .limit(1)
                ar_snaps = ar_query.get(transaction=transaction)
                if ar_snaps:
                    ar_account_id = ar_snaps[0].id
                else:
                    ar_account_id = "122" # Final fallback

            # 2. Prepare Journal Lines
            # Dr Receivable (AR)
            # Cr Revenue (Sales)
            lines = [
                JournalLineBase(
                    account_id=ar_account_id,
                    debit=str(data["total"]),
                    credit="0.0000",
                    memo=f"Invoice Issued: {data['invoice_number']}"
                )
            ]
            
            # Collect revenue lines per item or grouped
            # For now, we'll use a single Revenue line for simplicity or one per item
            revenue_account_id = data.get("revenue_account_id")
            if not revenue_account_id:
                # Resolve code "41" within transaction
                rev_query = self.db.collection("accounts")\
                    .where("company_id", "==", company_id)\
                    .where("code", "==", "41")\
                    .limit(1)
                rev_snaps = rev_query.get(transaction=transaction)
                if rev_snaps:
                    revenue_account_id = rev_snaps[0].id
                else:
                    revenue_account_id = "41"
            
            # If items have specific revenue accounts, we should use them
            # Checking if lines have product info
            lines.append(
                JournalLineBase(
                    account_id=revenue_account_id,
                    debit="0.0000",
                    credit=str(data["total"]),
                    memo=f"Revenue from Invoice: {data['invoice_number']}"
                )
            )

            # 3. Create Journal Entry
            je_ref = self.db.collection("journal_entries").document()
            je_lines_dict = [line.model_dump() for line in lines]
            
            transaction.set(je_ref, {
                "number": f"JE-INV-{data['invoice_number']}",
                "date": firestore.SERVER_TIMESTAMP,
                "description": f"Invoice {data['invoice_number']} to {data['customer_name']}",
                "status": "POSTED",
                "lines": je_lines_dict,
                "company_id": company_id,
                "source_doc_id": invoice_id,
                "source_doc_type": "INV"
            })

            # 4. Post using Engine
            # Pre-fetch accounts for atomic balance updates
            je_lines_dict = [line.model_dump() for line in lines]
            account_ids = list(set(line["account_id"] for line in je_lines_dict))
            accounts_data = self.posting_engine.get_accounts_for_transaction(transaction, account_ids)
            
            self.posting_engine.post_journal_entry(transaction, je_ref.id, je_lines_dict, accounts_data)

            # 5. Lock Invoice
            update_data = {
                "status": InvoiceStatus.ISSUED,
                "journal_id": je_ref.id,
                "updated_at": firestore.SERVER_TIMESTAMP,
                "updated_by": user.get("email")
            }
            transaction.update(doc_ref, update_data)
            return {**data, **update_data}

        return _execute(transaction)

    def mark_paid(self, invoice_id: str, amount: float, payment_method: str, user: dict, transaction: firestore.Transaction = None) -> dict:
        """Record payment against invoice. Internal method or for standard API."""
        doc_ref = self.collection.document(invoice_id)
        
        if transaction is None:
            transaction = self.db.transaction()
            return self._execute_mark_paid(transaction, doc_ref, amount, payment_method, user)
        else:
            return self._execute_mark_paid(transaction, doc_ref, amount, payment_method, user)

    def _execute_mark_paid(self, transaction, doc_ref, amount: float, payment_method: str, user: dict):
        snapshot = doc_ref.get(transaction=transaction)
        if not snapshot.exists:
            raise ValueError("Invoice not found")
            
        data = snapshot.to_dict()
        current_paid = Decimal(str(data.get("paid_amount", "0")))
        new_paid = current_paid + Decimal(str(amount))
        total = Decimal(str(data.get("total", "0")))
        new_remaining = total - new_paid
        
        if new_paid > total + Decimal("0.0001"):
            raise ValueError(f"Overpayment detected: Total is {total}, trying to set paid_amount to {new_paid}")

        status = data["status"]
        if new_remaining <= Decimal("0.0001"):
            status = InvoiceStatus.PAID
            new_remaining = 0
        elif new_remaining < total:
            # We don't have a PARTIAL status in enum yet, staying ISSUED or adding one?
            # Let's keep ISSUED but update numbers.
            pass
            
        transaction.update(doc_ref, {
            "paid_amount": str(new_paid),
            "remaining_amount": str(new_remaining),
            "status": status,
            "updated_at": firestore.SERVER_TIMESTAMP,
            "last_payment_date": firestore.SERVER_TIMESTAMP
        })
        
        return {**data, "paid_amount": str(new_paid), "status": status}

    def void_invoice(self, invoice_id: str, reason: str, user: dict) -> dict:
        """Void an invoice."""
        doc_ref = self.collection.document(invoice_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise ValueError("Invoice not found")
        
        doc_ref.update({
            "status": InvoiceStatus.VOIDED,
            "void_reason": reason,
            "voided_at": firestore.SERVER_TIMESTAMP,
            "voided_by": user.get("email")
        })
        
        return {"status": InvoiceStatus.VOIDED}


def get_invoice_service() -> InvoiceService:
    return InvoiceService()
