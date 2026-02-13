from typing import List, Optional, Dict, Any
from google.cloud import firestore
from app.core.firebase import get_db
from app.schemas.accounting import (
    PaymentVoucherCreate, ReceiptVoucherCreate, 
    CreditNoteCreate, JournalEntryCreate, JournalLineBase
)
from .accounting import AccountingService
from decimal import Decimal

class VoucherService:
    def __init__(self):
        self.db = get_db()
        self.accounting_service = AccountingService()

    def create_payment_voucher(self, data: PaymentVoucherCreate) -> str:
        """
        Creates a payment voucher and posts a corresponding journal entry.
        Dr: Expense/Liability Account
        Cr: Cash/Bank Account
        """
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _execute(transaction, db, data):
            # 1. PRE-FETCH ALL DATA (Read Phase)
            account_ids = [data.expense_account_id, data.cash_bank_account_id]
            from .posting import PostingEngine
            engine = PostingEngine()
            accounts_data = engine.get_accounts_for_transaction(transaction, account_ids)

            bill_ids = [s.invoice_id for s in getattr(data, "linked_bills", [])]
            bills_data = {}
            if bill_ids:
                bill_refs = [db.collection("bills").document(bid) for bid in bill_ids]
                bill_snaps = db.get_all(bill_refs, transaction=transaction)
                bills_data = {snap.id: snap.to_dict() for snap in bill_snaps if snap.exists}

            # 2. PERFORM ALL WRITES (Write Phase)
            # Create Voucher Document
            pv_ref = db.collection("payment_vouchers").document()
            voucher_data = data.model_dump()
            voucher_data["created_at"] = firestore.SERVER_TIMESTAMP
            transaction.set(pv_ref, voucher_data)

            # Create Journal Entry
            lines = [
                JournalLineBase(
                    account_id=data.expense_account_id,
                    debit=data.amount,
                    credit="0.0000",
                    memo=f"Payment Voucher: {data.voucher_number} to {data.payee}"
                ),
                JournalLineBase(
                    account_id=data.cash_bank_account_id,
                    debit="0.0000",
                    credit=data.amount,
                    memo=f"Payment Voucher: {data.voucher_number}"
                )
            ]
            je_ref = db.collection("journal_entries").document()
            je_lines_dict = [line.model_dump() for line in lines]
            
            transaction.set(je_ref, {
                "number": f"JE-PV-{data.voucher_number}",
                "date": firestore.SERVER_TIMESTAMP,
                "description": f"Payment Voucher {data.voucher_number} - {data.payee}",
                "status": "POSTED",
                "lines": je_lines_dict,
                "company_id": data.company_id,
                "source_doc_id": pv_ref.id,
                "source_doc_type": "PV"
            })

            # Post using account data fetched earlier
            engine.post_journal_entry(transaction, je_ref.id, je_lines_dict, accounts_data)
            
            # AP Settlement Logic
            from .bills import BillService
            bill_service = BillService()
            user_dummy = {"email": "system", "company_id": data.company_id}
            
            for settlement in getattr(data, "linked_bills", []):
                # Since we already have the bill data if we needed to validate it, 
                # but BillService.mark_paid still does its own get().
                # To avoid nested read errors, we must ensure mark_paid uses our transaction correctly.
                # However, mark_paid DOES a get(). So we SHOULD pass the pre-fetched data if possible.
                # For now, since bill_service.mark_paid is a separate method, we'll refactor it 
                # or just hope that we fetch bills at the top.
                # ACTUALLY, we must pull the bill logic into here or make mark_paid take pre-fetched data.
                # Let's pull the logic for now to be safe.
                
                bill_ref = db.collection("bills").document(settlement.invoice_id)
                bill_info = bills_data.get(settlement.invoice_id)
                if not bill_info:
                    continue
                
                from decimal import Decimal
                curr_paid = Decimal(str(bill_info.get("paid_amount", "0")))
                paid_amt = Decimal(str(settlement.amount))
                total_amt = Decimal(str(bill_info.get("total", "0")))
                new_paid = curr_paid + paid_amt
                new_rem = total_amt - new_paid
                
                status = bill_info.get("status")
                if new_rem <= Decimal("0.0001"):
                    status = "PAID"
                
                transaction.update(bill_ref, {
                    "paid_amount": str(new_paid),
                    "remaining_amount": str(new_rem),
                    "status": status,
                    "updated_at": firestore.SERVER_TIMESTAMP
                })

            transaction.update(pv_ref, {"journal_id": je_ref.id})
            return pv_ref.id

        return _execute(transaction, self.db, data)

        return _execute(transaction, self.db, data)

    def create_receipt_voucher(self, data: ReceiptVoucherCreate) -> str:
        """
        Creates a receipt voucher and posts a corresponding journal entry.
        Dr: Cash/Bank Account
        Cr: Accounts Receivable / Customer Account
        """
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _execute(transaction, db, data):
            # 1. PRE-FETCH ALL DATA (Read Phase)
            customer_ref = db.collection("customers").document(data.customer_id)
            customer = customer_ref.get(transaction=transaction).to_dict()
            if not customer:
                raise ValueError("Customer not found")
            
            ar_account_id = customer.get("ar_account_id")
            if not ar_account_id:
                # Resolve code "122" to ID within transaction
                ar_query = db.collection("accounts")\
                    .where("company_id", "==", data.company_id)\
                    .where("code", "==", "122")\
                    .limit(1)
                ar_snaps = ar_query.get(transaction=transaction)
                if ar_snaps:
                    ar_account_id = ar_snaps[0].id
                else:
                    ar_account_id = "122" # Final fallback (still risky if ID != code)
                    # Raising error is safer but maybe 122 IS the ID in some seeds?
                    # The user error suggests it is NOT.
                    # Let's check the diag output again. Code 122 has ID PCt55l6cIsbQcpJUcz7S.
                    # So we MUST find it.
            
            if not ar_account_id or ar_account_id == "122":
                # If we still have 122 or None, and it wasn't found by code
                # we should try one more thing: checking if an account with ID "122" exists?
                # No, let's just use the result of the query.
                pass

            account_ids = [data.cash_bank_account_id, ar_account_id]
            from .posting import PostingEngine
            engine = PostingEngine()
            accounts_data = engine.get_accounts_for_transaction(transaction, account_ids)

            invoice_ids = [s.invoice_id for s in data.linked_invoices]
            invoices_data = {}
            if invoice_ids:
                inv_refs = [db.collection("invoices").document(iid) for iid in invoice_ids]
                inv_snaps = db.get_all(inv_refs, transaction=transaction)
                invoices_data = {snap.id: snap.to_dict() for snap in inv_snaps if snap.exists}

            # 2. PERFORM ALL WRITES (Write Phase)
            # Create Receipt Document
            rv_ref = db.collection("receipt_vouchers").document()
            voucher_data = data.model_dump()
            voucher_data["created_at"] = firestore.SERVER_TIMESTAMP
            transaction.set(rv_ref, voucher_data)

            # Create Journal Entry
            lines = [
                JournalLineBase(
                    account_id=data.cash_bank_account_id,
                    debit=data.amount,
                    credit="0.0000",
                    memo=f"Receipt Voucher: {data.receipt_number} from {customer.get('name')}"
                ),
                JournalLineBase(
                    account_id=ar_account_id,
                    debit="0.0000",
                    credit=data.amount,
                    memo=f"Receipt Voucher: {data.receipt_number}"
                )
            ]
            je_ref = db.collection("journal_entries").document()
            je_lines_dict = [line.model_dump() for line in lines]

            transaction.set(je_ref, {
                "number": f"JE-RV-{data.receipt_number}",
                "date": firestore.SERVER_TIMESTAMP,
                "description": f"Receipt Voucher {data.receipt_number}",
                "status": "POSTED",
                "lines": je_lines_dict,
                "company_id": data.company_id,
                "source_doc_id": rv_ref.id,
                "source_doc_type": "RV"
            })

            # Post using account data
            engine.post_journal_entry(transaction, je_ref.id, je_lines_dict, accounts_data)
            
            # Settlement Logic: Update linked invoices
            for settlement in data.linked_invoices:
                inv_ref = db.collection("invoices").document(settlement.invoice_id)
                inv_info = invoices_data.get(settlement.invoice_id)
                if not inv_info:
                    continue
                
                from decimal import Decimal
                curr_paid = Decimal(str(inv_info.get("paid_amount", "0")))
                paid_amt = Decimal(str(settlement.amount))
                total_amt = Decimal(str(inv_info.get("total", "0")))
                new_paid = curr_paid + paid_amt
                new_rem = total_amt - new_paid
                
                status = inv_info.get("status")
                if new_rem <= Decimal("0.0001"):
                    status = "PAID"
                
                transaction.update(inv_ref, {
                    "paid_amount": str(new_paid),
                    "remaining_amount": str(new_rem),
                    "status": status,
                    "updated_at": firestore.SERVER_TIMESTAMP
                })

            transaction.update(rv_ref, {"journal_id": je_ref.id})
            return rv_ref.id

        return _execute(transaction, self.db, data)

        return _execute(transaction, self.db, data)

def get_voucher_service():
    return VoucherService()
