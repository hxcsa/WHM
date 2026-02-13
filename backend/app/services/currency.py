from decimal import Decimal
from datetime import datetime
from app.core.firebase import get_db
from google.cloud import firestore

class CurrencyService:
    """Service for multi-currency ledger operations (IQD/USD)."""
    
    DEFAULT_RATE = Decimal("1480.00")  # 1 USD = 1480 IQD (market rate)
    
    def __init__(self):
        self.db = get_db()
    
    def get_current_rate(self, from_currency: str = "USD", to_currency: str = "IQD") -> Decimal:
        """Get the current exchange rate. Returns IQD per 1 USD by default."""
        try:
            doc = self.db.collection("exchange_rates").document(f"{from_currency}_{to_currency}").get()
            if doc.exists:
                return Decimal(str(doc.to_dict().get("rate", self.DEFAULT_RATE)))
            return self.DEFAULT_RATE
        except Exception:
            return self.DEFAULT_RATE
    
    def set_rate(self, rate: Decimal, from_currency: str = "USD", to_currency: str = "IQD") -> dict:
        """Update the exchange rate. Admin only."""
        doc_id = f"{from_currency}_{to_currency}"
        data = {
            "from_currency": from_currency,
            "to_currency": to_currency,
            "rate": str(rate),
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        self.db.collection("exchange_rates").document(doc_id).set(data)
        return {"status": "updated", "rate": str(rate)}
    
    def convert(self, amount: Decimal, from_currency: str, to_currency: str) -> Decimal:
        """Convert an amount between currencies."""
        if from_currency == to_currency:
            return amount
        
        rate = self.get_current_rate(from_currency, to_currency)
        
        if from_currency == "USD" and to_currency == "IQD":
            return amount * rate
        elif from_currency == "IQD" and to_currency == "USD":
            return amount / rate
        
        return amount  # Unsupported pair
    
    def get_rate_history(self, limit: int = 30) -> list:
        """Get historical exchange rates for charting."""
        docs = self.db.collection("exchange_rate_history")\
            .order_by("date", direction=firestore.Query.DESCENDING)\
            .limit(limit).stream()
        return [{"date": d.to_dict().get("date"), "rate": d.to_dict().get("rate")} for d in docs]


def get_currency_service() -> CurrencyService:
    return CurrencyService()
