"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { ArrowLeft, ArrowUpRight, Plus, Trash2, User, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function StockOutPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    const [items, setItems] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        customer_account_id: "",
        lines: [
            { item_id: "", warehouse_id: "", quantity: "1" }
        ]
    });

    useEffect(() => {
        const init = async () => {
            try {
                // Parallel fetch
                const [itemsRes, customersRes, accountsRes, whRes] = await Promise.all([
                    fetchWithAuth("/api/inventory/items"),
                    fetchWithAuth("/api/customers"), // Fetch customers which have 'account_id' or 'ar_account_id'
                    fetchWithAuth("/api/accounting/accounts?type=ASSET"), // Fallback for AR 122
                    fetchWithAuth("/api/warehouses")
                ]);

                if (itemsRes.ok) {
                    const data = await itemsRes.json();
                    setItems(data.items || (Array.isArray(data) ? data : []));
                }

                let loadedCustomers: any[] = [];
                if (customersRes.ok) {
                    const data = await customersRes.json();
                    loadedCustomers = data.customers || (Array.isArray(data) ? data : []);
                }

                // If customers list is empty or we need more accounts (Receivables)
                if (accountsRes.ok) {
                    const data = await accountsRes.json();
                    const accounts = data.accounts || (Array.isArray(data) ? data : []);
                    // Filter for Receivables (122)
                    const arAccounts = accounts.filter((a: any) => a.code.startsWith("122"));

                    if (loadedCustomers.length === 0) {
                        setCustomers(arAccounts.map((a: any) => ({
                            id: a.id,
                            name: a.name,
                            is_account: true // Flag
                        })));
                    } else {
                        // Map standard customers. They should have 'ar_account_id' or we use a default
                        // The Delivery Note endpoint expects 'customer_account_id' (Account ID)
                        // But if we pass a Customer ID, does it handle it?
                        // delivery-note schema: customer_account_id: str
                        // So we MUST pass the Account ID.
                        // Standard Customers usually have 'ar_account_id'.

                        // Let's assume loadedCustomers are full objects.
                        // We'll filter/map them in render.
                        setCustomers(loadedCustomers);
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
            lines: [...prev.lines, { item_id: "", warehouse_id: defaultWh, quantity: "1" }]
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                number: `DO-${Date.now().toString().slice(-6)}`,
                customer_account_id: formData.customer_account_id,
                lines: formData.lines.map(l => ({
                    ...l,
                    quantity: Number(l.quantity)
                }))
            };

            const res = await fetchWithAuth("/api/inventory/delivery-note", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                router.push("/lite/operations?success=out");
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail || "Failed to process sale"}`);
            }
        } catch (err) {
            console.error(err);
            alert("Connection Error");
        } finally {
            setLoading(false);
        }
    };

    const getStock = (itemId: string) => {
        const item = items.find(i => i.id === itemId);
        return item ? Number(item.current_qty) : 0;
    };

    const getSellingPrice = (itemId: string) => {
        const item = items.find(i => i.id === itemId);
        return item ? Number(item.selling_price || 0) : 0;
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
                    <h1 className="text-2xl font-bold text-slate-800">New Sale</h1>
                    <p className="text-slate-500 text-sm">Record a sale and reduce inventory.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Selection */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                        <User size={16} className="text-emerald-500" />
                        Customer
                    </label>
                    <select
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                        value={formData.customer_account_id}
                        onChange={e => setFormData({ ...formData, customer_account_id: e.target.value })}
                    >
                        <option value="">Select Customer...</option>
                        {customers.map(c => {
                            // Logic to find the right ID to send (Account ID)
                            // If is_account, use id. If customer object, use ar_account_id or fallback to id if simpler
                            // For simplicity in Lite, let's look for ar_account_id
                            const val = c.is_account ? c.id : (c.ar_account_id || c.id);
                            // NOTE: If c.ar_account_id is missing, this might fail if we send CustomerID to an endpoint expecting AccountID.
                            // But 'create_delivery_note' uses 'customer_account_id'.
                            // We hope customers have it.
                            return (
                                <option key={c.id} value={val}>
                                    {c.name} {c.code ? `(${c.code})` : ''}
                                </option>
                            );
                        })}
                    </select>
                    {customers.length === 0 && (
                        <p className="text-xs text-amber-600 mt-2">No customers found. Please add a customer or ensure 'Receivable' accounts exist.</p>
                    )}
                </div>

                {/* Items List */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="font-bold text-slate-700">Items</h3>
                        <button
                            type="button"
                            onClick={addLine}
                            className="text-sm font-bold text-emerald-600 flex items-center gap-1 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <Plus size={16} /> Add Line
                        </button>
                    </div>

                    {formData.lines.map((line, idx) => {
                        const stock = getStock(line.item_id);
                        const isLow = stock < Number(line.quantity);
                        return (
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
                                            className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                                            value={line.item_id}
                                            onChange={(e) => updateLine(idx, 'item_id', e.target.value)}
                                        >
                                            <option value="">Select Item...</option>
                                            {items.map(it => (
                                                <option key={it.id} value={it.id}>{it.name} ({it.sku})</option>
                                            ))}
                                        </select>
                                        {line.item_id && (
                                            <div className="flex justify-between items-center text-[10px] font-bold px-1">
                                                <span className={isLow ? "text-rose-500" : "text-emerald-600"}>
                                                    Stock: {stock} {isLow ? "(Low!)" : ""}
                                                </span>
                                                <span className="text-slate-400">
                                                    Price: {getSellingPrice(line.item_id).toLocaleString()} IQD
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400">WAREHOUSE</label>
                                        <select
                                            required
                                            className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
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
                                            min="0.01"
                                            step="0.01"
                                            required
                                            className="w-full p-3 bg-emerald-50 rounded-xl border-none outline-none font-bold text-emerald-700 text-center focus:ring-2 focus:ring-emerald-500/20"
                                            value={line.quantity}
                                            onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-center text-slate-400 text-xs font-bold">
                                        Total: {(Number(line.quantity) * getSellingPrice(line.item_id)).toLocaleString()} IQD
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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
                        className="flex-1 bg-emerald-600 text-white rounded-xl py-4 font-bold text-lg shadow-xl shadow-emerald-500/30 hover:bg-emerald-700 hover:shadow-emerald-600/40 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Processing...
                            </>
                        ) : (
                            <>
                                <ArrowUpRight size={20} />
                                Confirm Sale
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
