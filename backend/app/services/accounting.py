from typing import List, Dict, Any, Optional
from app.core.firebase import get_db
from app.models.core import DocumentStatus
from app.schemas.accounting import JournalEntryCreate, AccountCreate
from .posting import PostingEngine
from google.cloud import firestore
from decimal import Decimal

class AccountingService:
    def __init__(self):
        self.db = get_db()
        self.posting_engine = PostingEngine()

    def get_account_id_by_code(self, company_id: str, code: str) -> Optional[str]:
        """Resolve a document ID from an account code."""
        docs = list(self.db.collection("accounts")
                    .where("company_id", "==", company_id)
                    .where("code", "==", code)
                    .limit(1).stream())
        return docs[0].id if docs else None

    def get_accounts(self, company_id: str, type_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch all accounts for a company with optional type filtering."""
        try:
            print(f"Db get accounts for {company_id}, type={type_filter}")
            # Base query
            query = self.db.collection("accounts").where("company_id", "==", company_id)
            
            if type_filter:
                query = query.where("type", "==", type_filter)
            
            # Try with ordering first
            try:
                docs = query.order_by("code").stream()
                return [{"id": doc.id, **doc.to_dict()} for doc in docs]
            except Exception as e:
                print(f"⚠️ Index missing or query failed with order_by: {e}")
                print("Falling back to client-side sorting...")
                
                # Fallback: fetch without Sort, then sort in Python
                # Re-build query without order_by
                query = self.db.collection("accounts").where("company_id", "==", company_id)
                if type_filter:
                    query = query.where("type", "==", type_filter)
                    
                docs = query.stream()
                results = [{"id": doc.id, **doc.to_dict()} for doc in docs]
                return sorted(results, key=lambda x: x.get("code", ""))
                
        except Exception as e:
            print(f"❌ Critical error in get_accounts: {e}")
            raise

    def get_accounts_tree(self, company_id: str) -> List[Dict[str, Any]]:
        """Fetch accounts and build a tree-view hierarchy."""
        accounts = self.get_accounts(company_id)
        
        # Build lookup map
        lookup = {acc["id"]: {**acc, "children": []} for acc in accounts}
        tree = []
        
        for acc_id, acc in lookup.items():
            parent_id = acc.get("parent_id")
            if parent_id and parent_id in lookup:
                lookup[parent_id]["children"].append(acc)
            else:
                tree.append(acc)
                
        return tree

    def create_journal_entry(self, data: JournalEntryCreate):
        """Creates and posts a journal entry synchronously within a transaction."""
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _execute(transaction, db, posting_engine, data):
            je_ref = db.collection("journal_entries").document()
            
            lines_data = []
            for line in data.lines:
                lines_data.append({
                    "account_id": line.account_id,
                    "debit": str(line.debit),
                    "credit": str(line.credit),
                    "memo": line.memo or ""
                })

            # Pre-fetch accounts for atomic balance updates
            account_ids = list(set(line["account_id"] for line in lines_data))
            accounts_data = posting_engine.get_accounts_for_transaction(transaction, account_ids)

            transaction.set(je_ref, {
                "number": data.number,
                "date": data.date,
                "description": data.description,
                "status": "POSTED", 
                "lines": lines_data,
                "flat_account_ids": account_ids,
                "company_id": data.company_id,
                "attachments": data.attachments
            })

            # Pass pre-fetched data to posting engine
            posting_engine.post_journal_entry(transaction, je_ref.id, lines_data, accounts_data)
            return je_ref.id

        return _execute(transaction, self.db, self.posting_engine, data)
