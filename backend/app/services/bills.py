from datetime import datetime
from decimal import Decimal
from typing import Optional
from google.cloud import firestore
from app.core.firebase import get_db
from app.schemas.bills import BillCreate, BillStatus
from app.schemas.accounting import JournalEntryCreate, JournalLineBase
from .posting import PostingEngine


class BillService:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db.collection("bills")
        self.posting_engine = PostingEngine()

        # 4. Accounting Transaction (Inside Firestore Transaction for safety)
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _execute(transaction):
            # 1. PRE-FETCH DATA (Read Phase)
            supplier_snap = self.db.collection("suppliers").document(data.supplier_id).get(transaction=transaction)
            if not supplier_snap.exists:
                raise ValueError("Supplier not found")
            supplier_data = supplier_snap.to_dict()
            
            ap_account_id = supplier_data.get("ap_account_id")
            if not ap_account_id:
                # Resolve code "21"
                ap_query = self.db.collection("accounts").where("company_id", "==", company_id).where("code", "==", "21").limit(1)
                ap_snaps = ap_query.get(transaction=transaction)
                ap_account_id = ap_snaps[0].id if ap_snaps else "21"

            expense_account_id = "52" # Fallback
            exp_query = self.db.collection("accounts").where("company_id", "==", company_id).where("code", "==", "52").limit(1)
            exp_snaps = exp_query.get(transaction=transaction)
            if exp_snaps:
                expense_account_id = exp_snaps[0].id

            # 2. PERFORM WRITES (Write Phase)
            lines = []
            # CR AP
            lines.append(JournalLineBase(
                account_id=ap_account_id,
                debit="0.0000",
                credit=str(total),
                memo=f"Bill Recorded: {bill_data['bill_number']}"
            ))
            
            # DR Expenses
            lines.append(JournalLineBase(
                account_id=expense_account_id,
                debit=str(total),
                credit="0.0000",
                memo=f"Expenses from Bill: {bill_data['bill_number']}"
            ))
            
            je_ref = self.db.collection("journal_entries").document()
            je_lines_dict = [line.model_dump() for line in lines]
            
            transaction.set(je_ref, {
                "number": f"JE-BILL-{bill_data['bill_number']}",
                "date": firestore.SERVER_TIMESTAMP,
                "description": f"Bill from {supplier_data.get('name')}",
                "status": "POSTED",
                "lines": je_lines_dict,
                "company_id": company_id,
                "source_doc_id": doc_ref.id,
                "source_doc_type": "BILL"
            })
            
            # Pre-fetch accounts for posting
            account_ids = list(set(line["account_id"] for line in je_lines_dict))
            accounts_data = self.posting_engine.get_accounts_for_transaction(transaction, account_ids)
            
            self.posting_engine.post_journal_entry(transaction, je_ref.id, je_lines_dict, accounts_data)
            
            bill_data["journal_id"] = je_ref.id
            bill_data["supplier_name"] = supplier_data.get("name")
            transaction.set(doc_ref, bill_data)
            return doc_ref.id

        return _execute(transaction)

    def mark_paid(self, bill_id: str, amount: float, user: dict, transaction: firestore.Transaction = None):
        """Reduces balance of a bill."""
        doc_ref = self.collection.document(bill_id)
        
        def _logic(txn):
            snap = doc_ref.get(transaction=txn)
            if not snap.exists: raise ValueError("Bill not found")
            
            data = snap.to_dict()
            current_paid = Decimal(str(data.get("paid_amount", "0")))
            new_paid = current_paid + Decimal(str(amount))
            total = Decimal(str(data.get("total", "0")))
            new_remaining = total - new_paid
            
            if new_paid > total + Decimal("0.0001"):
                raise ValueError(f"Overpayment detected for Bill {bill_id}")

            status = data["status"]
            if new_remaining <= Decimal("0.0001"):
                status = BillStatus.PAID
                new_remaining = Decimal("0")
                
            txn.update(doc_ref, {
                "paid_amount": str(new_paid),
                "remaining_amount": str(new_remaining),
                "status": status,
                "updated_at": firestore.SERVER_TIMESTAMP
            })

        if transaction:
            _logic(transaction)
        else:
            transaction = self.db.transaction()
            transaction.transactional(_logic)(transaction)
