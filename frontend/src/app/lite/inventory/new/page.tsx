"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { ArrowLeft, Save, Package, Hash, Tag, DollarSign, Loader2 } from "lucide-react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function NewItemPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    // Auto-detected accounts
    const [accounts, setAccounts] = useState<{
        inventory: string;
        sales: string;
        cogs: string;
    }>({ inventory: "", sales: "", cogs: "" });

    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        unit: "PCS",
        category: "General",
        selling_price: "0",
        cost_price: "0", // Note: This is just for reference or initial WAC if we were doing opening stock
        description: ""
    });

    useEffect(() => {
        const init = async () => {
            try {
                // Fetch accounts to auto-detect defaults
                // We fetch all to be safe, or we could fetch by type
                const res = await fetchWithAuth("/api/accounting/accounts");
                if (res.ok) {
                    const allAccounts = await res.json();

                    // Simple heuristic to find default accounts
                    // 1. Try to find exact standard codes
                    // 2. Fallback to first account of matching type

                    const invParams = ["121", "Inventory", "Stock", "المخزون"];
                    const saleParams = ["41", "411", "Sales", "Revenue", "المبيعات"];
                    const cogsParams = ["51", "511", "Cost of Goods", "COGS", "كلفة"];

                    const findAccount = (params: string[], type: string) => {
                        // Priority 1: Code match
                        let match = allAccounts.find((a: any) => params.includes(a.code));
                        // Priority 2: Name match (partial)
                        if (!match) match = allAccounts.find((a: any) => params.some(p => a.name.toLowerCase().includes(p.toLowerCase())));
                        // Priority 3: First of type
                        if (!match) match = allAccounts.find((a: any) => a.type === type && !a.is_group);

                        return match?.id || "";
                    };

                    setAccounts({
                        inventory: findAccount(invParams, "ASSET"),
                        sales: findAccount(saleParams, "REVENUE"),
                        cogs: findAccount(cogsParams, "EXPENSE")
                    });
                }
            } catch (e) {
                console.error("Failed to load accounts", e);
            } finally {
                setInitializing(false);
            }
        };

        const unsub = onAuthStateChanged(auth, (u) => {
            if (u) init();
        });
        return () => unsub();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Validate we have accounts
        if (!accounts.inventory || !accounts.sales || !accounts.cogs) {
            alert("System Error: Could not detect default accounting configuration. Please contact support or use the full mode.");
            setLoading(false);
            return;
        }

        try {
            const payload = {
                ...formData,
                inventory_account_id: accounts.inventory,
                revenue_account_id: accounts.sales,
                cogs_account_id: accounts.cogs,
                // Ensure selling_price is string formatted
                selling_price: String(formData.selling_price)
            };

            const res = await fetchWithAuth("/api/inventory/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                router.push("/lite/inventory");
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail || "Failed to create item"}`);
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
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                    <p className="text-slate-500 font-medium">Configuring accounts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <Link href="/lite/inventory" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Add New Item</h1>
                    <p className="text-slate-500 text-sm">Create a new product or material.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">

                    {/* Basic Info Section */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Package size={16} className="text-indigo-500" />
                                Item Name
                            </label>
                            <input
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-lg placeholder:font-normal"
                                placeholder="e.g. iPhone 15 Pro Max"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Hash size={14} /> SKU / Code
                                </label>
                                <input
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none font-mono text-sm"
                                    placeholder="ITEM-001"
                                    value={formData.sku}
                                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Tag size={14} /> Unit
                                </label>
                                <select
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none font-medium"
                                    value={formData.unit}
                                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                >
                                    <option value="PCS">Pieces (PCS)</option>
                                    <option value="KG">Kilograms (KG)</option>
                                    <option value="LTR">Liters (LTR)</option>
                                    <option value="BOX">Box</option>
                                    <option value="CARTON">Carton</option>
                                    <option value="M">Meter (M)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Pricing Section */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                                <DollarSign size={16} className="text-emerald-500" />
                                Selling Price (IQD)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none font-bold text-2xl tabular-nums"
                                    placeholder="0.00"
                                    value={formData.selling_price}
                                    onChange={e => setFormData({ ...formData, selling_price: e.target.value })}
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                    IQD
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">The price you sell this item to customers.</p>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    <div className="flex gap-4 pt-2">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-indigo-600 text-white rounded-xl py-3 font-bold text-lg shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-600/40 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Create Item
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
