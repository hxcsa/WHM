"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Boxes, DollarSign, Users } from "lucide-react";

import { fetchJsonWithAuth } from "@/lib/api";

interface DashboardStats {
    today_sales: number;
    invoice_count: number;
    total_stock_value: number;
    total_items: number;
    low_stock_count: number;
    pending_transfers: number;
    outstanding_balance: number;
    customer_credit_total?: number;
}

interface RecentSale {
    id: string;
    invoice_number?: string;
    customer_name?: string;
    total_amount?: string;
    payment_status?: string;
}

interface DashboardInsights {
    low_stock_items: Array<{ id: string; name: string; shortage: number }>;
}

function toNumber(value: string | number | undefined): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatIQD(value: number): string {
    return `${Math.round(value).toLocaleString()} IQD`;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
    const [insights, setInsights] = useState<DashboardInsights>({ low_stock_items: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [statsData, recentSalesData, insightsData] = await Promise.all([
                    fetchJsonWithAuth<DashboardStats>("/api/dashboard/stats"),
                    fetchJsonWithAuth<RecentSale[]>("/api/dashboard/recent-sales?limit=6"),
                    fetchJsonWithAuth<DashboardInsights>("/api/dashboard/insights"),
                ]);
                setStats(statsData);
                setRecentSales(recentSalesData);
                setInsights(insightsData);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return <div className="surface-card p-8 text-sm font-semibold text-slate-500">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="surface-card rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Overview</p>
                <h1 className="mt-2 text-3xl font-bold text-white">Business Snapshot</h1>
                <p className="mt-2 text-sm text-slate-200">Fast look at sales, stock value, receivables, and urgent inventory risk.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="surface-card p-4 sm:p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Today Sales</p>
                    <p className="mt-2 text-xl sm:text-2xl font-black text-emerald-600">{formatIQD(stats?.today_sales ?? 0)}</p>
                    <p className="mt-1 text-xs text-slate-400">{stats?.invoice_count ?? 0} invoices</p>
                </div>
                <div className="surface-card p-4 sm:p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Receivables</p>
                    <p className="mt-2 text-xl sm:text-2xl font-black text-rose-600">{formatIQD(stats?.outstanding_balance ?? 0)}</p>
                    <p className="mt-1 text-xs text-slate-400">Credits: {formatIQD(stats?.customer_credit_total ?? 0)}</p>
                </div>
                <div className="surface-card p-4 sm:p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Inventory Value</p>
                    <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900">{formatIQD(stats?.total_stock_value ?? 0)}</p>
                    <p className="mt-1 text-xs text-slate-400">{stats?.total_items ?? 0} products</p>
                </div>
                <div className="surface-card p-4 sm:p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Risk</p>
                    <p className="mt-2 text-xl sm:text-2xl font-black text-amber-600">{stats?.low_stock_count ?? 0} low stock</p>
                    <p className="mt-1 text-xs text-slate-400">{stats?.pending_transfers ?? 0} pending transfers</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="surface-card p-5 lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900">Recent Sales</h2>
                        <Link href="/sales/invoices" className="text-sm font-semibold text-slate-500 hover:text-slate-900">Open invoices</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-2 text-left">Invoice</th>
                                    <th className="py-2 text-left">Customer</th>
                                    <th className="py-2 text-right">Amount</th>
                                    <th className="py-2 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSales.map((sale) => (
                                    <tr key={sale.id} className="border-b border-slate-50">
                                        <td className="py-3 text-sm font-semibold text-slate-800">#{sale.invoice_number || sale.id}</td>
                                        <td className="py-3 text-sm text-slate-600">{sale.customer_name || "Walk-in"}</td>
                                        <td className="py-3 text-right text-sm font-bold text-slate-800">{formatIQD(toNumber(sale.total_amount))}</td>
                                        <td className="py-3 text-right text-xs font-bold uppercase text-slate-500">{sale.payment_status || "N/A"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {recentSales.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No recent sales found.</p>}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="surface-card p-5">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Quick Actions</h3>
                        <div className="mt-3 space-y-2">
                            <Link href="/sales/invoices/new" className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"><span className="flex items-center gap-2"><DollarSign size={14} /> New invoice</span><ArrowUpRight size={14} /></Link>
                            <Link href="/products/inbound" className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"><span className="flex items-center gap-2"><Boxes size={14} /> Stock inbound</span><ArrowUpRight size={14} /></Link>
                            <Link href="/customers" className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"><span className="flex items-center gap-2"><Users size={14} /> Customer list</span><ArrowUpRight size={14} /></Link>
                        </div>
                    </div>

                    <div className="surface-card p-5">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Low Stock Watch</h3>
                        <div className="mt-3 space-y-2">
                            {insights.low_stock_items.slice(0, 4).map((item) => (
                                <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><AlertTriangle size={14} className="text-amber-500" />{item.name}</span>
                                    <span className="text-xs font-bold text-rose-600">-{item.shortage}</span>
                                </div>
                            ))}
                            {insights.low_stock_items.length === 0 && <p className="text-sm text-slate-500">No stock alerts.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
