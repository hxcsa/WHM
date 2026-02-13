from datetime import datetime
from typing import List, Optional
from google.cloud import firestore
from app.core.firebase import get_db
from app.schemas.credit_notes import CreditNoteCreate, CreditNoteStatus
from app.services.posting import PostingEngine
from app.services.accounting import AccountingService
from decimal import Decimal

class CreditNoteService:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db.collection("credit_notes")
        self.posting_engine = PostingEngine()

    def _next_number(self, company_id: str) -> str:
        year = datetime.now().strftime("%Y")
        counter_ref = self.db.collection("counters").document(f"credit_notes_{company_id}_{year}")
        
        transaction = self.db.transaction()
        @firestore.transactional
        def increment(transaction):
            snapshot = counter_ref.get(transaction=transaction)
            current = snapshot.to_dict().get("value", 0) if snapshot.exists else 0
            new_val = current + 1
            transaction.set(counter_ref, {"value": new_val})
            return new_val
        
        seq = increment(transaction)
        return f"CN-{year}-{seq:06d}"

    def create_credit_note(self, data: CreditNoteCreate, user: dict) -> str:
        """Create and Post a Credit Note."""
        company_id = user.get("company_id")
        
        # 1. Validate Customer
        cust_ref = self.db.collection("customers").document(data.customer_id)
        cust_snap = cust_ref.get()
        if not cust_snap.exists:
            raise ValueError("Customer not found")
        cust_data = cust_snap.to_dict()
        ar_account_id = cust_data.get("ar_account_id")
        if not ar_account_id:
            raise ValueError("Customer has no linked AR Account")

        # 2. Prepare Data
        cn_number = self._next_number(company_id)
        cn_data = data.model_dump()
        cn_data.update({
            "number": cn_number,
            "status": CreditNoteStatus.ISSUED, # Immediate posting for MVP
            "company_id": company_id,
            "created_at": firestore.SERVER_TIMESTAMP,
            "created_by": user.get("email"),
            "date": datetime.fromisoformat(data.date) if isinstance(data.date, str) else data.date
        })

        # 3. Transaction for GL Posting
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _execute(transaction):
            # Create CN Doc
            doc_ref = self.collection.document()
            
            # Prepare GL Lines
            # DEBIT: Sales Returns (or Revenue if reducing) - Usually 4xxx
            # CREDIT: Accounts Receivable (Customer) - 1xxx
            
            # For simplicity, we assume a default "Sales Returns" account if not specified per line
            # In a real app, this might come from settings. 
            # Resolve Default Sales/Returns Account
            acc_service = AccountingService()
            
            # Use '41' (Sales) as default code for returns if not specified
            sales_returns_id = acc_service.get_account_id_by_code(company_id, "41")
            
            # If still not found, try to find ANY revenue account
            if not sales_returns_id:
                rev_accounts = acc_service.get_accounts(company_id, type_filter="REVENUE")
                if rev_accounts:
                    sales_returns_id = rev_accounts[0]["id"]
            
            if not sales_returns_id:
                raise ValueError("No Revenue/Sales account found for company")
            
            lines = []
            total = Decimal("0")
            
            for line in data.lines:
                amount = Decimal(str(line.amount))
                total += amount
                
                # Debit Line (Revenue decrease/Return)
                lines.append({
                    "account_id": line.account_id or sales_returns_id, 
                    "debit": str(amount),
                    "credit": "0.00",
                    "memo": f"CN {cn_number}: {line.description}"
                })
            
            if abs(total - Decimal(str(data.total))) > Decimal("0.01"):
                # Warning: Line sum mismatch
                pass

            # Credit Line (AR reduction)
            lines.append({
                "account_id": ar_account_id,
                "debit": "0.00",
                "credit": str(total),
                "memo": f"Credit Note {cn_number}"
            })

            # Prepare Journal Entry Header
            je_data = {
                "number": f"JE-CN-{cn_number}",
                "date": cn_data["date"],
                "description": f"Credit Note for {cust_data.get('name', 'Customer')}",
                "status": "POSTED",
                "lines": lines,
                "company_id": company_id,
                "source_doc_id": doc_ref.id,
                "source_doc_type": "CREDIT_NOTE"
            }

            # Post to GL
            account_ids = list(set(l["account_id"] for l in lines))
            accounts_data = self.posting_engine.get_accounts_for_transaction(transaction, account_ids)
            
            # NOW perform all writes
            je_ref = self.db.collection("journal_entries").document()
            transaction.set(je_ref, je_data)
            self.posting_engine.post_journal_entry(transaction, je_ref.id, lines, accounts_data)

            # Save CN
            cn_data["journal_entry_id"] = je_ref.id
            transaction.set(doc_ref, cn_data)
            
            return doc_ref.id

        return _execute(transaction)

    def list_credit_notes(self, company_id: str) -> List[dict]:
        # Sort in memory to avoid index requirements for now
        docs = self.collection.where("company_id", "==", company_id).stream()
        results = [{"id": d.id, **d.to_dict()} for d in docs]
        
        def get_date_val(x):
            d = x.get("date")
            if hasattr(d, "timestamp"): return d.timestamp()
            if isinstance(d, str): return d
            return ""

        return sorted(results, key=get_date_val, reverse=True)
