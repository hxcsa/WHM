"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { ArrowLeft, Save, Plus, Trash2, Package, Truck, User, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function StockInPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    const [items, setItems] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        supplier_account_id: "",
        lines: [
            { item_id: "", warehouse_id: "", quantity: "1", unit_cost: "0" }
        ]
    });

    useEffect(() => {
        const init = async () => {
            try {
                // Parallel fetch
                const [itemsRes, suppliersRes, accountsRes, whRes] = await Promise.all([
                    fetchWithAuth("/api/inventory/items"),
                    fetchWithAuth("/api/accounting/suppliers"), // If this returns suppliers
                    fetchWithAuth("/api/accounting/accounts?type=LIABILITY"), // Fallback accounts
                    fetchWithAuth("/api/warehouses")
                ]);

                if (itemsRes.ok) {
                    const data = await itemsRes.json();
                    setItems(data.items || (Array.isArray(data) ? data : []));
                }

                let loadedSuppliers: any[] = [];
                if (suppliersRes.ok) {
                    const data = await suppliersRes.json();
                    loadedSuppliers = data.suppliers || [];
                }

                // If no "Suppliers" defined, maybe use generic Liability accounts (Payables)
                if (accountsRes.ok) {
                    const data = await accountsRes.json();
                    const accounts = data.accounts || (Array.isArray(data) ? data : []);
                    // Filter for Payables (usually linked to suppliers)
                    // We'll append them to the selection list if needed, or just use them if suppliers are empty
                    // For now, let's map accounts to a usable format if they aren't in suppliers list
                    const payableAccounts = accounts.filter((a: any) => a.code.startsWith("2"));

                    // Merge: If we have suppliers, use them. They should have 'account_id' or similar.
                    // If not, use the raw accounts.
                    if (loadedSuppliers.length === 0) {
                        setSuppliers(payableAccounts.map((a: any) => ({
                            id: a.id, // This is the account ID
                            name: a.name,
                            is_account: true // Flag to know this is a direct account
                        })));
                    } else {
                        // Map suppliers to usable format: label -> name, value -> linked account id
                        // We assume supplier object has 'payable_account_id' or 'account_id'
                        // If not, we might be stuck. Let's assume 'account_id' is on the supplier doc.
                        setSuppliers(loadedSuppliers);
                    }
                }

                if (whRes.ok) {
                    const data = await whRes.json();
                    const list = data.warehouses || (Array.isArray(data) ? data : []);
                    setWarehouses(list);
                    if (list.length > 0) {
                        setFormData(prev => ({
                            ...prev,
                            lines: prev.lines.map(l => ({ ...l, warehouse_id: list[0].id }))
                        }));
                    }
                }

            } catch (e) {
                console.error("Init Error", e);
            } finally {
                setInitializing(false);
            }
        };

        const unsub = onAuthStateChanged(auth, (u) => {
            if (u) init();
        });
        return () => unsub();
    }, []);

    const addLine = () => {
        const defaultWh = warehouses.length > 0 ? warehouses[0].id : "";
        setFormData(prev => ({
            ...prev,
            lines: [...prev.lines, { item_id: "", warehouse_id: defaultWh, quantity: "1", unit_cost: "0" }]
        }));
    };

    const removeLine = (index: number) => {
        if (formData.lines.length <= 1) return;
        setFormData(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
    };

    const updateLine = (index: number, field: string, value: string) => {
        const newLines = [...formData.lines];
        (newLines[index] as any)[field] = value;
        setFormData({ ...formData, lines: newLines });
    };

    const handleItemChange = (index: number, itemId: string) => {
        const item = items.find(i => i.id === itemId);
        // Pre-fill cost if available (e.g. current WAC)
        const cost = item ? (item.current_wac || "0") : "0";
        const newLines = [...formData.lines];
        newLines[index].item_id = itemId;
        newLines[index].unit_cost = Number(cost).toFixed(2);
        setFormData({ ...formData, lines: newLines });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // We need to pass 'number' (GRN Number) - generated here or backend?
            // Backend schema expects 'number'.
            const payload = {
                number: `GRN-${Date.now().toString().slice(-6)}`,
                supplier_account_id: formData.supplier_account_id,
                lines: formData.lines.map(l => ({
                    ...l,
                    quantity: Number(l.quantity),
                    unit_cost: Number(l.unit_cost)
                }))
            };

            const res = await fetchWithAuth("/api/inventory/grn", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                // Success
                router.push("/lite/operations?success=in");
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail || "Failed to process stock in"}`);
            }
        } catch (err) {
            console.error(err);
            alert("Connection Error");
        } finally {
            setLoading(false);
        }
    };

    if (initializing) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <Link href="/lite/operations" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Stock In (Purchase)</h1>
                    <p className="text-slate-500 text-sm">Add inventory and record purchase.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Supplier Selection */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                        <User size={16} className="text-indigo-500" />
                        Supplier
                    </label>
                    <select
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        value={formData.supplier_account_id}
                        onChange={e => setFormData({ ...formData, supplier_account_id: e.target.value })}
                    >
                        <option value="">Select Supplier...</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.is_account ? s.id : (s.account_id || s.id)}>
                                {s.name} {s.code ? `(${s.code})` : ''}
                            </option>
                        ))}
                    </select>
                    {suppliers.length === 0 && (
                        <p className="text-xs text-amber-600 mt-2">No suppliers found. Please add a supplier first or ensure 'Liabilities' accounts exist.</p>
                    )}
                </div>

                {/* Items List */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="font-bold text-slate-700">Items</h3>
                        <button
                            type="button"
                            onClick={addLine}
                            className="text-sm font-bold text-indigo-600 flex items-center gap-1 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <Plus size={16} /> Add Line
                        </button>
                    </div>

                    {formData.lines.map((line, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4 relative group">
                            {formData.lines.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeLine(idx)}
                                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">ITEM</label>
                                    <select
                                        required
                                        className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
                                        value={line.item_id}
                                        onChange={(e) => handleItemChange(idx, e.target.value)}
                                    >
                                        <option value="">Select Item...</option>
                                        {items.map(it => (
                                            <option key={it.id} value={it.id}>{it.name} ({it.sku})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">WAREHOUSE</label>
                                    <select
                                        required
                                        className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
                                        value={line.warehouse_id}
                                        onChange={(e) => updateLine(idx, 'warehouse_id', e.target.value)}
                                    >
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">QUANTITY</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-slate-700 text-center focus:ring-2 focus:ring-indigo-500/20"
                                        value={line.quantity}
                                        onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">UNIT COST (IQD)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        className="w-full p-3 bg-indigo-50 rounded-xl border-none outline-none font-bold text-indigo-700 text-center focus:ring-2 focus:ring-indigo-500/20"
                                        value={line.unit_cost}
                                        onChange={(e) => updateLine(idx, 'unit_cost', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-4 flex gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-indigo-600 text-white rounded-xl py-4 font-bold text-lg shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-600/40 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Truck size={20} />
                                Confirm Stock In
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
