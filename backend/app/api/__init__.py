from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from google.cloud import firestore
from app.core.firebase import get_db
from app.core.auth import get_current_user
from app.core.audit import get_audit_logger
from app.services.inventory import InventoryService
from app.services.customers import get_customers_service
from app.services.invoices import get_invoice_service
from app.services.users import get_users_service
from app.schemas.customers import CustomerCreate
from app.schemas.invoices import InvoiceCreate
from app.schemas.erp import EmployeeCreate

router = APIRouter()


def _decimal_to_str(value: Decimal) -> str:
    return format(value, "f")


def _safe_decimal(value: Any, default: str = "0") -> Decimal:
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def _upsert_cost_layer(
    db,
    company_id: str,
    product_id: str,
    unit_cost: Decimal,
    qty_delta: Decimal,
):
    """Add/remove quantity from a cost layer (grouped by unit cost)."""
    if qty_delta == 0:
        return

    cost_str = _decimal_to_str(unit_cost)
    query = (
        db.collection("stock_cost_layers")
        .where("company_id", "==", company_id)
        .where("product_id", "==", product_id)
        .where("unit_cost", "==", cost_str)
        .limit(1)
    )
    docs = list(query.stream())

    if docs:
        doc = docs[0]
        data = doc.to_dict()
        current_on_hand = Decimal(str(data.get("qty_on_hand", 0)))
        current_received = Decimal(str(data.get("qty_received_total", 0)))
        new_on_hand = current_on_hand + qty_delta

        if new_on_hand < 0:
            raise HTTPException(
                status_code=400,
                detail="Layer quantity cannot go negative",
            )

        update_data = {
            "qty_on_hand": _decimal_to_str(new_on_hand),
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
        if qty_delta > 0:
            update_data["qty_received_total"] = _decimal_to_str(
                current_received + qty_delta
            )
        db.collection("stock_cost_layers").document(doc.id).update(update_data)
        return

    if qty_delta < 0:
        raise HTTPException(status_code=400, detail="No matching cost layer found")

    db.collection("stock_cost_layers").document().set(
        {
            "company_id": company_id,
            "product_id": product_id,
            "unit_cost": cost_str,
            "qty_on_hand": _decimal_to_str(qty_delta),
            "qty_received_total": _decimal_to_str(qty_delta),
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
    )


def _consume_cost_layers_fifo(db, company_id: str, product_id: str, quantity: Decimal):
    """Consume quantity from oldest available cost layers."""
    if quantity <= 0:
        return

    query = (
        db.collection("stock_cost_layers")
        .where("company_id", "==", company_id)
        .where("product_id", "==", product_id)
    )

    try:
        docs = list(
            query.order_by("created_at", direction=firestore.Query.ASCENDING).stream()
        )
    except Exception:
        docs = list(query.stream())
        docs.sort(key=lambda d: str(d.to_dict().get("created_at") or ""))

    remaining = quantity
    for doc in docs:
        if remaining <= 0:
            break

        layer = doc.to_dict()
        on_hand = Decimal(str(layer.get("qty_on_hand", 0)))
        if on_hand <= 0:
            continue

        take = on_hand if on_hand <= remaining else remaining
        new_on_hand = on_hand - take
        db.collection("stock_cost_layers").document(doc.id).update(
            {
                "qty_on_hand": _decimal_to_str(new_on_hand),
                "updated_at": firestore.SERVER_TIMESTAMP,
            }
        )
        remaining -= take

    if remaining > 0:
        raise HTTPException(
            status_code=400,
            detail="Insufficient layer stock to consume",
        )


# ===================== DASHBOARD =====================
@router.get("/dashboard/stats")
def get_dashboard_stats(user: dict = Depends(get_current_user)):
    """Get dashboard statistics."""
    try:
        db = get_db()
        company_id = user.get("company_id")

        if not company_id:
            return {
                "today_sales": 0,
                "invoice_count": 0,
                "total_stock_value": 0,
                "total_items": 0,
                "low_stock_count": 0,
                "pending_transfers": 0,
                "outstanding_balance": 0,
                "customer_credit_total": 0,
            }

        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow_start = today_start + timedelta(days=1)

        # Get today's sales with server-side date filtering.
        sales_query = (
            db.collection("invoices")
            .where("company_id", "==", company_id)
            .where("created_at", ">=", today_start)
            .where("created_at", "<", tomorrow_start)
            .select(["total_amount", "created_at"])
        )

        try:
            sales_docs = sales_query.stream()
        except Exception:
            # Fallback for environments where indexes are not available yet.
            sales_docs = (
                db.collection("invoices")
                .where("company_id", "==", company_id)
                .select(["total_amount", "created_at"])
                .stream()
            )

        today_sales = Decimal("0")
        invoice_count = 0
        for doc in sales_docs:
            data = doc.to_dict() or {}
            created_at = data.get("created_at")
            if hasattr(created_at, "replace"):
                doc_date = created_at.replace(hour=0, minute=0, second=0, microsecond=0)
                if doc_date != today_start:
                    continue
            today_sales += _safe_decimal(data.get("total_amount", 0))
            invoice_count += 1

        # Get total stock value
        items_docs = (
            db.collection("items")
            .where("company_id", "==", company_id)
            .select(["current_qty", "current_wac", "min_stock_level"])
            .stream()
        )
        total_stock_value = Decimal("0")
        total_items = 0
        low_stock_count = 0

        for doc in items_docs:
            data = doc.to_dict() or {}
            qty = _safe_decimal(data.get("current_qty", 0))
            cost = _safe_decimal(data.get("current_wac", 0))
            total_stock_value += qty * cost
            total_items += 1

            min_stock = _safe_decimal(data.get("min_stock_level", 0))
            if min_stock > 0 and qty <= min_stock:
                low_stock_count += 1

        # Get pending transfers
        try:
            transfer_docs = (
                db.collection("transfers")
                .where("company_id", "==", company_id)
                .where("status", "in", ["pending", "in_transit"])
                .stream()
            )
            pending_transfers = len(list(transfer_docs))
        except:
            pending_transfers = 0

        # Get outstanding customer balance
        customer_docs = (
            db.collection("customers")
            .where("company_id", "==", company_id)
            .select(["balance"])
            .stream()
        )
        outstanding_balance = Decimal("0")
        customer_credit_total = Decimal("0")
        for doc in customer_docs:
            data = doc.to_dict() or {}
            bal = _safe_decimal(data.get("balance", 0))
            if bal > 0:
                outstanding_balance += bal
            elif bal < 0:
                customer_credit_total += abs(bal)

        return {
            "today_sales": float(today_sales),
            "invoice_count": invoice_count,
            "total_stock_value": float(total_stock_value),
            "total_items": total_items,
            "low_stock_count": low_stock_count,
            "pending_transfers": pending_transfers,
            "outstanding_balance": float(outstanding_balance),
            "customer_credit_total": float(customer_credit_total),
        }
    except Exception as e:
        print(f"Dashboard stats error: {e}")
        return {
            "today_sales": 0,
            "invoice_count": 0,
            "total_stock_value": 0,
            "total_items": 0,
            "low_stock_count": 0,
            "pending_transfers": 0,
            "outstanding_balance": 0,
            "customer_credit_total": 0,
        }


@router.get("/dashboard/recent-sales")
def get_recent_sales(limit: int = 10, user: dict = Depends(get_current_user)):
    """Get recent sales for dashboard."""
    db = get_db()
    company_id = user.get("company_id")
    fields = [
        "invoice_number",
        "customer_name",
        "total_amount",
        "payment_status",
        "created_at",
        "issue_date",
    ]

    try:
        docs = (
            db.collection("invoices")
            .where("company_id", "==", company_id)
            .order_by("issue_date", direction=firestore.Query.DESCENDING)
            .select(fields)
            .limit(limit)
            .stream()
        )
        docs = list(docs)
    except Exception:
        # Fallback when an index is missing: load and sort in memory.
        docs = list(
            db.collection("invoices")
            .where("company_id", "==", company_id)
            .select(fields)
            .stream()
        )
        docs.sort(
            key=lambda d: (
                d.to_dict().get("issue_date") or d.to_dict().get("created_at") or ""
            ),
            reverse=True,
        )
        docs = docs[:limit]

    results = []
    for doc in docs:
        data = doc.to_dict() or {}
        data["id"] = doc.id
        # Remove server timestamp for serialization
        if "created_at" in data:
            data["created_at"] = (
                data["created_at"].isoformat()
                if hasattr(data["created_at"], "isoformat")
                else str(data["created_at"])
            )
        if "issue_date" in data:
            data["issue_date"] = (
                data["issue_date"].isoformat()
                if hasattr(data["issue_date"], "isoformat")
                else str(data["issue_date"])
            )
        results.append(data)

    return results


@router.get("/dashboard/expiring-products")
def get_expiring_products(days: int = 7, user: dict = Depends(get_current_user)):
    """Get products expiring within specified days."""
    db = get_db()
    company_id = user.get("company_id")
    cutoff_date = datetime.now() + timedelta(days=days)

    docs = (
        db.collection("batches")
        .where("company_id", "==", company_id)
        .where("expiry_date", "<=", cutoff_date)
        .where("expiry_date", ">=", datetime.now())
        .stream()
    )

    results = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        results.append(data)

    return results


@router.get("/dashboard/weekly-sales")
def get_weekly_sales(user: dict = Depends(get_current_user)):
    """Get sales data for the last 7 days."""
    db = get_db()
    company_id = user.get("company_id")

    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    docs = (
        db.collection("invoices")
        .where("company_id", "==", company_id)
        .where("created_at", ">=", start_date)
        .stream()
    )

    # Group by day
    daily_sales = {}
    for i in range(7):
        date = (end_date - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_sales[date] = 0

    for doc in docs:
        data = doc.to_dict()
        date = (
            data["created_at"].strftime("%Y-%m-%d")
            if hasattr(data["created_at"], "strftime")
            else str(data["created_at"])[:10]
        )
        if date in daily_sales:
            daily_sales[date] += float(data.get("total_amount", 0))

    return [{"date": k, "amount": v} for k, v in sorted(daily_sales.items())]


@router.get("/dashboard/top-products")
def get_top_products(limit: int = 5, user: dict = Depends(get_current_user)):
    """Get top selling products."""
    db = get_db()
    company_id = user.get("company_id")

    # Get all invoice items from last 30 days
    thirty_days_ago = datetime.now() - timedelta(days=30)

    docs = (
        db.collection("invoices")
        .where("company_id", "==", company_id)
        .where("created_at", ">=", thirty_days_ago)
        .stream()
    )

    product_sales = {}
    for doc in docs:
        data = doc.to_dict()
        for item in data.get("items", []):
            product_id = item.get("product_id")
            if product_id:
                if product_id not in product_sales:
                    product_sales[product_id] = {
                        "product_id": product_id,
                        "name": item.get("product_name", "Unknown"),
                        "quantity": 0,
                        "revenue": 0,
                    }
                product_sales[product_id]["quantity"] += item.get("quantity", 0)
                product_sales[product_id]["revenue"] += item.get("total", 0)

    # Sort by revenue and return top N
    sorted_products = sorted(
        product_sales.values(), key=lambda x: x["revenue"], reverse=True
    )
    return sorted_products[:limit]


@router.get("/dashboard/insights")
def get_dashboard_insights(user: dict = Depends(get_current_user)):
    """Get dashboard analytics: hot products, low stock, and top customers."""
    try:
        db = get_db()
        company_id = user.get("company_id")

        if not company_id:
            return {"top_products": [], "low_stock_items": [], "top_customers": []}

        thirty_days_ago = datetime.now() - timedelta(days=30)
        try:
            invoice_docs = list(
                db.collection("invoices")
                .where("company_id", "==", company_id)
                .where("created_at", ">=", thirty_days_ago)
                .select(["items", "created_at"])
                .stream()
            )
        except Exception:
            invoice_docs = list(
                db.collection("invoices")
                .where("company_id", "==", company_id)
                .select(["items", "created_at"])
                .stream()
            )

        top_map: Dict[str, Dict[str, Any]] = {}
        for doc in invoice_docs:
            data = doc.to_dict() or {}
            for item in data.get("items", []):
                product_id = item.get("product_id")
                if not product_id:
                    continue
                if product_id not in top_map:
                    top_map[product_id] = {
                        "product_id": product_id,
                        "name": item.get("product_name", "Unknown"),
                        "quantity": Decimal("0"),
                        "revenue": Decimal("0"),
                    }
                top_map[product_id]["quantity"] += _safe_decimal(
                    item.get("quantity", 0)
                )
                top_map[product_id]["revenue"] += _safe_decimal(item.get("total", 0))

        top_products = sorted(
            top_map.values(),
            key=lambda x: (x["quantity"], x["revenue"]),
            reverse=True,
        )[:8]

        item_docs = (
            db.collection("items")
            .where("company_id", "==", company_id)
            .select(["name", "sku", "current_qty", "min_stock_level"])
            .stream()
        )
        low_stock_items = []
        for doc in item_docs:
            data = doc.to_dict() or {}
            qty = _safe_decimal(data.get("current_qty", 0))
            min_stock = _safe_decimal(data.get("min_stock_level", 0))
            if min_stock > 0 and qty <= min_stock:
                low_stock_items.append(
                    {
                        "id": doc.id,
                        "name": data.get("name", "Unknown"),
                        "sku": data.get("sku", ""),
                        "current_qty": float(qty),
                        "min_stock_level": float(min_stock),
                        "shortage": float(min_stock - qty),
                    }
                )
        low_stock_items.sort(key=lambda x: x["shortage"], reverse=True)

        customer_docs = (
            db.collection("customers")
            .where("company_id", "==", company_id)
            .select(["first_name", "last_name", "total_purchases", "balance"])
            .stream()
        )
        top_customers = []
        for doc in customer_docs:
            data = doc.to_dict() or {}
            total_purchases = _safe_decimal(data.get("total_purchases", 0))
            if total_purchases <= 0:
                continue
            top_customers.append(
                {
                    "id": doc.id,
                    "name": f"{data.get('first_name', '')} {data.get('last_name', '')}".strip(),
                    "total_purchases": float(total_purchases),
                    "balance": float(_safe_decimal(data.get("balance", 0))),
                }
            )
        top_customers.sort(key=lambda x: x["total_purchases"], reverse=True)

        return {
            "top_products": [
                {
                    "product_id": p["product_id"],
                    "name": p["name"],
                    "quantity": float(p["quantity"]),
                    "revenue": float(p["revenue"]),
                }
                for p in top_products
            ],
            "low_stock_items": low_stock_items[:10],
            "top_customers": top_customers[:8],
        }
    except Exception as e:
        print(f"Dashboard insights error: {e}")
        return {"top_products": [], "low_stock_items": [], "top_customers": []}


# ===================== PRODUCTS =====================
@router.get("/items")
@router.get("/products")
def list_products(
    search: Optional[str] = None,
    low_stock: bool = False,
    user: dict = Depends(get_current_user),
):
    """List all products with optional filters."""
    try:
        db = get_db()
        company_id = user.get("company_id")

        if not company_id:
            return []

        docs = db.collection("items").where("company_id", "==", company_id).stream()

        results = []
        for doc in docs:
            data = {"id": doc.id, **doc.to_dict()}

            # Apply search filter
            if search:
                search_lower = search.lower()
                name = (data.get("name", "") + data.get("name_ar", "")).lower()
                sku = data.get("sku", "").lower()
                if search_lower not in name and search_lower not in sku:
                    continue

            # Apply low stock filter
            if low_stock:
                qty = Decimal(str(data.get("current_qty", 0)))
                min_stock = Decimal(str(data.get("min_stock_level", 0)))
                if min_stock == 0 or qty > min_stock:
                    continue

            results.append(data)

        return results
    except Exception as e:
        print(f"Error listing products: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/products")
def create_product(data: dict, user: dict = Depends(get_current_user)):
    """Create a new product."""
    try:
        db = get_db()
        company_id = user.get("company_id")

        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID not found")

        # Validate required fields
        if not data.get("name"):
            raise HTTPException(status_code=400, detail="Product name is required")
        if not data.get("sku"):
            raise HTTPException(status_code=400, detail="SKU is required")

        cost_price = Decimal(str(data.get("cost_price", 0)))
        selling_price = Decimal(str(data.get("selling_price", 0)))
        if selling_price < cost_price:
            raise HTTPException(
                status_code=400,
                detail="Selling price cannot be lower than cost price",
            )

        product_data = {
            "company_id": company_id,
            "name": data.get("name"),
            "name_ar": data.get("name_ar", ""),
            "sku": data.get("sku"),
            "description": data.get("description", ""),
            "cost_price": str(data.get("cost_price", "0")),
            "selling_price": str(data.get("selling_price", "0")),
            "pricing_type": data.get("pricing_type", "fixed"),
            "current_qty": "0.0000",
            "current_wac": "0.0000",
            "total_value": "0.0000",
            "min_stock_level": str(data.get("min_stock_level", "0")),
            "unit": data.get("unit", "piece"),
            "category": data.get("category", ""),
            "expiry_tracking": data.get("expiry_tracking", False),
            "created_at": firestore.SERVER_TIMESTAMP,
            "created_by": user.get("uid"),
        }

        doc_ref = db.collection("items").document()
        doc_ref.set(product_data)

        # Remove non-serializable timestamp sentinels before returning
        safe_response = product_data.copy()
        safe_response["created_at"] = datetime.now().isoformat()

        return {"id": doc_ref.id, **safe_response}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating product: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/products/export")
def export_products(user: dict = Depends(get_current_user)):
    """Export all products to CSV format."""
    db = get_db()
    company_id = user.get("company_id")

    docs = db.collection("items").where("company_id", "==", company_id).stream()

    products = []
    for doc in docs:
        data = doc.to_dict()
        products.append(
            {
                "id": doc.id,
                "name": data.get("name", ""),
                "sku": data.get("sku", ""),
                "cost_price": data.get("cost_price", "0"),
                "selling_price": data.get("selling_price", "0"),
                "current_qty": data.get("current_qty", "0"),
                "min_stock_level": data.get("min_stock_level", "0"),
                "unit": data.get("unit", "piece"),
                "category": data.get("category", ""),
            }
        )

    return products


@router.get("/products/adjustments")
def list_product_adjustments(
    product_id: Optional[str] = None,
    limit: int = 100,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """List stock adjustments (in/out) for products."""
    db = get_db()
    company_id = user.get("company_id")

    query = db.collection("stock_adjustments").where("company_id", "==", company_id)
    if product_id:
        query = query.where("product_id", "==", product_id)

    try:
        docs = (
            query.order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(limit)
            .stream()
        )
        docs = list(docs)
    except Exception:
        docs = list(query.stream())
        docs.sort(key=lambda d: d.to_dict().get("created_at") or "", reverse=True)
        docs = docs[:limit]

    results = []
    for doc in docs:
        data = {"id": doc.id, **doc.to_dict()}
        if "created_at" in data:
            data["created_at"] = (
                data["created_at"].isoformat()
                if hasattr(data["created_at"], "isoformat")
                else str(data["created_at"])
            )

        if from_date or to_date:
            created_at_val = data.get("created_at")
            if created_at_val:
                created_str = str(created_at_val)
                if from_date and created_str < from_date:
                    continue
                if to_date and created_str > to_date:
                    continue
        results.append(data)

    return results


@router.get("/products/inbound")
def list_product_inbound(limit: int = 100, user: dict = Depends(get_current_user)):
    """List inbound stock entries."""
    db = get_db()
    company_id = user.get("company_id")

    query = db.collection("stock_inbound").where("company_id", "==", company_id)
    try:
        docs = (
            query.order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(limit)
            .stream()
        )
        docs = list(docs)
    except Exception:
        docs = list(query.stream())
        docs.sort(key=lambda d: d.to_dict().get("created_at") or "", reverse=True)
        docs = docs[:limit]

    results = []
    for doc in docs:
        data = {"id": doc.id, **doc.to_dict()}
        if "created_at" in data:
            data["created_at"] = (
                data["created_at"].isoformat()
                if hasattr(data["created_at"], "isoformat")
                else str(data["created_at"])
            )
        results.append(data)

    return results


@router.post("/products/inbound")
def create_product_inbound(data: dict, user: dict = Depends(get_current_user)):
    """Create a detailed inbound stock entry with costing."""
    db = get_db()
    company_id = user.get("company_id")

    product_id = data.get("product_id")
    qty = Decimal(str(data.get("quantity", 0)))
    unit_cost = Decimal(str(data.get("unit_cost", 0)))
    supplier_id = data.get("supplier_id")
    supplier_name = data.get("supplier_name") or ""
    notes = data.get("notes", "")
    reason = data.get("reason", "purchase")
    update_cost_price = bool(data.get("update_cost_price", False))

    if not product_id:
        raise HTTPException(status_code=400, detail="Product is required")
    if qty <= 0:
        raise HTTPException(
            status_code=400, detail="Quantity must be greater than zero"
        )
    if unit_cost < 0:
        raise HTTPException(status_code=400, detail="Unit cost cannot be negative")

    product_ref = db.collection("items").document(product_id)
    product_doc = product_ref.get()
    if not product_doc.exists:
        raise HTTPException(status_code=404, detail="Product not found")

    product_data = product_doc.to_dict()
    if product_data.get("company_id") != company_id:
        raise HTTPException(status_code=403, detail="Unauthorized product access")

    current_qty = Decimal(str(product_data.get("current_qty", 0)))
    current_wac = Decimal(str(product_data.get("current_wac", 0)))
    if current_wac == 0:
        current_wac = Decimal(str(product_data.get("cost_price", 0)))

    new_qty = current_qty + qty
    new_total_value = (current_qty * current_wac) + (qty * unit_cost)
    new_wac = new_total_value / new_qty if new_qty > 0 else Decimal("0")

    update_fields = {
        "current_qty": str(new_qty),
        "current_wac": str(new_wac),
        "total_value": str(new_total_value),
        "updated_at": firestore.SERVER_TIMESTAMP,
        "updated_by": user.get("uid"),
    }
    if update_cost_price:
        update_fields["cost_price"] = str(unit_cost)

    product_ref.update(update_fields)
    _upsert_cost_layer(db, company_id, product_id, unit_cost, qty)

    inbound_data = {
        "company_id": company_id,
        "product_id": product_id,
        "product_name": product_data.get("name", ""),
        "product_sku": product_data.get("sku", ""),
        "quantity": str(qty),
        "unit_cost": str(unit_cost),
        "total_cost": str(qty * unit_cost),
        "previous_qty": str(current_qty),
        "new_qty": str(new_qty),
        "previous_wac": str(current_wac),
        "new_wac": str(new_wac),
        "supplier_id": supplier_id or None,
        "supplier_name": supplier_name,
        "reason": reason,
        "notes": notes,
        "update_cost_price": update_cost_price,
        "created_by": user.get("uid"),
        "created_at": firestore.SERVER_TIMESTAMP,
    }
    inbound_ref = db.collection("stock_inbound").document()
    inbound_ref.set(inbound_data)

    adjustment_ref = db.collection("stock_adjustments").document()
    adjustment_ref.set(
        {
            "company_id": company_id,
            "product_id": product_id,
            "product_name": product_data.get("name", ""),
            "quantity_change": str(qty),
            "previous_qty": str(current_qty),
            "new_qty": str(new_qty),
            "reason": f"inbound_{reason}",
            "notes": notes,
            "unit_cost": str(unit_cost),
            "total_cost": str(qty * unit_cost),
            "supplier_id": supplier_id or None,
            "supplier_name": supplier_name,
            "created_by": user.get("uid"),
            "created_at": firestore.SERVER_TIMESTAMP,
        }
    )

    return {
        "id": inbound_ref.id,
        "product_id": product_id,
        "new_qty": str(new_qty),
        "new_wac": str(new_wac),
        "total_cost": str(qty * unit_cost),
    }


@router.get("/products/{product_id}/cost-layers")
def get_product_cost_layers(product_id: str, user: dict = Depends(get_current_user)):
    """Return quantity-on-hand split by purchase cost layers."""
    db = get_db()
    company_id = user.get("company_id")

    product_doc = db.collection("items").document(product_id).get()
    if not product_doc.exists:
        raise HTTPException(status_code=404, detail="Product not found")

    product_data = product_doc.to_dict()
    if product_data.get("company_id") != company_id:
        raise HTTPException(status_code=403, detail="Unauthorized product access")

    query = (
        db.collection("stock_cost_layers")
        .where("company_id", "==", company_id)
        .where("product_id", "==", product_id)
    )

    docs = list(query.stream())
    layers: List[Dict[str, Any]] = []
    for doc in docs:
        data = doc.to_dict()
        qty_on_hand = Decimal(str(data.get("qty_on_hand", 0)))
        qty_received_total = Decimal(str(data.get("qty_received_total", 0)))
        unit_cost = Decimal(str(data.get("unit_cost", 0)))
        sold_qty = qty_received_total - qty_on_hand

        created_at = data.get("created_at")
        if hasattr(created_at, "isoformat"):
            created_at = created_at.isoformat()
        else:
            created_at = str(created_at or "")

        layers.append(
            {
                "id": doc.id,
                "unit_cost": _decimal_to_str(unit_cost),
                "qty_on_hand": _decimal_to_str(qty_on_hand),
                "qty_received_total": _decimal_to_str(qty_received_total),
                "qty_sold": _decimal_to_str(sold_qty if sold_qty > 0 else Decimal("0")),
                "stock_value": _decimal_to_str(qty_on_hand * unit_cost),
                "created_at": created_at,
            }
        )

    layers.sort(key=lambda l: Decimal(str(l.get("unit_cost", "0"))))

    return {
        "product": {
            "id": product_id,
            "name": product_data.get("name", ""),
            "sku": product_data.get("sku", ""),
            "current_qty": str(product_data.get("current_qty", "0")),
        },
        "layers": layers,
    }


@router.get("/products/{product_id}/ledger")
def get_product_ledger(
    product_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Get running stock ledger for one product."""
    db = get_db()
    company_id = user.get("company_id")

    product_doc = db.collection("items").document(product_id).get()
    if not product_doc.exists:
        raise HTTPException(status_code=404, detail="Product not found")

    product_data = product_doc.to_dict()

    query = (
        db.collection("stock_adjustments")
        .where("company_id", "==", company_id)
        .where("product_id", "==", product_id)
    )

    docs = list(query.stream())
    rows = []
    for doc in docs:
        data = {"id": doc.id, **doc.to_dict()}
        created = data.get("created_at")
        if hasattr(created, "isoformat"):
            data["created_at"] = created.isoformat()
        else:
            data["created_at"] = str(created or "")
        rows.append(data)

    rows.sort(key=lambda r: r.get("created_at") or "")

    def _in_window(iso_value: str) -> bool:
        if from_date and iso_value < from_date:
            return False
        if to_date and iso_value > to_date:
            return False
        return True

    opening_qty = Decimal("0")
    in_qty = Decimal("0")
    out_qty = Decimal("0")
    movements = []
    running = Decimal("0")

    for row in rows:
        qty = Decimal(str(row.get("quantity_change", 0)))
        created_at = str(row.get("created_at") or "")

        if from_date and created_at < from_date:
            opening_qty += qty
            continue

        if _in_window(created_at):
            if qty > 0:
                in_qty += qty
            else:
                out_qty += abs(qty)

            running += qty
            movements.append(
                {
                    "id": row.get("id"),
                    "created_at": created_at,
                    "quantity_change": str(qty),
                    "reason": row.get("reason", ""),
                    "notes": row.get("notes", ""),
                    "running_qty": str(opening_qty + running),
                }
            )

    closing_qty = opening_qty + in_qty - out_qty

    return {
        "product": {
            "id": product_id,
            "name": product_data.get("name", ""),
            "sku": product_data.get("sku", ""),
            "current_qty": str(product_data.get("current_qty", "0")),
        },
        "from_date": from_date,
        "to_date": to_date,
        "opening_qty": str(opening_qty),
        "in_qty": str(in_qty),
        "out_qty": str(out_qty),
        "closing_qty": str(closing_qty),
        "movements": movements,
    }


@router.get("/products/{product_id}")
def get_product(product_id: str, user: dict = Depends(get_current_user)):
    """Get product details."""
    db = get_db()
    doc = db.collection("items").document(product_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"id": doc.id, **doc.to_dict()}


@router.put("/products/{product_id}")
def update_product(product_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update product details."""
    db = get_db()
    doc_ref = db.collection("items").document(product_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Product not found")

    current_data = doc.to_dict()
    new_cost = Decimal(str(data.get("cost_price", current_data.get("cost_price", 0))))
    new_selling = Decimal(
        str(data.get("selling_price", current_data.get("selling_price", 0)))
    )
    if new_selling < new_cost:
        raise HTTPException(
            status_code=400,
            detail="Selling price cannot be lower than cost price",
        )

    update_fields = {
        k: v
        for k, v in data.items()
        if k not in ["id", "created_at", "created_by", "company_id"]
    }
    update_fields["updated_at"] = firestore.SERVER_TIMESTAMP
    update_fields["updated_by"] = user.get("uid")

    doc_ref.update(update_fields)

    return {"id": product_id, **update_fields}


@router.delete("/items/{product_id}")
def delete_product(product_id: str, user: dict = Depends(get_current_user)):
    """Delete a product if it has no stock."""
    db = get_db()
    
    # Check if product is used in any transactions or has stock
    # For now, just check stock
    doc_ref = db.collection("items").document(product_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Product not found")

    data = doc.to_dict()
    qty = Decimal(str(data.get("current_qty", 0)))

    if qty > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete product with stock. Please adjust stock to zero first.",
        )

    doc_ref.delete()
    return {"status": "deleted", "id": product_id}



@router.post("/products/{product_id}/adjust-stock")
def adjust_stock(
    product_id: str,
    quantity: float,
    reason: str,
    notes: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Adjust stock quantity (positive or negative)."""
    db = get_db()
    company_id = user.get("company_id")

    service = InventoryService()

    # Get current product data
    doc_ref = db.collection("items").document(product_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Product not found")

    product_data = doc.to_dict()
    current_qty = Decimal(str(product_data.get("current_qty", 0)))
    qty_delta = Decimal(str(quantity))
    new_qty = current_qty + qty_delta

    if new_qty < 0:
        raise HTTPException(
            status_code=400, detail="Adjustment would result in negative stock"
        )

    # Update product quantity
    doc_ref.update(
        {"current_qty": str(new_qty), "updated_at": firestore.SERVER_TIMESTAMP}
    )

    if qty_delta < 0:
        _consume_cost_layers_fifo(db, company_id, product_id, abs(qty_delta))
    elif qty_delta > 0:
        layer_cost = Decimal(str(product_data.get("current_wac", 0)))
        if layer_cost <= 0:
            layer_cost = Decimal(str(product_data.get("cost_price", 0)))
        _upsert_cost_layer(db, company_id, product_id, layer_cost, qty_delta)

    # Log the adjustment
    adjustment_ref = db.collection("stock_adjustments").document()
    adjustment_ref.set(
        {
            "company_id": company_id,
            "product_id": product_id,
            "product_name": product_data.get("name"),
            "quantity_change": str(qty_delta),
            "previous_qty": str(current_qty),
            "new_qty": str(new_qty),
            "reason": reason,
            "notes": notes or "",
            "created_by": user.get("uid"),
            "created_at": firestore.SERVER_TIMESTAMP,
        }
    )

    return {
        "id": adjustment_ref.id,
        "product_id": product_id,
        "new_qty": float(new_qty),
        "adjustment": float(quantity),
    }


@router.get("/products/{product_id}/batches")
def get_product_batches(product_id: str, user: dict = Depends(get_current_user)):
    """Get all batches for a product."""
    db = get_db()
    company_id = user.get("company_id")

    docs = (
        db.collection("batches")
        .where("company_id", "==", company_id)
        .where("product_id", "==", product_id)
        .stream()
    )

    results = []
    for doc in docs:
        data = {"id": doc.id, **doc.to_dict()}
        results.append(data)

    return results


@router.post("/products/{product_id}/batches")
def create_batch(product_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Create a new batch for a product."""
    db = get_db()
    company_id = user.get("company_id")

    batch_data = {
        "company_id": company_id,
        "product_id": product_id,
        "batch_number": data.get("batch_number"),
        "quantity": str(data.get("quantity", 0)),
        "expiry_date": data.get("expiry_date"),  # ISO format date
        "cost_price": str(data.get("cost_price", 0)),
        "created_at": firestore.SERVER_TIMESTAMP,
        "created_by": user.get("uid"),
    }

    doc_ref = db.collection("batches").document()
    doc_ref.set(batch_data)

    return {"id": doc_ref.id, **batch_data}


# ===================== RECEIVING (Goods Receipt) =====================
@router.post("/receiving")
def create_goods_receipt(data: dict, user: dict = Depends(get_current_user)):
    """Create a goods receipt (add stock to warehouse)."""
    db = get_db()
    company_id = user.get("company_id")

    receipt_data = {
        "company_id": company_id,
        "receipt_number": data.get("receipt_number"),
        "supplier_id": data.get("supplier_id"),
        "supplier_name": data.get("supplier_name"),
        "items": data.get("items", []),
        "total_cost": str(data.get("total_cost", 0)),
        "notes": data.get("notes", ""),
        "status": "received",
        "created_by": user.get("uid"),
        "created_at": firestore.SERVER_TIMESTAMP,
    }

    doc_ref = db.collection("goods_receipts").document()
    doc_ref.set(receipt_data)

    # Update stock for each item
    for item in data.get("items", []):
        product_id = item.get("product_id")
        quantity = Decimal(str(item.get("quantity", 0)))
        cost_price = Decimal(str(item.get("cost_price", 0)))

        product_ref = db.collection("items").document(product_id)
        product_doc = product_ref.get()

        if product_doc.exists:
            product_data = product_doc.to_dict()
            current_qty = Decimal(str(product_data.get("current_qty", 0)))
            current_wac = Decimal(str(product_data.get("current_wac", 0)))

            # Calculate new WAC
            total_value = (current_qty * current_wac) + (quantity * cost_price)
            new_qty = current_qty + quantity
            new_wac = total_value / new_qty if new_qty > 0 else Decimal("0")

            product_ref.update(
                {
                    "current_qty": str(new_qty),
                    "current_wac": str(new_wac),
                    "total_value": str(total_value),
                }
            )

    return {"id": doc_ref.id, **receipt_data}


@router.get("/receiving")
def list_goods_receipts(limit: int = 50, user: dict = Depends(get_current_user)):
    """List all goods receipts."""
    db = get_db()
    company_id = user.get("company_id")

    docs = (
        db.collection("goods_receipts")
        .where("company_id", "==", company_id)
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
    )

    results = []
    for doc in docs:
        data = {"id": doc.id, **doc.to_dict()}
        results.append(data)

    return results


# ===================== CUSTOMERS =====================
@router.get("/customers")
def list_customers(
    search: Optional[str] = None,
    has_balance: bool = False,
    user: dict = Depends(get_current_user),
):
    """List all customers."""
    try:
        db = get_db()
        company_id = user.get("company_id")

        if not company_id:
            return []

        docs = db.collection("customers").where("company_id", "==", company_id).stream()

        results = []
        for doc in docs:
            data = {"id": doc.id, **doc.to_dict()}

            # Apply search filter
            if search:
                search_lower = search.lower()
                name = (
                    f"{data.get('first_name', '')} {data.get('last_name', '')}".lower()
                )
                phone = str(data.get("phone") or "").lower()
                if search_lower not in name and search_lower not in phone:
                    continue

            # Apply balance filter
            if has_balance:
                balance = Decimal(str(data.get("balance", 0)))
                if balance <= 0:
                    continue

            results.append(data)

        return results
    except Exception as e:
        print(f"Error listing customers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/customers")
def create_customer(data: dict, user: dict = Depends(get_current_user)):
    """Create a new customer."""
    try:
        db = get_db()
        company_id = user.get("company_id")

        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID not found")

        # Validate required fields
        if not data.get("first_name"):
            raise HTTPException(status_code=400, detail="First name is required")
        if not data.get("phone"):
            raise HTTPException(status_code=400, detail="Phone number is required")

        customer_data = {
            "company_id": company_id,
            "first_name": data.get("first_name"),
            "last_name": data.get("last_name"),
            "phone": data.get("phone"),
            "email": data.get("email", ""),
            "address": data.get("address", ""),
            "balance": "0.00",
            "total_purchases": "0.00",
            "created_at": firestore.SERVER_TIMESTAMP,
            "created_by": user.get("uid"),
        }

        doc_ref = db.collection("customers").document()
        doc_ref.set(customer_data)

        safe_response = customer_data.copy()
        safe_response["created_at"] = datetime.now().isoformat()

        return {"id": doc_ref.id, **safe_response}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customers/{customer_id}")
def get_customer(customer_id: str, user: dict = Depends(get_current_user)):
    """Get customer details with purchase history."""
    db = get_db()
    doc = db.collection("customers").document(customer_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer_data = {"id": doc.id, **doc.to_dict()}
    company_id = user.get("company_id")
    if customer_data.get("company_id") != company_id:
        raise HTTPException(status_code=403, detail="Unauthorized customer access")
    for key in ["created_at", "updated_at"]:
        if key in customer_data and hasattr(customer_data[key], "isoformat"):
            customer_data[key] = customer_data[key].isoformat()
        elif key in customer_data and customer_data[key] is not None:
            customer_data[key] = str(customer_data[key])

    # Get purchase history
    invoice_query = (
        db.collection("invoices")
        .where("company_id", "==", company_id)
        .where("customer_id", "==", customer_id)
    )
    try:
        invoice_docs = invoice_query.order_by(
            "issue_date", direction=firestore.Query.DESCENDING
        ).stream()
        invoice_docs = list(invoice_docs)
    except Exception:
        invoice_docs = list(invoice_query.stream())
        invoice_docs.sort(
            key=lambda d: (
                d.to_dict().get("issue_date") or d.to_dict().get("created_at") or ""
            ),
            reverse=True,
        )

    purchases = []
    total_invoiced = Decimal("0")
    total_paid_on_invoices = Decimal("0")
    for inv_doc in invoice_docs:
        inv_data = {"id": inv_doc.id, **inv_doc.to_dict()}
        total_invoiced += _safe_decimal(inv_data.get("total_amount", 0))
        total_paid_on_invoices += _safe_decimal(inv_data.get("amount_paid", 0))
        for key in ["created_at", "issue_date"]:
            if key in inv_data and hasattr(inv_data[key], "isoformat"):
                inv_data[key] = inv_data[key].isoformat()
        purchases.append(inv_data)

    payment_query = (
        db.collection("customer_payments")
        .where("company_id", "==", company_id)
        .where("customer_id", "==", customer_id)
    )
    try:
        payment_docs = payment_query.order_by(
            "created_at", direction=firestore.Query.DESCENDING
        ).stream()
        payment_docs = list(payment_docs)
    except Exception:
        payment_docs = list(payment_query.stream())
        payment_docs.sort(
            key=lambda d: d.to_dict().get("created_at") or "",
            reverse=True,
        )

    payments = []
    total_manual_payments = Decimal("0")
    for pay_doc in payment_docs:
        pay_data = {"id": pay_doc.id, **pay_doc.to_dict()}
        total_manual_payments += _safe_decimal(pay_data.get("amount", 0))
        if "created_at" in pay_data and hasattr(pay_data["created_at"], "isoformat"):
            pay_data["created_at"] = pay_data["created_at"].isoformat()
        payments.append(pay_data)

    current_balance = _safe_decimal(customer_data.get("balance", 0))
    customer_data["summary"] = {
        "invoice_count": len(purchases),
        "total_invoiced": str(total_invoiced),
        "total_paid_on_invoices": str(total_paid_on_invoices),
        "total_manual_payments": str(total_manual_payments),
        "outstanding": str(current_balance if current_balance > 0 else Decimal("0")),
        "credit_available": str(
            abs(current_balance) if current_balance < 0 else Decimal("0")
        ),
    }
    customer_data["purchases"] = purchases
    customer_data["payments"] = payments

    return customer_data


@router.put("/customers/{customer_id}")
def update_customer(
    customer_id: str, data: dict, user: dict = Depends(get_current_user)
):
    """Update customer details."""
    db = get_db()
    doc_ref = db.collection("customers").document(customer_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_fields = {
        k: v
        for k, v in data.items()
        if k
        not in [
            "id",
            "created_at",
            "created_by",
            "company_id",
            "balance",
            "total_purchases",
        ]
    }
    update_fields["updated_at"] = firestore.SERVER_TIMESTAMP

    doc_ref.update(update_fields)

    return {"id": customer_id, **update_fields}


@router.delete("/customers/{customer_id}")
def delete_customer(customer_id: str, user: dict = Depends(get_current_user)):
    """Delete a customer."""
    db = get_db()
    doc_ref = db.collection("customers").document(customer_id)

    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Check if they have any invoices (protect data integrity)
    invoices = (
        db.collection("invoices").where("customer_id", "==", customer_id).limit(1).get()
    )
    if len(invoices) > 0:
        raise HTTPException(
            status_code=400, detail="Cannot delete customer with transaction history"
        )

    doc_ref.delete()
    return {"status": "success"}


@router.post("/customers/{customer_id}/payment")
async def add_customer_payment(
    customer_id: str,
    request: Request,
    amount: Optional[float] = None,
    payment_method: str = "cash",
    notes: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Add a payment from customer (reduces their balance)."""
    db = get_db()
    company_id = user.get("company_id")

    body_amount = None
    body_method = None
    body_notes = None
    try:
        payload = await request.json()
        if isinstance(payload, dict):
            body_amount = payload.get("amount")
            body_method = payload.get("payment_method")
            body_notes = payload.get("notes")
    except Exception:
        pass

    final_amount = amount if amount is not None else body_amount
    if final_amount is None:
        raise HTTPException(status_code=422, detail="amount is required")

    if body_method:
        payment_method = body_method
    if body_notes is not None:
        notes = body_notes

    customer_ref = db.collection("customers").document(customer_id)
    customer_doc = customer_ref.get()

    if not customer_doc.exists:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer_data = customer_doc.to_dict()
    current_balance = _safe_decimal(customer_data.get("balance", 0))
    payment_amount = _safe_decimal(final_amount)
    if payment_amount <= 0:
        raise HTTPException(
            status_code=400, detail="Payment amount must be greater than zero"
        )

    # Reduce balance
    new_balance = current_balance - payment_amount

    customer_ref.update(
        {"balance": str(new_balance), "updated_at": firestore.SERVER_TIMESTAMP}
    )

    # Record payment
    payment_ref = db.collection("customer_payments").document()
    payment_ref.set(
        {
            "company_id": company_id,
            "customer_id": customer_id,
            "customer_name": f"{customer_data.get('first_name', '')} {customer_data.get('last_name', '')}",
            "amount": str(payment_amount),
            "payment_method": payment_method,
            "notes": notes or "",
            "previous_balance": str(current_balance),
            "new_balance": str(new_balance),
            "created_by": user.get("uid"),
            "created_at": firestore.SERVER_TIMESTAMP,
        }
    )

    # Allocate payment to oldest open invoices and close fully paid ones
    remaining_payment = payment_amount
    invoice_query = (
        db.collection("invoices")
        .where("company_id", "==", company_id)
        .where("customer_id", "==", customer_id)
    )
    try:
        invoice_docs = list(
            invoice_query.order_by(
                "issue_date", direction=firestore.Query.ASCENDING
            ).stream()
        )
    except Exception:
        invoice_docs = list(invoice_query.stream())
        invoice_docs.sort(
            key=lambda d: d.to_dict().get("issue_date")
            or d.to_dict().get("created_at")
            or ""
        )

    for inv_doc in invoice_docs:
        if remaining_payment <= 0:
            break

        inv = inv_doc.to_dict()
        total = _safe_decimal(inv.get("total_amount", 0))
        paid_cash = _safe_decimal(inv.get("amount_paid", 0))
        credit_applied = _safe_decimal(inv.get("credit_applied", 0))
        already_effective = paid_cash + credit_applied
        due = total - already_effective
        if due <= 0:
            continue

        add_paid = remaining_payment if remaining_payment <= due else due
        new_amount_paid = paid_cash + add_paid
        new_effective_paid = new_amount_paid + credit_applied
        new_due = total - new_effective_paid
        new_payment_status = "paid" if new_due <= 0 else "partial"

        update_payload = {
            "amount_paid": _decimal_to_str(new_amount_paid),
            "effective_paid": _decimal_to_str(new_effective_paid),
            "payment_status": new_payment_status,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
        if new_payment_status == "paid":
            update_payload["status"] = "closed"

        db.collection("invoices").document(inv_doc.id).update(update_payload)
        remaining_payment -= add_paid

    return {
        "id": payment_ref.id,
        "customer_id": customer_id,
        "amount": float(payment_amount),
        "new_balance": float(new_balance),
    }


# ===================== SALES / INVOICES =====================
@router.get("/sales/invoices")
@router.get("/invoices")
def list_invoices(
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """List all invoices with filters."""
    try:
        db = get_db()
        company_id = user.get("company_id")

        if not company_id:
            return []

        query = db.collection("invoices").where("company_id", "==", company_id)

        if status:
            query = query.where("status", "==", status)

        if customer_id:
            query = query.where("customer_id", "==", customer_id)

        try:
            docs = query.order_by(
                "issue_date", direction=firestore.Query.DESCENDING
            ).stream()
            docs = list(docs)
        except Exception:
            docs = list(query.stream())
            docs.sort(
                key=lambda d: (
                    d.to_dict().get("issue_date") or d.to_dict().get("created_at") or ""
                ),
                reverse=True,
            )

        results = []
        for doc in docs:
            data = {"id": doc.id, **doc.to_dict()}

            # Apply date filters manually (Firestore doesn't support multiple range filters)
            if from_date or to_date:
                created_at = data.get("created_at")
                if created_at:
                    if hasattr(created_at, "isoformat"):
                        created_str = created_at.isoformat()
                    else:
                        created_str = str(created_at)

                    if from_date and created_str < from_date:
                        continue
                    if to_date and created_str > to_date:
                        continue

            results.append(data)

        return results
    except Exception as e:
        print(f"Error listing invoices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sales/invoices")
@router.post("/invoices")
def create_invoice(data: dict, user: dict = Depends(get_current_user)):
    """Create a new sales invoice."""
    try:
        db = get_db()
        company_id = user.get("company_id")

        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID not found")

        if not data.get("customer_id"):
            raise HTTPException(status_code=400, detail="Customer is required")
        if not data.get("items") or len(data.get("items", [])) == 0:
            raise HTTPException(status_code=400, detail="At least one item is required")

        # Validate stock availability
        for item in data.get("items", []):
            product_id = item.get("product_id")
            quantity = Decimal(str(item.get("quantity", 0)))
            unit_price = Decimal(str(item.get("price", 0)))

            product_ref = db.collection("items").document(product_id)
            product_doc = product_ref.get()

            if not product_doc.exists:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product {item.get('product_name')} not found",
                )

            product_data = product_doc.to_dict()
            current_qty = Decimal(str(product_data.get("current_qty", 0)))
            cost_price = Decimal(str(product_data.get("cost_price", 0)))

            if unit_price < cost_price:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Selling price cannot be less than cost for {item.get('product_name')}. "
                        f"Cost: {cost_price}, Price: {unit_price}"
                    ),
                )

            if quantity > current_qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {item.get('product_name')}. Available: {current_qty}, Requested: {quantity}",
                )

        customer_ref = db.collection("customers").document(data.get("customer_id"))
        customer_doc = customer_ref.get()
        if not customer_doc.exists:
            raise HTTPException(status_code=400, detail="Customer not found")

        customer_data = customer_doc.to_dict()
        current_balance = Decimal(str(customer_data.get("balance", 0)))
        total_amount = Decimal(str(data.get("total_amount", 0)))
        amount_paid = Decimal(str(data.get("amount_paid", 0)))

        available_credit = abs(current_balance) if current_balance < 0 else Decimal("0")
        credit_applied = (
            available_credit if available_credit <= total_amount else total_amount
        )
        effective_paid = amount_paid + credit_applied

        payment_status = "unpaid"
        if effective_paid >= total_amount:
            payment_status = "paid"
        elif effective_paid > 0:
            payment_status = "partial"

        # Auto-generate invoice number if not provided
        invoice_number = data.get("invoice_number")
        if not invoice_number:
            counter_ref = db.collection("counters").document(f"invoice_{company_id}")
            try:
                # Use a transaction to safely increment the counter
                @firestore.transactional
                def get_next_invoice_number(transaction, counter_ref):
                    snapshot = transaction.get(counter_ref)
                    if not snapshot.exists:
                        new_count = 1
                        transaction.set(counter_ref, {"count": new_count})
                    else:
                        new_count = snapshot.get("count") + 1
                        transaction.update(counter_ref, {"count": new_count})
                    return new_count

                transaction = db.transaction()
                next_count = get_next_invoice_number(transaction, counter_ref)
                invoice_number = f"INV-{next_count:05d}"
            except Exception as e:
                print(f"Error generating invoice number: {e}")
                # Fallback to timestamp if transaction fails
                invoice_number = f"INV-{int(datetime.now().timestamp())}"

        # Store creator info
        creator_role = user.get("role", "staff").capitalize()
        created_by_display = "Admin" if user.get("role") == "admin" else creator_role

        # Create invoice
        invoice_data = {
            "company_id": company_id,
            "invoice_number": invoice_number,
            "customer_id": data.get("customer_id"),
            "customer_name": data.get("customer_name"),
            "customer_phone": data.get("customer_phone", ""),
            "items": data.get("items", []),
            "subtotal": str(data.get("subtotal", 0)),
            "discount": str(data.get("discount", 0)),
            "tax": str(data.get("tax", 0)),
            "total_amount": str(total_amount),
            "amount_paid": str(amount_paid),
            "credit_applied": str(credit_applied),
            "effective_paid": str(effective_paid),
            "payment_status": payment_status,
            "payment_method": data.get("payment_method", "cash"),
            "notes": data.get("notes", ""),
            "status": "closed"
            if payment_status == "paid"
            else data.get("status", "issued"),
            "issue_date": data.get("issue_date") or datetime.now().isoformat(),
            "due_date": data.get("due_date"),
            "created_by": created_by_display,
            "created_by_uid": user.get("uid"),
            "created_at": firestore.SERVER_TIMESTAMP,
        }

        doc_ref = db.collection("invoices").document()
        doc_ref.set(invoice_data)

        # Deduct stock for each item
        for item in data.get("items", []):
            product_id = item.get("product_id")
            quantity = Decimal(str(item.get("quantity", 0)))

            product_ref = db.collection("items").document(product_id)
            product_doc = product_ref.get()
            product_data = product_doc.to_dict()

            current_qty = Decimal(str(product_data.get("current_qty", 0)))
            current_wac = Decimal(str(product_data.get("current_wac", 0)))
            new_qty = current_qty - quantity

            product_ref.update(
                {
                    "current_qty": str(new_qty),
                    "total_value": str(new_qty * current_wac),
                    "updated_at": firestore.SERVER_TIMESTAMP,
                }
            )

            # Backfill layer quantities for legacy stock (pre-layer records)
            layer_docs = list(
                db.collection("stock_cost_layers")
                .where("company_id", "==", company_id)
                .where("product_id", "==", product_id)
                .stream()
            )
            layer_on_hand = Decimal("0")
            for ld in layer_docs:
                layer_on_hand += _safe_decimal(ld.to_dict().get("qty_on_hand", 0))

            if layer_on_hand < current_qty:
                missing = current_qty - layer_on_hand
                if missing > 0:
                    _upsert_cost_layer(db, company_id, product_id, current_wac, missing)

            _consume_cost_layers_fifo(db, company_id, product_id, quantity)

        # Update customer running balance (supports credit carry-over)
        total_purchases = Decimal(str(customer_data.get("total_purchases", 0)))
        new_balance = current_balance + total_amount - amount_paid

        customer_ref.update(
            {
                "balance": str(new_balance),
                "total_purchases": str(total_purchases + total_amount),
                "updated_at": firestore.SERVER_TIMESTAMP,
            }
        )

        # Remove non-serializable timestamp sentinels before returning
        safe_response = invoice_data.copy()
        safe_response["created_at"] = datetime.now().isoformat()
        if "issue_date" in safe_response and hasattr(
            safe_response["issue_date"], "isoformat"
        ):
            safe_response["issue_date"] = safe_response["issue_date"].isoformat()

        return {"id": doc_ref.id, **safe_response}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sales/invoices/{invoice_id}")
@router.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    """Get invoice details."""
    db = get_db()
    doc = db.collection("invoices").document(invoice_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return {"id": doc.id, **doc.to_dict()}


@router.post("/sales/invoices/{invoice_id}/pay")
def add_payment(
    invoice_id: str,
    amount: float,
    user: dict = Depends(get_current_user),
):
    """Add a payment to an existing invoice."""
    db = get_db()
    company_id = user.get("company_id")

    invoice_ref = db.collection("invoices").document(invoice_id)

    try:
        # Direct read (no transaction — avoids generator bug)
        invoice_doc = invoice_ref.get()
        if not invoice_doc.exists:
            raise HTTPException(status_code=404, detail="Invoice not found")

        invoice_data = invoice_doc.to_dict()
        if invoice_data.get("company_id") != company_id:
            raise HTTPException(status_code=403, detail="Access denied")

        current_paid = Decimal(str(invoice_data.get("amount_paid", 0)))
        total_amount = Decimal(str(invoice_data.get("total_amount", 0)))
        payment_amount = Decimal(f"{amount:.2f}")

        new_paid = current_paid + payment_amount

        # Prevent overpayment
        if new_paid > (total_amount + Decimal("0.01")):
            raise HTTPException(
                status_code=400,
                detail=f"Payment exceeds balance. Remaining: {total_amount - current_paid}"
            )

        payment_status = "unpaid"
        if new_paid >= (total_amount - Decimal("0.01")):
            payment_status = "paid"
            new_paid = total_amount
        elif new_paid > 0:
            payment_status = "partial"

        # Update invoice
        invoice_ref.update({
            "amount_paid": str(new_paid),
            "payment_status": payment_status,
            "status": "closed" if payment_status == "paid" else invoice_data.get("status", "issued"),
            "updated_at": firestore.SERVER_TIMESTAMP
        })

        # Record payment for audit trail
        db.collection("payments").document().set({
            "invoice_id": invoice_id,
            "company_id": company_id,
            "amount": str(payment_amount),
            "created_by": user.get("uid"),
            "created_at": firestore.SERVER_TIMESTAMP
        })

        return {"message": "Payment added successfully"}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Payment failed: {str(e)}")


@router.get("/sales/invoices/{invoice_id}/pdf")
def get_invoice_pdf(invoice_id: str):
    """Return a print-friendly HTML view of the invoice."""
    db = get_db()
    doc = db.collection("invoices").document(invoice_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Invoice not found")

    inv = doc.to_dict()
    items_html = ""
    for item in inv.get("items", []):
        items_html += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">{item.get('product_name')}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">{item.get('quantity')}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">{int(float(item.get('price', 0))):,} IQD</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">{int(float(item.get('total', 0))):,} IQD</td>
        </tr>
        """

    total = float(inv.get("total_amount", 0))
    paid = float(inv.get("amount_paid", 0))
    remaining = total - paid
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Invoice {inv.get('invoice_number')}</title>
        <style>
            body {{ font-family: 'Inter', system-ui, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; max-width: 800px; margin: auto; }}
            .header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }}
            .logo {{ font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.025em; }}
            .invoice-info {{ text-align: right; }}
            .invoice-info h1 {{ margin: 0; font-size: 32px; font-weight: 900; }}
            .details {{ display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 40px; }}
            .section-title {{ font-size: 12px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 8px; }}
            table {{ width: 100%; border-collapse: collapse; margin-bottom: 40px; }}
            th {{ text-align: left; font-size: 12px; font-weight: 900; text-transform: uppercase; color: #64748b; padding: 12px; border-bottom: 2px solid #e2e8f0; }}
            .totals {{ margin-left: auto; width: 300px; }}
            .total-row {{ display: flex; justify-content: space-between; padding: 8px 0; }}
            .total-row.grand-total {{ font-size: 20px; font-weight: 900; border-top: 2px solid #e2e8f0; margin-top: 12px; padding-top: 12px; }}
            @media print {{ .no-print {{ display: none; }} body {{ padding: 0; }} }}
        </style>
    </head>
    <body onload="window.print()">
        <div class="header">
            <div class="logo">OPENGATE ERP</div>
            <div class="invoice-info">
                <h1>INVOICE</h1>
                <p style="font-weight: bold; color: #64748b;">#{inv.get('invoice_number')}</p>
            </div>
        </div>

        <div class="details">
            <div>
                <div class="section-title">Bill To</div>
                <p style="font-weight: bold; font-size: 18px; margin: 0;">{inv.get('customer_name')}</p>
                <p style="margin: 4px 0; color: #64748b;">{inv.get('customer_phone', '')}</p>
            </div>
            <div style="text-align: right;">
                <div class="section-title">Invoice Details</div>
                <p style="margin: 4px 0;"><strong>Date:</strong> {inv.get('issue_date')}</p>
                <p style="margin: 4px 0;"><strong>Status:</strong> {inv.get('status').upper()}</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Item Description</th>
                    <th style="text-align: right;">Qty</th>
                    <th style="text-align: right;">Price</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>

        <div class="totals">
            <div class="total-row">
                <span>Subtotal</span>
                <span style="font-weight: bold;">{int(float(inv.get('subtotal', 0))):,} IQD</span>
            </div>
            <div class="total-row">
                <span>Discount</span>
                <span style="font-weight: bold; color: #10b981;">-{int(float(inv.get('discount', 0))):,} IQD</span>
            </div>
            <div class="total-row grand-total">
                <span>Total</span>
                <span>{int(total):,} IQD</span>
            </div>
            <div class="total-row" style="color: #10b981; font-weight: bold;">
                <span>Amount Paid</span>
                <span>{int(paid):,} IQD</span>
            </div>
            <div class="total-row" style="color: #f59e0b; font-weight: bold;">
                <span>Balance Due</span>
                <span>{int(remaining):,} IQD</span>
            </div>
        </div>

        <div style="margin-top: 80px; text-align: center; color: #94a3b8; font-size: 12px;">
            Thank you for your business!
        </div>
    </body>
    </html>
    """
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html_content)


@router.post("/sales/invoices/{invoice_id}/return")
@router.post("/invoices/{invoice_id}/return")
def process_return(invoice_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Process a return for an invoice."""
    db = get_db()
    company_id = user.get("company_id")

    invoice_ref = db.collection("invoices").document(invoice_id)
    invoice_doc = invoice_ref.get()

    if not invoice_doc.exists:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice_data = invoice_doc.to_dict()

    # Process each returned item
    for return_item in data.get("items", []):
        product_id = return_item.get("product_id")
        quantity = Decimal(str(return_item.get("quantity", 0)))
        refund_amount = Decimal(str(return_item.get("refund_amount", 0)))

        # Add stock back
        product_ref = db.collection("items").document(product_id)
        product_doc = product_ref.get()

        if product_doc.exists:
            product_data = product_doc.to_dict()
            current_qty = Decimal(str(product_data.get("current_qty", 0)))
            current_wac = Decimal(str(product_data.get("current_wac", 0)))
            new_qty = current_qty + quantity

            product_ref.update(
                {
                    "current_qty": str(new_qty),
                    "total_value": str(new_qty * current_wac),
                    "updated_at": firestore.SERVER_TIMESTAMP,
                }
            )

    # Create return record
    return_ref = db.collection("returns").document()
    return_ref.set(
        {
            "company_id": company_id,
            "invoice_id": invoice_id,
            "items": data.get("items", []),
            "total_refund": str(data.get("total_refund", 0)),
            "reason": data.get("reason", ""),
            "created_by": user.get("uid"),
            "created_at": firestore.SERVER_TIMESTAMP,
        }
    )

    # Update invoice status
    invoice_ref.update(
        {
            "status": "returned",
            "return_id": return_ref.id,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
    )

    return {"id": return_ref.id, "status": "processed"}


# ===================== TRANSFERS =====================
@router.get("/transfers")
def list_transfers(
    status: Optional[str] = None, user: dict = Depends(get_current_user)
):
    """List all transfers."""
    db = get_db()
    company_id = user.get("company_id")

    query = db.collection("transfers").where("company_id", "==", company_id)

    if status:
        query = query.where("status", "==", status)

    try:
        docs = query.order_by(
            "created_at", direction=firestore.Query.DESCENDING
        ).stream()
        docs = list(docs)
    except Exception:
        docs = list(query.stream())
        docs.sort(
            key=lambda d: d.to_dict().get("created_at") or "",
            reverse=True,
        )

    results = []
    for doc in docs:
        data = {"id": doc.id, **doc.to_dict()}
        results.append(data)

    return results


@router.post("/transfers")
def create_transfer(data: dict, user: dict = Depends(get_current_user)):
    """Create a new transfer request."""
    db = get_db()
    company_id = user.get("company_id")

    transfer_data = {
        "company_id": company_id,
        "transfer_number": data.get("transfer_number"),
        "from_warehouse": data.get("from_warehouse"),
        "to_warehouse": data.get("to_warehouse"),
        "items": data.get("items", []),
        "status": "pending",
        "requested_by": user.get("uid"),
        "created_at": firestore.SERVER_TIMESTAMP,
    }

    doc_ref = db.collection("transfers").document()
    doc_ref.set(transfer_data)

    safe_response = transfer_data.copy()
    safe_response["created_at"] = datetime.now().isoformat()

    return {"id": doc_ref.id, **safe_response}


@router.put("/transfers/{transfer_id}/status")
def update_transfer_status(
    transfer_id: str, status: str, user: dict = Depends(get_current_user)
):
    """Update transfer status (pending → in_transit → received)."""
    db = get_db()

    transfer_ref = db.collection("transfers").document(transfer_id)
    transfer_doc = transfer_ref.get()

    if not transfer_doc.exists:
        raise HTTPException(status_code=404, detail="Transfer not found")

    transfer_data = transfer_doc.to_dict()

    # Validate status transition
    valid_transitions = {
        "pending": ["in_transit", "cancelled"],
        "in_transit": ["received"],
        "received": [],
        "cancelled": [],
    }

    current_status = transfer_data.get("status")
    if status not in valid_transitions.get(current_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition from {current_status} to {status}",
        )

    update_data = {
        "status": status,
        "updated_at": firestore.SERVER_TIMESTAMP,
        "updated_by": user.get("uid"),
    }

    if status == "received":
        update_data["received_by"] = user.get("uid")
        update_data["received_at"] = firestore.SERVER_TIMESTAMP

    transfer_ref.update(update_data)

    return {"id": transfer_id, "status": status}


# ===================== SUPPLIERS (Simplified) =====================
@router.get("/suppliers")
def list_suppliers(
    search: Optional[str] = None, user: dict = Depends(get_current_user)
):
    """List all suppliers."""
    db = get_db()
    company_id = user.get("company_id")

    docs = db.collection("suppliers").where("company_id", "==", company_id).stream()

    results = []
    for doc in docs:
        data = {"id": doc.id, **doc.to_dict()}

        if search:
            search_lower = search.lower()
            name = data.get("name", "").lower()
            if search_lower not in name:
                continue

        results.append(data)

    return results


@router.post("/suppliers")
def create_supplier(data: dict, user: dict = Depends(get_current_user)):
    """Create a new supplier."""
    db = get_db()
    company_id = user.get("company_id")

    supplier_data = {
        "company_id": company_id,
        "name": data.get("name"),
        "contact_person": data.get("contact_person", ""),
        "phone": data.get("phone", ""),
        "email": data.get("email", ""),
        "address": data.get("address", ""),
        "created_at": firestore.SERVER_TIMESTAMP,
    }

    doc_ref = db.collection("suppliers").document()
    doc_ref.set(supplier_data)

    return {"id": doc_ref.id, **supplier_data}


# ===================== WAREHOUSES (Compatibility) =====================
@router.get("/warehouse/uoms")
def list_warehouse_uoms(user: dict = Depends(get_current_user)):
    """List unit codes for warehouse capacity input."""
    return [
        {"id": "PLT", "code": "PLT", "name": "Pallet"},
        {"id": "BOX", "code": "BOX", "name": "Box"},
        {"id": "PCS", "code": "PCS", "name": "Pieces"},
    ]


@router.get("/warehouse/warehouses")
def list_warehouses(user: dict = Depends(get_current_user)):
    """List warehouses."""
    db = get_db()
    company_id = user.get("company_id")
    docs = db.collection("warehouses").where("company_id", "==", company_id).stream()
    results = []
    for doc in docs:
        data = {"id": doc.id, **doc.to_dict()}
        results.append(data)
    return results


@router.post("/warehouse/warehouses")
def create_warehouse(data: dict, user: dict = Depends(get_current_user)):
    """Create warehouse."""
    db = get_db()
    company_id = user.get("company_id")
    payload = {
        "company_id": company_id,
        "name": data.get("name", ""),
        "code": data.get("code", ""),
        "capacity": data.get("capacity", ""),
        "location": data.get("location", ""),
        "created_at": firestore.SERVER_TIMESTAMP,
    }
    ref = db.collection("warehouses").document()
    ref.set(payload)
    safe_payload = payload.copy()
    safe_payload["created_at"] = datetime.now().isoformat()
    return {"id": ref.id, **safe_payload}


# ===================== COMPANY PROFILE =====================
@router.get("/company/profile")
def get_company_profile(user: dict = Depends(get_current_user)):
    """Get company profile/settings used in invoice templates."""
    db = get_db()
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Company ID not found")

    doc = db.collection("company_settings").document(company_id).get()
    if not doc.exists:
        return {
            "company_name": "Warehouse Pro",
            "description": "",
            "location": "",
            "phone": "",
            "email": "",
            "website": "",
            "invoice_note": "",
            "payment_details": "",
        }

    data = doc.to_dict()
    for key in ["created_at", "updated_at"]:
        if key in data and hasattr(data[key], "isoformat"):
            data[key] = data[key].isoformat()
        elif key in data and data[key] is not None:
            data[key] = str(data[key])
    return {"id": doc.id, **data}


@router.put("/company/profile")
def update_company_profile(data: dict, user: dict = Depends(get_current_user)):
    """Create/update company profile settings."""
    db = get_db()
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Company ID not found")

    payload = {
        "company_name": data.get("company_name", ""),
        "description": data.get("description", ""),
        "location": data.get("location", ""),
        "phone": data.get("phone", ""),
        "email": data.get("email", ""),
        "website": data.get("website", ""),
        "invoice_note": data.get("invoice_note", ""),
        "payment_details": data.get("payment_details", ""),
        "updated_at": firestore.SERVER_TIMESTAMP,
        "updated_by": user.get("uid"),
    }

    ref = db.collection("company_settings").document(company_id)
    if not ref.get().exists:
        payload["created_at"] = firestore.SERVER_TIMESTAMP
    ref.set(payload, merge=True)

    safe_payload = payload.copy()
    safe_payload["updated_at"] = datetime.now().isoformat()
    if "created_at" in safe_payload:
        safe_payload["created_at"] = datetime.now().isoformat()
    return {"id": company_id, **safe_payload}


# ===================== EMPLOYEES / TEAM =====================
@router.get("/employees")
def list_employees(role: Optional[str] = None, user: dict = Depends(get_current_user)):
    """List all employees."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    db = get_db()
    company_id = user.get("company_id")

    docs = db.collection("users").where("company_id", "==", company_id).stream()

    results = []
    for doc in docs:
        data = {"id": doc.id, **doc.to_dict()}

        if role and data.get("role") != role:
            continue

        # Remove sensitive data
        data.pop("password", None)

        results.append(data)

    return results


@router.post("/employees")
def create_employee(data: dict, user: dict = Depends(get_current_user)):
    """Create a new employee."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    service = get_users_service(user)

    uid = service.create_employee(
        email=data.get("email"),
        password=data.get("password"),
        role=data.get("role", "viewer"),
        allowed_tabs=data.get("allowed_tabs", ["dashboard"]),
    )

    # Update with additional info
    db = get_db()
    db.collection("users").document(uid).update(
        {
            "full_name": data.get("full_name"),
            "phone": data.get("phone", ""),
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
    )

    return {"id": uid, "status": "created"}


@router.put("/employees/{employee_id}")
def update_employee(
    employee_id: str, data: dict, user: dict = Depends(get_current_user)
):
    """Update employee details."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    db = get_db()
    doc_ref = db.collection("users").document(employee_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_fields = {
        k: v for k, v in data.items() if k not in ["id", "uid", "company_id"]
    }
    update_fields["updated_at"] = firestore.SERVER_TIMESTAMP

    doc_ref.update(update_fields)

    return {"id": employee_id, **update_fields}


@router.delete("/employees/{employee_id}")
def delete_employee(employee_id: str, user: dict = Depends(get_current_user)):
    """Delete an employee."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    service = get_users_service(user)
    service.delete_user(employee_id)

    return {"id": employee_id, "status": "deleted"}


# ===================== SHIFTS =====================
@router.get("/shifts")
def list_shifts(
    employee_id: Optional[str] = None, user: dict = Depends(get_current_user)
):
    """List all shifts."""
    db = get_db()
    company_id = user.get("company_id")

    query = db.collection("shifts").where("company_id", "==", company_id)

    if employee_id:
        query = query.where("employee_id", "==", employee_id)
    elif user.get("role") != "admin":
        # Non-admins only see their own shifts
        query = query.where("employee_id", "==", user.get("uid"))

    docs = query.order_by("date", direction=firestore.Query.DESCENDING).stream()

    results = []
    for doc in docs:
        data = {"id": doc.id, **doc.to_dict()}
        results.append(data)

    return results


@router.post("/shifts")
def create_shift(data: dict, user: dict = Depends(get_current_user)):
    """Create a new shift (admin only)."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    db = get_db()
    company_id = user.get("company_id")

    shift_data = {
        "company_id": company_id,
        "employee_id": data.get("employee_id"),
        "employee_name": data.get("employee_name"),
        "date": data.get("date"),
        "start_time": data.get("start_time"),
        "end_time": data.get("end_time"),
        "notes": data.get("notes", ""),
        "created_by": user.get("uid"),
        "created_at": firestore.SERVER_TIMESTAMP,
    }

    doc_ref = db.collection("shifts").document()
    doc_ref.set(shift_data)

    return {"id": doc_ref.id, **shift_data}


@router.delete("/shifts/{shift_id}")
def delete_shift(shift_id: str, user: dict = Depends(get_current_user)):
    """Delete a shift."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    db = get_db()
    doc_ref = db.collection("shifts").document(shift_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Shift not found")

    doc_ref.delete()

    return {"id": shift_id, "status": "deleted"}


# ===================== USER PROFILE =====================
@router.get("/me")
def get_current_user_profile(user: dict = Depends(get_current_user)):
    """Get current user profile."""
    return {
        "uid": user.get("uid"),
        "email": user.get("email"),
        "role": user.get("role"),
        "company_id": user.get("company_id"),
        "full_name": user.get("full_name"),
        "phone": user.get("phone"),
        "allowed_tabs": user.get("allowed_tabs", []),
    }


# ===================== IMPORT/EXPORT =====================
@router.post("/products/import")
def import_products(file: dict, user: dict = Depends(get_current_user)):
    """Import products from Excel/CSV data."""
    db = get_db()
    company_id = user.get("company_id")

    products = file.get("data", [])
    created = []
    errors = []

    for idx, product_data in enumerate(products):
        try:
            cost_price = Decimal(str(product_data.get("cost_price", 0)))
            selling_price = Decimal(str(product_data.get("selling_price", 0)))
            if selling_price < cost_price:
                errors.append(
                    {
                        "row": idx + 1,
                        "error": "Selling price cannot be lower than cost price",
                    }
                )
                continue

            product_record = {
                "company_id": company_id,
                "name": product_data.get("name"),
                "sku": product_data.get("sku"),
                "cost_price": str(product_data.get("cost_price", 0)),
                "selling_price": str(product_data.get("selling_price", 0)),
                "pricing_type": product_data.get("pricing_type", "fixed"),
                "current_qty": "0.0000",
                "current_wac": "0.0000",
                "total_value": "0.0000",
                "min_stock_level": str(product_data.get("min_stock_level", 0)),
                "unit": product_data.get("unit", "piece"),
                "created_at": firestore.SERVER_TIMESTAMP,
                "created_by": user.get("uid"),
            }

            doc_ref = db.collection("items").document()
            doc_ref.set(product_record)
            created.append({"row": idx + 1, "id": doc_ref.id})

        except Exception as e:
            errors.append({"row": idx + 1, "error": str(e)})

    return {
        "total": len(products),
        "created": len(created),
        "errors": len(errors),
        "details": {"created": created, "errors": errors},
    }
