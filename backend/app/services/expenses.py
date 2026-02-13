from datetime import datetime
from typing import List, Optional
from google.cloud import firestore
from app.core.firebase import get_db
from app.schemas.expenses import ExpenseCreate, ExpenseStatus
from app.services.posting import PostingEngine
from decimal import Decimal

class ExpenseService:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db.collection("expenses")
        self.posting_engine = PostingEngine()

    def _next_number(self, company_id: str) -> str:
        year = datetime.now().strftime("%Y")
        counter_ref = self.db.collection("counters").document(f"expenses_{company_id}_{year}")
        
        transaction = self.db.transaction()
        @firestore.transactional
        def increment(transaction):
            snapshot = counter_ref.get(transaction=transaction)
            current = snapshot.to_dict().get("value", 0) if snapshot.exists else 0
            new_val = current + 1
            transaction.set(counter_ref, {"value": new_val})
            return new_val
        
        seq = increment(transaction)
        return f"EXP-{year}-{seq:06d}"

    def create_expense(self, data: ExpenseCreate, user: dict) -> str:
        """Create and Post an Expense."""
        company_id = user.get("company_id")
        
        # 1. Validate Accounts
        # We trust the frontend provides valid Account IDs, but good to check existence if strict.
        # For performance, we skip strict existence check here and rely on PostingEngine to fail if account missing?
        # PostingEngine just ignores missing accounts in cache? No, let's verify.
        
        # 2. Prepare Data
        exp_number = self._next_number(company_id)
        exp_data = data.model_dump()
        exp_data.update({
            "number": exp_number,
            "status": ExpenseStatus.PAID, # Instant payment for now
            "company_id": company_id,
            "created_at": firestore.SERVER_TIMESTAMP,
            "created_by": user.get("email"),
            "date": datetime.fromisoformat(data.date) if isinstance(data.date, str) else data.date
        })

        # 3. Transaction
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _execute(transaction):
            doc_ref = self.collection.document()
            
            # GL Entry
            # DEBIT: Expense Account
            # CREDIT: Payment Account (Cash/Bank)
            
            amount = Decimal(str(data.amount))
            
            lines = [
                {
                    "account_id": data.expense_account_id,
                    "debit": str(amount),
                    "credit": "0.00",
                    "memo": f"Exp: {data.description}"
                },
                {
                    "account_id": data.payment_account_id,
                    "debit": "0.00",
                    "credit": str(amount),
                    "memo": f"Payment for {exp_number}"
                }
            ]
            
            # Prepare Journal Entry Header
            je_data = {
                "number": f"JE-EXP-{exp_number}",
                "date": exp_data["date"],
                "description": f"Expense: {data.description}",
                "status": "POSTED",
                "lines": lines,
                "company_id": company_id,
                "source_doc_id": doc_ref.id,
                "source_doc_type": "EXPENSE"
            }
            
            # Post
            account_ids = [data.expense_account_id, data.payment_account_id]
            accounts_data = self.posting_engine.get_accounts_for_transaction(transaction, account_ids)
            
            # NOW perform all writes
            je_ref = self.db.collection("journal_entries").document()
            transaction.set(je_ref, je_data)
            self.posting_engine.post_journal_entry(transaction, je_ref.id, lines, accounts_data)
            
            # Save Expense
            exp_data["journal_entry_id"] = je_ref.id
            transaction.set(doc_ref, exp_data)
            
            return doc_ref.id

        return _execute(transaction)

    def list_expenses(self, company_id: str) -> List[dict]:
        # Sort in memory to avoid index requirements for now
        docs = self.collection.where("company_id", "==", company_id).stream()
        results = [{"id": d.id, **d.to_dict()} for d in docs]
        return sorted(results, key=lambda x: x.get("date", ""), reverse=True)
