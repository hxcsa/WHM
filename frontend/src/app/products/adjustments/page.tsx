"use client";

import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import ProductSubTabs from "@/components/products/ProductSubTabs";
import { ClipboardCheck } from "lucide-react";

interface Product {
    id: string;
    name: string;
    sku: string;
    current_qty: string;
    unit: string;
}

interface Adjustment {
    id: string;
    product_name: string;
    quantity_change: string;
    reason: string;
    notes?: string;
    created_at?: string;
}

export default function ProductAdjustmentsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        product_id: "",
        physical_qty: "",
        reason: "broken",
        notes: "",
    });

    const selectedProduct = useMemo(
        () => products.find((p) => p.id === form.product_id) || null,
        [products, form.product_id]
    );

    const systemQty = Number(selectedProduct?.current_qty || 0);
    const physicalQty = Number(form.physical_qty || 0);
    const delta = Number.isFinite(physicalQty) ? physicalQty - systemQty : 0;

    useEffect(() => {
        void loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const [productsRes, adjRes] = await Promise.all([
                fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("/api/products/adjustments?limit=100", { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const p = productsRes.ok ? await productsRes.json() : [];
            const a = adjRes.ok ? await adjRes.json() : [];

            setProducts(Array.isArray(p) ? p : []);
            setAdjustments(Array.isArray(a) ? a : []);
        } catch {
            setProducts([]);
            setAdjustments([]);
        } finally {
            setLoading(false);
        }
    };

    const submitAdjustment = async () => {
        if (!selectedProduct) {
            setMessage("Choose a product.");
            return;
        }
        if (!form.physical_qty) {
            setMessage("Enter physical quantity from your count.");
            return;
        }
        if (delta === 0) {
            setMessage("No difference detected. Nothing to update.");
            return;
        }

        setSubmitting(true);
        setMessage("");
        try {
            const token = await auth.currentUser?.getIdToken();
            const params = new URLSearchParams({
                quantity: String(delta),
                reason: `physical_count_${form.reason}`,
                notes: form.notes || `Physical check update. System: ${systemQty}, Physical: ${physicalQty}`,
            });

            const res = await fetch(`/api/products/${selectedProduct.id}/adjust-stock?${params.toString()}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const raw = await res.text();
                setMessage(raw || "Failed to save adjustment.");
                return;
            }

            setMessage("Adjustment saved.");
            setForm({ product_id: "", physical_qty: "", reason: "broken", notes: "" });
            await loadData();
        } catch {
            setMessage("Failed to save adjustment.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#102642]">Products</h1>
                <p className="text-sm text-gray-500">Physical stock check and correction</p>
            </div>

            <ProductSubTabs />

            <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-4">
                <h2 className="text-lg font-semibold text-[#102642] flex items-center gap-2">
                    <ClipboardCheck size={18} /> Physical Count Adjustment
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                    <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={form.physical_qty}
                        onChange={(e) => setForm({ ...form, physical_qty: e.target.value })}
                        placeholder="Physical quantity found"
                        className="form-input"
                    />

                    <select
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                        className="form-input"
                    >
                        <option value="broken">Broken / Damaged</option>
                        <option value="missing">Missing</option>
                        <option value="found">Found Extra</option>
                        <option value="expired">Expired</option>
                        <option value="count_fix">Count Correction</option>
                    </select>

                    <button
                        onClick={submitAdjustment}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg bg-[#102642] text-white font-medium disabled:opacity-50"
                    >
                        {submitting ? "Saving..." : "Apply Adjustment"}
                    </button>
                </div>

                <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Notes (optional)"
                    className="form-input min-h-20"
                />

                {selectedProduct && (
                    <div className="text-sm rounded-lg border border-gray-200 p-3 bg-gray-50 text-gray-700">
                        System: <b>{systemQty}</b> {selectedProduct.unit} | Physical: <b>{form.physical_qty || 0}</b> {selectedProduct.unit} | Delta: <b>{delta > 0 ? `+${delta}` : delta}</b>
                    </div>
                )}

                {message && <p className="text-sm text-[#102642]">{message}</p>}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-[#102642]">Recent Adjustments</h2>
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
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Delta</th>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Reason</th>
                                    <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {adjustments.map((row) => (
                                    <tr key={row.id} className="border-t border-gray-100">
                                        <td className="px-4 py-3 text-sm text-gray-600">{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-[#102642]">{row.product_name}</td>
                                        <td className="px-4 py-3 text-sm font-semibold">{Number(row.quantity_change || 0) > 0 ? `+${row.quantity_change}` : row.quantity_change}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{row.reason}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{row.notes || "-"}</td>
                                    </tr>
                                ))}
                                {adjustments.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">No adjustments yet.</td>
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
