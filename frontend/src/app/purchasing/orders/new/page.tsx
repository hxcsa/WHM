"use client";

import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    Plus, Trash2, Search, Save, Send, ArrowLeft,
    Calendar, Clock, Truck, FileText, X, Building2, Hash
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface POItem {
    item_id: string;
    item_name: string;
    sku: string;
    description: string;
    quantity: number;
    unit_cost: number;
    total: number;
}

const EMPTY_ITEM: POItem = {
    item_id: "", item_name: "", sku: "", description: "",
    quantity: 1, unit_cost: 0, total: 0
};

export default function NewPurchaseOrderPage() {
    const router = useRouter();
    const { t } = useLanguage();

    // Auth
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [role, setRole] = useState("viewer");

    // Data sources
    const [items, setItems] = useState<any[]>([]);
    const [itemSearches, setItemSearches] = useState<string[]>([""]);
    const [showItemDrop, setShowItemDrop] = useState<number | null>(null);

    // Form
    const [form, setForm] = useState({
        supplier_name: "",
        supplier_invoice_number: "", // Supply Invoice Number
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: "",
        notes: "",
        currency: "IQD",
    });
    const [lines, setLines] = useState<POItem[]>([{ ...EMPTY_ITEM }]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Computed
    const total = lines.reduce((s, l) => s + (l.quantity * l.unit_cost), 0);

    // Auth listener
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            setAuthUser(user);
            setAuthReady(true);
            if (user) {
                try {
                    const t = await user.getIdTokenResult();
                    if (t.claims.role) setRole(t.claims.role as string);
                } catch { }
            }
        });
        return () => unsub();
    }, []);

    // Load items
    useEffect(() => {
        if (!authReady || !authUser) return;
        fetchWithAuth("/api/warehouse/products")
            .then(res => res.json())
            .then(data => setItems(Array.isArray(data) ? data : data.items || []))
            .catch(e => console.error("Failed to load items:", e));
    }, [authReady, authUser]);

    // Line item helpers
    const updateLine = (idx: number, field: string, value: any) => {
        setLines(prev => {
            const updated = [...prev];
            (updated[idx] as any)[field] = value;
            updated[idx].total = updated[idx].quantity * updated[idx].unit_cost;
            return updated;
        });
    };

    const addLine = () => {
        setLines(prev => [...prev, { ...EMPTY_ITEM }]);
        setItemSearches(prev => [...prev, ""]);
    };

    const removeLine = (idx: number) => {
        if (lines.length <= 1) return;
        setLines(prev => prev.filter((_, i) => i !== idx));
        setItemSearches(prev => prev.filter((_, i) => i !== idx));
    };

    const selectItem = (idx: number, item: any) => {
        updateLine(idx, "item_id", item.id);
        updateLine(idx, "item_name", item.name);
        updateLine(idx, "sku", item.sku);
        updateLine(idx, "unit_cost", Number(item.cost_price || 0)); // Default to current cost
        updateLine(idx, "description", item.name);
        setItemSearches(prev => { const u = [...prev]; u[idx] = item.name; return u; });
        setShowItemDrop(null);
    };

    // Save
    const handleSave = async (status: "DRAFT" | "APPROVED") => {
        setError(null);
        if (!form.supplier_name) { setError("Supplier Name is required"); return; }
        if (lines.length === 0 || lines.every(l => !l.item_id)) {
            setError("At least one item is required"); return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                status,
                lines: lines.map(l => ({
                    item_id: l.item_id,
                    item_name: l.item_name,
                    quantity: l.quantity,
                    unit_cost: l.unit_cost,
                    total: l.quantity * l.unit_cost
                })),
                total
            };

            const res = await fetchWithAuth("/api/purchase-orders", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || "Failed to create purchase order");
            }

            router.push("/purchasing/orders");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    // Filter helpers
    const filteredItems = (idx: number) => {
        const s = (itemSearches[idx] || "").toLowerCase();
        if (!s) return items;
        return items.filter(p =>
            (p.name || "").toLowerCase().includes(s) || (p.sku || "").includes(s)
        );
    };

    const fmtCurrency = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    if (!authReady) return <div className="p-8 text-center text-slate-400">Loading...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/purchasing/orders")} className="p-3 bg-white/50 hover:bg-white rounded-xl transition-all shadow-sm border border-slate-200/60">
                        <ArrowLeft size={20} className="text-slate-600 rotate-180 rtl:rotate-0" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 font-heading">New Supply Invoice</h1>
                        <p className="text-sm text-slate-500 font-medium">Restock inventory and record supplier bills / فاتورة شراء جديدة</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="glass-panel border-s-4 border-s-rose-500 p-4 text-rose-700 text-sm font-bold flex items-center gap-3 shadow-lg shadow-rose-500/10">
                    <X size={18} /> {error}
                </div>
            )}

            {/* A) Supplier & Invoice Details */}
            <div className="glass-panel p-8 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 end-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <h2 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={16} /> Supplier & Invoice Details / تفاصيل المورد والفاتورة
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Supplier Name */}
                    <div className="space-y-2">
                        <label className="form-label">Supplier Name / اسم المورد</label>
                        <input
                            required
                            className="form-input"
                            placeholder="e.g. Al-Noor Trading Co."
                            value={form.supplier_name}
                            onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                        />
                    </div>
                    {/* Supplier Invoice # */}
                    <div className="space-y-2">
                        <label className="form-label flex items-center gap-2">
                            <Hash size={14} /> Supplier Invoice Number / رقم فاتورة المورد
                        </label>
                        <input
                            className="form-input font-mono"
                            placeholder="INV-2024-001"
                            value={form.supplier_invoice_number}
                            onChange={(e) => setForm({ ...form, supplier_invoice_number: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Invoice Date */}
                    <div className="space-y-2">
                        <label className="form-label">Invoice Date / تاريخ الفاتورة</label>
                        <input
                            type="date"
                            className="form-input"
                            value={form.invoice_date}
                            onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                        />
                    </div>
                    {/* Due Date */}
                    <div className="space-y-2">
                        <label className="form-label">Due Date / تاريخ الاستحقاق</label>
                        <input
                            type="date"
                            className="form-input"
                            value={form.due_date}
                            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                        />
                    </div>
                    {/* Currency */}
                    <div className="space-y-2">
                        <label className="form-label">Currency / العملة</label>
                        <select
                            className="form-input"
                            value={form.currency}
                            onChange={(e) => setForm({ ...form, currency: e.target.value })}
                        >
                            <option value="IQD">IQD - Iraqi Dinar</option>
                            <option value="USD">USD - US Dollar</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* B) Items */}
            <div className="glass-panel p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-black text-indigo-600 uppercase tracking-widest">Supply Items / المواد</h2>
                    <button onClick={addLine} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
                        <Plus size={14} /> Add Item
                    </button>
                </div>

                {/* Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 border-b border-slate-100 pb-2">
                    <div className="col-span-5">Item / المادة</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-end">Unit Cost</div>
                    <div className="col-span-2 text-end">Total</div>
                    <div className="col-span-1"></div>
                </div>

                <div className="space-y-3">
                    {lines.map((line, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 items-start bg-slate-50/50 hover:bg-slate-50/80 rounded-2xl p-4 border border-slate-100 transition-colors">
                            {/* Item Search */}
                            <div className="col-span-12 md:col-span-5 relative">
                                <input
                                    type="text"
                                    value={itemSearches[idx] || ""}
                                    onChange={e => {
                                        setItemSearches(p => { const u = [...p]; u[idx] = e.target.value; return u; });
                                        setShowItemDrop(idx);
                                    }}
                                    onFocus={() => setShowItemDrop(idx)}
                                    placeholder="Search item..."
                                    className="form-input text-sm"
                                />
                                {showItemDrop === idx && filteredItems(idx).length > 0 && (
                                    <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {filteredItems(idx).slice(0, 6).map(item => (
                                            <div key={item.id} onClick={() => selectItem(idx, item)}
                                                className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 group">
                                                <div className="font-bold text-sm text-slate-800 group-hover:text-indigo-600">{item.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Quantity */}
                            <div className="col-span-4 md:col-span-2">
                                <input type="number" min="1" value={line.quantity}
                                    onChange={e => updateLine(idx, "quantity", Number(e.target.value))}
                                    className="form-input text-center font-bold" />
                            </div>
                            {/* Cost */}
                            <div className="col-span-4 md:col-span-2">
                                <input type="number" min="0" value={line.unit_cost}
                                    onChange={e => updateLine(idx, "unit_cost", Number(e.target.value))}
                                    className="form-input text-end font-mono text-emerald-600" />
                            </div>
                            {/* Total */}
                            <div className="col-span-6 md:col-span-2 flex items-center justify-end py-3">
                                <span className="text-sm font-black text-slate-700 font-mono">
                                    {fmtCurrency(line.quantity * line.unit_cost)}
                                </span>
                            </div>
                            {/* Remove */}
                            <div className="col-span-6 md:col-span-1 flex items-center justify-end py-2">
                                <button onClick={() => removeLine(idx)} disabled={lines.length <= 1}
                                    className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-30">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="glass-panel p-8 space-y-4 bg-gradient-to-br from-white to-slate-50">
                <div className="flex justify-between text-xl">
                    <span className="text-slate-800 font-black tracking-tight">Total Payable / المجموع المستحق</span>
                    <span className="font-black text-emerald-600 font-mono">{fmtCurrency(total)} <span className="text-xs text-emerald-400">{form.currency}</span></span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4">
                <button onClick={() => handleSave("DRAFT")} disabled={saving}
                    className="flex items-center gap-2 px-8 py-4 bg-slate-800 text-white rounded-xl text-sm font-black hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-900/10">
                    <Save size={18} /> {saving ? "Saving..." : "Save Draft"}
                </button>
                <button onClick={() => handleSave("APPROVED")} disabled={saving}
                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-black hover:shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-95 disabled:opacity-50">
                    <Save size={18} /> {saving ? "Saving..." : "Confirm & Save"}
                </button>
            </div>
        </div>
    );
}
