"use client";

import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { ArrowDownCircle, ArrowUpCircle, Package, Plus } from "lucide-react";
import ProductSubTabs from "@/components/products/ProductSubTabs";

interface Product {
    id: string;
    name: string;
    sku: string;
    cost_price: string;
    current_qty: string;
}

interface Adjustment {
    id: string;
    product_id: string;
    product_name: string;
    quantity_change: string;
    reason: string;
    notes?: string;
    created_at?: string;
}

interface LedgerRow {
    id: string;
    created_at: string;
    quantity_change: string;
    reason: string;
    notes: string;
    running_qty: string;
}

interface LedgerResponse {
    product: { id: string; name: string; sku: string; current_qty: string };
    opening_qty: string;
    in_qty: string;
    out_qty: string;
    closing_qty: string;
    movements: LedgerRow[];
}

export default function ProductStockPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [ledger, setLedger] = useState<LedgerResponse | null>(null);
    const [ledgerFilter, setLedgerFilter] = useState({
        product_id: "",
        from_date: "",
        to_date: "",
    });

    const [form, setForm] = useState({
        product_id: "",
        movement: "in",
        quantity: "",
        reason: "purchase",
        notes: "",
    });

    const selectedProduct = useMemo(
        () => products.find((p) => p.id === form.product_id) || null,
        [products, form.product_id]
    );

    useEffect(() => {
        void loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();

            const [productsRes, adjustmentsRes] = await Promise.all([
                fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("/api/products/adjustments?limit=100", {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const productPayload = productsRes.ok ? await productsRes.json() : [];
            const adjustmentPayload = adjustmentsRes.ok ? await adjustmentsRes.json() : [];

            setProducts(Array.isArray(productPayload) ? productPayload : []);
            setAdjustments(Array.isArray(adjustmentPayload) ? adjustmentPayload : []);
        } catch {
            setProducts([]);
            setAdjustments([]);
        } finally {
            setLoading(false);
        }
    };

    const submitMovement = async () => {
        if (!form.product_id || !form.quantity) {
            setMessage("Choose product and quantity.");
            return;
        }

        const qty = Number(form.quantity);
        if (!Number.isFinite(qty) || qty <= 0) {
            setMessage("Quantity must be greater than zero.");
            return;
        }

        setSubmitting(true);
        setMessage("");
        try {
            const token = await auth.currentUser?.getIdToken();
            const signedQty = form.movement === "in" ? qty : -qty;
            const params = new URLSearchParams({
                quantity: String(signedQty),
                reason: form.reason,
                notes: form.notes,
            });

            const res = await fetch(
                `/api/products/${form.product_id}/adjust-stock?${params.toString()}`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!res.ok) {
                const raw = await res.text();
                setMessage(raw || "Could not save stock movement.");
                return;
            }

            setForm({
                product_id: "",
                movement: "in",
                quantity: "",
                reason: "purchase",
                notes: "",
            });
            setMessage("Stock movement saved.");
            await loadAll();
        } catch {
            setMessage("Could not save stock movement.");
        } finally {
            setSubmitting(false);
        }
    };

    const formatNumber = (value: string) => Number(value || 0).toLocaleString("en-US");

    const loadLedger = async () => {
        if (!ledgerFilter.product_id) {
            setMessage("Choose product for ledger.");
            return;
        }

        setLedgerLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const params = new URLSearchParams();
            if (ledgerFilter.from_date) params.append("from_date", `${ledgerFilter.from_date}T00:00:00`);
            if (ledgerFilter.to_date) params.append("to_date", `${ledgerFilter.to_date}T23:59:59`);

            const res = await fetch(
                `/api/products/${ledgerFilter.product_id}/ledger?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                setLedger(null);
                return;
            }

            const payload = await res.json();
            setLedger(payload);
        } catch {
            setLedger(null);
        } finally {
            setLedgerLoading(false);
        }
    };

    const totals = useMemo(() => {
        let inQty = 0;
        let outQty = 0;
        let inValue = 0;
        let outValue = 0;

        for (const row of adjustments) {
            const qty = Number(row.quantity_change || 0);
            const product = products.find((p) => p.id === row.product_id);
            const cost = Number(product?.cost_price || 0);
            if (qty > 0) {
                inQty += qty;
                inValue += qty * cost;
            } else {
                outQty += Math.abs(qty);
                outValue += Math.abs(qty) * cost;
            }
        }

        return { inQty, outQty, inValue, outValue };
    }, [adjustments, products]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#102642]">Products</h1>
                <p className="text-sm text-gray-500">Manage products, stock in/out, and stock value impact</p>
            </div>

            <ProductSubTabs />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-500">Total In Qty</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatNumber(String(totals.inQty))}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-500">Total Out Qty</p>
                    <p className="text-2xl font-bold text-rose-600">{formatNumber(String(totals.outQty))}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-500">Inbound Value (IQD)</p>
                    <p className="text-2xl font-bold text-[#102642]">{formatNumber(String(Math.round(totals.inValue)))}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-500">Outbound Value (IQD)</p>
                    <p className="text-2xl font-bold text-[#102642]">{formatNumber(String(Math.round(totals.outValue)))}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-4">
                <h2 className="text-lg font-semibold text-[#102642] flex items-center gap-2">
                    <Plus size={18} /> New Stock Movement
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <select
                        value={form.product_id}
                        onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                        className="form-input"
                    >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                    </select>

                    <select
                        value={form.movement}
                        onChange={(e) => setForm({ ...form, movement: e.target.value })}
                        className="form-input"
                    >
                        <option value="in">Inbound (Add)</option>
                        <option value="out">Outbound (Remove)</option>
                    </select>

                    <input
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        placeholder="Quantity"
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        className="form-input"
                    />

                    <select
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                        className="form-input"
                    >
                        <option value="purchase">Purchase</option>
                        <option value="sale">Sale</option>
                        <option value="return">Return</option>
                        <option value="damage">Damage</option>
                        <option value="adjustment">Manual Adjustment</option>
                    </select>

                    <button
                        onClick={submitMovement}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg bg-[#54C7E5] text-white font-medium disabled:opacity-50"
                    >
                        {submitting ? "Saving..." : "Save"}
                    </button>
                </div>

                <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Notes (optional)"
                    className="form-input min-h-20"
                />

                {selectedProduct && (
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Package size={15} />
                        Current stock for <span className="font-semibold">{selectedProduct.name}</span>: {formatNumber(selectedProduct.current_qty)}
                    </div>
                )}

                {message && <p className="text-sm text-[#102642]">{message}</p>}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-[#102642]">Latest Stock Movements</h2>
                </div>
                {loading ? (
                    <div className="p-6 text-sm text-gray-500">Loading...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Date</th>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Product</th>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Type</th>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Qty</th>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Reason</th>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {adjustments.map((row) => {
                                    const qty = Number(row.quantity_change || 0);
                                    const inbound = qty > 0;
                                    return (
                                        <tr key={row.id} className="border-t border-gray-100">
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-[#102642]">{row.product_name || row.product_id}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${inbound ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                                    {inbound ? <ArrowDownCircle size={13} /> : <ArrowUpCircle size={13} />}
                                                    {inbound ? "Inbound" : "Outbound"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold">{formatNumber(String(Math.abs(qty)))}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{row.reason}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{row.notes || "-"}</td>
                                        </tr>
                                    );
                                })}
                                {adjustments.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">No stock movements yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-4">
                <h2 className="text-lg font-semibold text-[#102642]">Product Stock Ledger</h2>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select
                        value={ledgerFilter.product_id}
                        onChange={(e) => setLedgerFilter({ ...ledgerFilter, product_id: e.target.value })}
                        className="form-input"
                    >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                    </select>

                    <input
                        type="date"
                        value={ledgerFilter.from_date}
                        onChange={(e) => setLedgerFilter({ ...ledgerFilter, from_date: e.target.value })}
                        className="form-input"
                    />

                    <input
                        type="date"
                        value={ledgerFilter.to_date}
                        onChange={(e) => setLedgerFilter({ ...ledgerFilter, to_date: e.target.value })}
                        className="form-input"
                    />

                    <button
                        onClick={loadLedger}
                        disabled={ledgerLoading}
                        className="px-4 py-2 rounded-lg bg-[#102642] text-white font-medium disabled:opacity-50"
                    >
                        {ledgerLoading ? "Loading..." : "Load Ledger"}
                    </button>
                </div>

                {ledger && (
                    <>
                        <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                            <p className="text-xs text-gray-500">Product</p>
                            <p className="text-sm font-semibold text-[#102642]">
                                {ledger.product.name} ({ledger.product.sku})
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="rounded-lg border border-gray-200 p-3">
                                <p className="text-xs text-gray-500">Current Stock</p>
                                <p className="text-lg font-semibold text-[#102642]">{formatNumber(ledger.product.current_qty)}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 p-3">
                                <p className="text-xs text-gray-500">Opening</p>
                                <p className="text-lg font-semibold text-[#102642]">{formatNumber(ledger.opening_qty)}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 p-3">
                                <p className="text-xs text-gray-500">In</p>
                                <p className="text-lg font-semibold text-emerald-600">{formatNumber(ledger.in_qty)}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 p-3">
                                <p className="text-xs text-gray-500">Out</p>
                                <p className="text-lg font-semibold text-rose-600">{formatNumber(ledger.out_qty)}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 p-3">
                                <p className="text-xs text-gray-500">Closing</p>
                                <p className="text-lg font-semibold text-[#102642]">{formatNumber(ledger.closing_qty)}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Date</th>
                                        <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Change</th>
                                        <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Reason</th>
                                        <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Running</th>
                                        <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ledger.movements.map((row) => (
                                        <tr key={row.id} className="border-t border-gray-100">
                                            <td className="px-4 py-3 text-sm text-gray-600">{new Date(row.created_at).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-sm font-semibold">{formatNumber(row.quantity_change)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{row.reason}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-[#102642]">{formatNumber(row.running_qty)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{row.notes || "-"}</td>
                                        </tr>
                                    ))}
                                    {ledger.movements.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                                                No movements in selected range.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
