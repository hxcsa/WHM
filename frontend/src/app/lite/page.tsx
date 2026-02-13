"use client";

import { useEffect, useState, useCallback, memo } from "react";
import { fetchWithAuth } from "@/lib/api";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
    Wallet, Package, TrendingUp, Plus, ArrowUpRight, ArrowDownRight, Loader2
} from "lucide-react";
import Link from "next/link";
// We will reuse the Sale/Purchase forms for now, or create simplified ones later if needed.
// For now, let's just link to the operational pages or use the modals if they fit the "Lite" vibe.
// To keep it simple, I'll link to the specific pages I'm about to create.

const KpiCard = memo(({ title, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
        <div className={`p-4 rounded-xl ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h4 className="text-2xl font-bold text-slate-800">{value}</h4>
        </div>
    </div>
));
KpiCard.displayName = "KpiCard";

const QuickAction = memo(({ label, icon, href, color }: any) => (
    <Link href={href} className={`
        flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all
        hover:shadow-md active:scale-95 text-center group
        ${color}
    `}>
        <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <span className="font-bold text-sm">{label}</span>
    </Link>
));
QuickAction.displayName = "QuickAction";

export default function LiteDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalStockValue: 0,
        totalItems: 0,
        todaySales: 0
    });
    const [recentItems, setRecentItems] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        try {
            // Parallel fetch for speed
            const [itemsRes, statsRes] = await Promise.all([
                fetchWithAuth("/api/inventory/items?limit=10"),
                fetchWithAuth("/api/reports/dashboard") // Reusing existing dashboard stats
            ]);

            if (itemsRes.ok) {
                const itemsData = await itemsRes.json();
                const items = itemsData.items || (Array.isArray(itemsData) ? itemsData : []);
                setRecentItems(items.slice(0, 5));

                // Calculate stock value on client for simplicty (or use a report endpoint if available)
                // Assuming items have total_value
                const totalVal = items.reduce((acc: number, item: any) => acc + (Number(item.total_value) || 0), 0);
                setStats(prev => ({ ...prev, totalStockValue: totalVal, totalItems: items.length }));
            }

            if (statsRes.ok) {
                const dStats = await statsRes.json();
                setStats(prev => ({
                    ...prev,
                    todaySales: Number(dStats.todaySales || 0)
                }));
            }

        } catch (error) {
            console.error("Lite Dashboard Error:", error);
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

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Welcome Section */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Overview</h1>
                <p className="text-slate-500">Welcome back to your tailored workspace.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard
                    title="Total Stock Value"
                    value={`${stats.totalStockValue.toLocaleString()} IQD`}
                    icon={<Package size={24} className="text-indigo-600" />}
                    color="bg-indigo-50"
                />
                <KpiCard
                    title="Items in Stock"
                    value={stats.totalItems}
                    icon={<Wallet size={24} className="text-emerald-600" />}
                    color="bg-emerald-50"
                />
                <KpiCard
                    title="Today's Sales"
                    value={`${stats.todaySales.toLocaleString()} IQD`}
                    icon={<TrendingUp size={24} className="text-blue-600" />}
                    color="bg-blue-50"
                />
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickAction
                        label="Add Item"
                        href="/lite/inventory/new"
                        icon={<Plus size={20} className="text-indigo-600" />}
                        color="bg-indigo-50 border-indigo-100 hover:border-indigo-300 text-indigo-700"
                    />
                    <QuickAction
                        label="Restock (Buy)"
                        href="/lite/operations/in"
                        icon={<ArrowDownRight size={20} className="text-emerald-600" />}
                        color="bg-emerald-50 border-emerald-100 hover:border-emerald-300 text-emerald-700"
                    />
                    <QuickAction
                        label="Sell Item"
                        href="/lite/operations/out"
                        icon={<ArrowUpRight size={20} className="text-blue-600" />}
                        color="bg-blue-50 border-blue-100 hover:border-blue-300 text-blue-700"
                    />
                    <QuickAction
                        label="Record Expense"
                        href="/lite/accounting/expense"
                        icon={<Wallet size={20} className="text-amber-600" />}
                        color="bg-amber-50 border-amber-100 hover:border-amber-300 text-amber-700"
                    />
                </div>
            </div>

            {/* Recent Items Preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Recent Items</h3>
                    <Link href="/lite/inventory" className="text-xs font-bold text-indigo-600 hover:underline">VIEW ALL</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="p-4 font-semibold">Item</th>
                                <th className="p-4 font-semibold">SKU</th>
                                <th className="p-4 font-semibold">Qty</th>
                                <th className="p-4 font-semibold">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recentItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800">{item.name}</td>
                                    <td className="p-4 text-slate-500 font-mono text-xs">{item.sku}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${Number(item.current_qty) < 10 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                                            {Number(item.current_qty)} {item.unit}
                                        </span>
                                    </td>
                                    <td className="p-4 font-medium text-slate-600">
                                        {Number(item.total_value).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
