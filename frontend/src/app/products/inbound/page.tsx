"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import ProductSubTabs from "@/components/products/ProductSubTabs";
import { ArrowDownCircle } from "lucide-react";

interface Product {
    id: string;
    name: string;
    sku: string;
    current_qty: string;
    cost_price: string;
}

interface Supplier {
    id: string;
    name: string;
}

interface InboundRow {
    id: string;
    product_name: string;
    quantity: string;
    unit_cost: string;
    total_cost: string;
    supplier_name?: string;
    reason: string;
    created_at?: string;
}

interface CostLayer {
    id: string;
    unit_cost: string;
    qty_on_hand: string;
    qty_received_total: string;
    qty_sold: string;
    stock_value: string;
}

export default function ProductInboundPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [rows, setRows] = useState<InboundRow[]>([]);
    const [layers, setLayers] = useState<CostLayer[]>([]);
    const [layersLoading, setLayersLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        product_id: "",
        quantity: "",
        unit_cost: "",
        supplier_id: "",
        supplier_name: "",
        reason: "purchase",
        notes: "",
        update_cost_price: false,
    });

    const selectedProduct = useMemo(
        () => products.find((p) => p.id === form.product_id) || null,
        [products, form.product_id]
    );

    const currentCost = Number(selectedProduct?.cost_price || 0);
    const unitCost = Number(form.unit_cost || 0);
    const quantity = Number(form.quantity || 0);
    const totalCost = unitCost * quantity;
    const costIsLower = !!selectedProduct && unitCost > 0 && unitCost < currentCost;

    useEffect(() => {
        void loadData();
    }, []);

    useEffect(() => {
        if (!form.product_id) {
            setLayers([]);
            return;
        }
        void loadCostLayers(form.product_id);
    }, [form.product_id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const [pRes, sRes, inRes] = await Promise.all([
                fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("/api/suppliers", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("/api/products/inbound?limit=100", { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const p = pRes.ok ? await pRes.json() : [];
            const s = sRes.ok ? await sRes.json() : [];
            const inbound = inRes.ok ? await inRes.json() : [];

            setProducts(Array.isArray(p) ? p : []);
            setSuppliers(Array.isArray(s) ? s : []);
            setRows(Array.isArray(inbound) ? inbound : []);
        } catch {
            setProducts([]);
            setSuppliers([]);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    const submitInbound = async () => {
        if (!form.product_id) {
            setMessage("Select a product.");
            return;
        }
        if (!quantity || quantity <= 0) {
            setMessage("Quantity must be greater than zero.");
            return;
        }
        if (unitCost < 0) {
            setMessage("Unit cost cannot be negative.");
            return;
        }

        setSubmitting(true);
        setMessage("");
        try {
            const token = await auth.currentUser?.getIdToken();
            const selectedSupplier = suppliers.find((s) => s.id === form.supplier_id);
            const computedSupplierName =
                form.supplier_name ||
                (form.supplier_id === "general" ? "General Supplier" : selectedSupplier?.name || "");
            const payload = {
                product_id: form.product_id,
                quantity,
                unit_cost: unitCost,
                supplier_id: form.supplier_id || null,
                supplier_name: computedSupplierName,
                reason: form.reason,
                notes: form.notes,
                update_cost_price: form.update_cost_price,
            };

            const res = await fetch("/api/products/inbound", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const raw = await res.text();
                setMessage(raw || "Failed to save inbound.");
                return;
            }

            setMessage("Inbound saved.");
            await loadCostLayers(form.product_id);
            setForm({
                product_id: "",
                quantity: "",
                unit_cost: "",
                supplier_id: "",
                supplier_name: "",
                reason: "purchase",
                notes: "",
                update_cost_price: false,
            });
            await loadData();
        } catch {
            setMessage("Failed to save inbound.");
        } finally {
            setSubmitting(false);
        }
    };

    const loadCostLayers = async (productId: string) => {
        setLayersLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/products/${productId}/cost-layers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                setLayers([]);
                return;
            }
            const payload = await res.json();
            setLayers(Array.isArray(payload?.layers) ? payload.layers : []);
        } catch {
            setLayers([]);
        } finally {
            setLayersLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#102642]">Products</h1>
                <p className="text-sm text-gray-500">Detailed inbound receiving with supplier and costing</p>
            </div>

            <ProductSubTabs />

            <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-4">
                <h2 className="text-lg font-semibold text-[#102642] flex items-center gap-2">
                    <ArrowDownCircle size={18} /> New Inbound Entry
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select className="form-input" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                        <option value="">Select Product</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                    </select>

                    <select className="form-input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                        <option value="purchase">Purchase</option>
                        <option value="return">Supplier Return Back</option>
                        <option value="found">Found Stock</option>
                        <option value="opening">Opening Balance</option>
                    </select>

                    <input
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        className="form-input"
                        placeholder="Quantity"
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    />

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input"
                        placeholder="Unit cost (IQD)"
                        value={form.unit_cost}
                        onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                    />

                    <select
                        className="form-input"
                        value={form.supplier_id}
                        onChange={(e) => setForm({ ...form, supplier_id: e.target.value, supplier_name: "" })}
                    >
                        <option value="">No Supplier (Optional)</option>
                        <option value="general">General Supplier</option>
                        {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>

                    <input
                        className="form-input"
                        placeholder="Supplier name override (optional)"
                        value={form.supplier_name}
                        onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                    />
                </div>

                {selectedProduct && (
                    <div className="rounded-lg border border-gray-200 p-3 bg-gray-50 text-sm text-gray-700">
                        Current qty: <b>{selectedProduct.current_qty}</b> | Current cost: <b>{Number(selectedProduct.cost_price).toLocaleString("en-US")}</b> IQD | This inbound total: <b>{Number.isFinite(totalCost) ? totalCost.toLocaleString("en-US") : "0"}</b> IQD
                    </div>
                )}

                {costIsLower && (
                    <label className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <input
                            type="checkbox"
                            checked={form.update_cost_price}
                            onChange={(e) => setForm({ ...form, update_cost_price: e.target.checked })}
                        />
                        Update product cost price to this lower cost
                    </label>
                )}

                <textarea
                    className="form-input min-h-24"
                    placeholder="Notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />

                <div className="flex items-center gap-2">
                    <button
                        onClick={submitInbound}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg bg-[#54C7E5] text-white font-medium disabled:opacity-50"
                    >
                        {submitting ? "Saving..." : "Save Inbound"}
                    </button>
                    <Link href="/products/suppliers" className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
                        Add Supplier
                    </Link>
                </div>

                {message && <p className="text-sm text-[#102642]">{message}</p>}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-[#102642]">Cost Layers (On-Hand by Purchase Price)</h2>
                </div>
                {!form.product_id ? (
                    <div className="p-6 text-sm text-gray-500">Select a product to view cost layers.</div>
                ) : layersLoading ? (
                    <div className="p-6 text-sm text-gray-500">Loading layers...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Unit Cost</th>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">On Hand Qty</th>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Received Qty</th>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Sold Qty</th>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Layer Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {layers.map((layer) => (
                                    <tr key={layer.id} className="border-t border-gray-100">
                                        <td className="px-4 py-3 text-sm font-semibold text-[#102642]">{Number(layer.unit_cost || 0).toLocaleString("en-US")}</td>
                                        <td className="px-4 py-3 text-sm">{Number(layer.qty_on_hand || 0).toLocaleString("en-US")}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{Number(layer.qty_received_total || 0).toLocaleString("en-US")}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{Number(layer.qty_sold || 0).toLocaleString("en-US")}</td>
                                        <td className="px-4 py-3 text-sm font-semibold">{Number(layer.stock_value || 0).toLocaleString("en-US")}</td>
                                    </tr>
                                ))}
                                {layers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">No layer data yet for this product.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-[#102642]">Inbound History</h2>
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
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Qty</th>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Unit Cost</th>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Total Cost</th>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Supplier</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.id} className="border-t border-gray-100">
                                        <td className="px-4 py-3 text-sm text-gray-600">{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-[#102642]">{row.product_name}</td>
                                        <td className="px-4 py-3 text-sm">{Number(row.quantity || 0).toLocaleString("en-US")}</td>
                                        <td className="px-4 py-3 text-sm">{Number(row.unit_cost || 0).toLocaleString("en-US")}</td>
                                        <td className="px-4 py-3 text-sm font-semibold">{Number(row.total_cost || 0).toLocaleString("en-US")}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{row.supplier_name || "-"}</td>
                                    </tr>
                                ))}
                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">No inbound entries yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
