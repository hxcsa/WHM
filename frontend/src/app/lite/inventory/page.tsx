"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/lib/api";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
    Search, Plus, Filter, Loader2, PackageOpen
} from "lucide-react";
import Link from "next/link";

export default function LiteInventory() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [search, setSearch] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/inventory/items?limit=100");
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || (Array.isArray(data) ? data : []));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            if (u) fetchData();
        });
        return () => unsub();
    }, [fetchData]);

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
                    <p className="text-slate-500 text-sm">Manage your stock and prices.</p>
                </div>
                <Link
                    href="/lite/inventory/new"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={18} />
                    <span>Add Item</span>
                </Link>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search items by name or SKU..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-100">
                    <Filter size={18} />
                    <span className="hidden sm:inline">Filter</span>
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                    </div>
                ) : filteredItems.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 font-semibold">SKU</th>
                                    <th className="p-4 font-semibold">Item Name</th>
                                    <th className="p-4 font-semibold">Stock Qty</th>
                                    <th className="p-4 font-semibold">Avg Cost (Buy)</th>
                                    <th className="p-4 font-semibold">Selling Price</th>
                                    <th className="p-4 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 font-mono text-xs text-slate-400">{item.sku}</td>
                                        <td className="p-4 font-bold text-slate-800">{item.name}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700">{Number(item.current_qty)}</span>
                                                <span className="text-[10px] text-slate-400">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600 font-medium">
                                            {Number(item.current_wac || 0).toLocaleString()} IQD
                                        </td>
                                        <td className="p-4 text-emerald-600 font-bold">
                                            {Number(item.selling_price || 0).toLocaleString()} IQD
                                        </td>
                                        <td className="p-4">
                                            {Number(item.current_qty) < 10 ? (
                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                                                    Low Stock
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                                                    In Stock
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="bg-slate-50 p-4 rounded-full mb-4">
                            <PackageOpen size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">No items found</h3>
                        <p className="text-slate-500 mb-6">Your inventory is empty or no items match your search.</p>
                        <Link
                            href="/lite/inventory/new"
                            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                        >
                            Add First Item
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
