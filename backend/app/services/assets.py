from decimal import Decimal
from datetime import datetime, date
from app.core.firebase import get_db
from google.cloud import firestore

class FixedAssetService:
    """Service for managing fixed assets and depreciation (الأصول الثابتة والاندثار)."""
    
    def __init__(self):
        self.db = get_db()
    
    def create_asset(self, data: dict) -> str:
        """Register a new fixed asset."""
        doc_ref = self.db.collection("fixed_assets").document()
        asset = {
            "code": data.get("code", f"FA-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
            "name": data.get("name"),
            "category": data.get("category", "Equipment"),  # Equipment, Vehicle, Building, etc.
            "purchase_date": data.get("purchase_date"),
            "purchase_value": str(data.get("purchase_value", "0")),
            "salvage_value": str(data.get("salvage_value", "0")),
            "useful_life_months": data.get("useful_life_months", 60),  # Default 5 years
            "depreciation_method": data.get("depreciation_method", "STRAIGHT_LINE"),
            "accumulated_depreciation": "0",
            "current_value": str(data.get("purchase_value", "0")),
            "status": "ACTIVE",  # ACTIVE, DISPOSED, SOLD
            "location": data.get("location", ""),
            "notes": data.get("notes", ""),
            "created_at": firestore.SERVER_TIMESTAMP
        }
        doc_ref.set(asset)
        return doc_ref.id
    
    def list_assets(self, status: str = "ACTIVE", limit: int = 100) -> list:
        """List fixed assets."""
        query = self.db.collection("fixed_assets")
        if status:
            query = query.where("status", "==", status)
        docs = query.limit(limit).stream()
        return [{"id": d.id, **d.to_dict()} for d in docs]
    
    def calculate_monthly_depreciation(self, asset_id: str) -> Decimal:
        """Calculate monthly depreciation for an asset (Straight Line method)."""
        doc = self.db.collection("fixed_assets").document(asset_id).get()
        if not doc.exists:
            return Decimal("0")
        
        data = doc.to_dict()
        purchase_value = Decimal(str(data.get("purchase_value", "0")))
        salvage_value = Decimal(str(data.get("salvage_value", "0")))
        useful_life_months = int(data.get("useful_life_months", 60))
        
        if useful_life_months <= 0:
            return Decimal("0")
        
        # Straight Line: (Cost - Salvage) / Useful Life
        monthly_dep = (purchase_value - salvage_value) / useful_life_months
        return monthly_dep.quantize(Decimal("0.01"))
    
    def record_depreciation(self, asset_id: str, amount: Decimal, period: str) -> str:
        """Record a depreciation entry for an asset."""
        doc_ref = self.db.collection("depreciation_entries").document()
        entry = {
            "asset_id": asset_id,
            "amount": str(amount),
            "period": period,  # e.g., "2026-02"
            "created_at": firestore.SERVER_TIMESTAMP
        }
        doc_ref.set(entry)
        
        # Update accumulated depreciation on asset
        asset_ref = self.db.collection("fixed_assets").document(asset_id)
        asset_doc = asset_ref.get()
        if asset_doc.exists:
            current_acc = Decimal(str(asset_doc.to_dict().get("accumulated_depreciation", "0")))
            purchase_val = Decimal(str(asset_doc.to_dict().get("purchase_value", "0")))
            new_acc = current_acc + amount
            asset_ref.update({
                "accumulated_depreciation": str(new_acc),
                "current_value": str(purchase_val - new_acc)
            })
        
        return doc_ref.id
    
    def get_depreciation_summary(self) -> dict:
        """Get total depreciation across all assets."""
        assets = self.list_assets()
        total_purchase = Decimal("0")
        total_accumulated = Decimal("0")
        total_current = Decimal("0")
        
        for asset in assets:
            total_purchase += Decimal(str(asset.get("purchase_value", "0")))
            total_accumulated += Decimal(str(asset.get("accumulated_depreciation", "0")))
            total_current += Decimal(str(asset.get("current_value", "0")))
        
        return {
            "total_purchase_value": str(total_purchase),
            "total_accumulated_depreciation": str(total_accumulated),
            "total_current_value": str(total_current),
            "asset_count": len(assets)
        }


def get_fixed_asset_service() -> FixedAssetService:
    return FixedAssetService()
