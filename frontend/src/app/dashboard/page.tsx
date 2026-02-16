"use client";

import { useEffect, useState } from "react";
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
    Wallet, Package, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight,
    Clock, History, LineChart as ChartIcon, ShieldCheck
} from "lucide-react";
import SaleForm from "@/components/SaleForm";
import PurchaseForm from "@/components/PurchaseForm";
import React, { useCallback, memo } from "react";
import { fetchWithAuth } from "@/lib/api";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

const KpiCard = memo(({ title, value, icon, trend, trendUp, description }: any) => (
    <div className="enterprise-card flex flex-col justify-between group p-4 sm:p-5">
        <div className="flex justify-between items-start mb-3 sm:mb-4">
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all duration-300">
                {icon}
            </div>
            {trend && (
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {trend}
                </span>
            )}
        </div>
        <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">{title}</p>
            <h4 className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums">{value}</h4>
            {description && <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 sm:mt-2 font-medium">{description}</p>}
        </div>
    </div>
));
KpiCard.displayName = "KpiCard";

const QuickButton = memo(({ label, icon, color, onClick }: any) => {
    const colors: any = {
        emerald: "hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/20",
        blue: "hover:bg-blue-600 text-blue-400 hover:text-white border-blue-500/20",
        amber: "hover:bg-amber-600 text-amber-400 hover:text-white border-amber-500/20",
    };
    return (
        <button
            onClick={onClick}
            className={`w-full text-right p-3 sm:p-4 rounded-xl border transition-all flex items-center justify-between font-bold text-sm ${colors[color]}`}
        >
            <span className="opacity-90 text-xs sm:text-sm">{label}</span>
            <div className="p-1.5 bg-white/5 rounded-lg">{icon}</div>
        </button>
    );
});
QuickButton.displayName = "QuickButton";

export default function Dashboard() {
    const [stats, setStats] = useState({
        cashBalance: "0",
        lowStock: 0,
        todaySales: "0",
        pendingInvoices: 0
    });

    const [chartData, setChartData] = useState<any[]>([]);
    const [journalEntries, setJournalEntries] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [intents, setIntents] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);

    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);

    const [loading, setLoading] = useState(true);
    const [authReady, setAuthReady] = useState(false);
    const [authUser, setAuthUser] = useState<User | null>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    const fetchData = useCallback(async () => {
        if (!authReady || !authUser) return;
        setLoading(true);
        try {
            const [journalsRes, itemsRes, statsRes, trendRes, intentsRes, invoicesRes] = await Promise.all([
                fetchWithAuth("/api/accounting/journals?limit=5"),
                fetchWithAuth("/api/inventory/items?limit=5"),
                fetchWithAuth("/api/reports/dashboard"),
                fetchWithAuth("/api/reports/weekly-trend"),
                fetchWithAuth("/api/warehouse/intents?limit=5"),
                fetchWithAuth("/api/sales/invoices?page_size=5")
            ]);

            const journalsData = journalsRes.ok ? await journalsRes.json() : [];
            const itemsData = itemsRes.ok ? await itemsRes.json() : { items: [] };
            const statsData = statsRes.ok ? await statsRes.json() : null;
            const trendData = trendRes.ok ? await trendRes.json() : [];
            const intentsData = intentsRes.ok ? await intentsRes.json() : [];
            const invoicesData = invoicesRes.ok ? await invoicesRes.json() : { items: [] };

            setJournalEntries(Array.isArray(journalsData) ? journalsData : []);
            setItems(itemsData.items || (Array.isArray(itemsData) ? itemsData : []));
            setIntents(intentsData);
            setInvoices(invoicesData.items || []);

            if (statsData) setStats(statsData);
            if (Array.isArray(trendData)) setChartData(trendData);
        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [authReady, authUser]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (!authReady) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                <KpiCard
                    title="Cash Balance"
                    value={`${stats.cashBalance} IQD`}
                    icon={<Wallet className="text-blue-600" size={18} />}
                    trend="+5.2%"
                    trendUp={true}
                />
                <KpiCard
                    title="Low Stock"
                    value={stats.lowStock}
                    icon={<AlertTriangle className="text-amber-600" size={18} />}
                    description="Items below minimum"
                />
                <KpiCard
                    title="Monthly Sales"
                    value={`${stats.todaySales} IQD`}
                    icon={<TrendingUp className="text-emerald-600" size={18} />}
                    trend="+12%"
                    trendUp={true}
                />
                <KpiCard
                    title="Pending"
                    value={stats.pendingInvoices}
                    icon={<Clock className="text-slate-600" size={18} />}
                    description="Awaiting payment"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {/* Sales Chart */}
                <div className="lg:col-span-2 enterprise-card p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg text-blue-600">
                                <ChartIcon size={18} />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold">Weekly Growth</h3>
                        </div>
                    </div>
                    <div className="h-[200px] sm:h-[250px] lg:h-[300px] w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="#64748b" 
                                        fontSize={10}
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickMargin={8}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis 
                                        stroke="#64748b" 
                                        fontSize={10}
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickMargin={8}
                                        tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                                    />
                                    <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">No trend data available</div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="enterprise-card bg-slate-900 border-none text-white overflow-hidden relative p-4 sm:p-6">
                    <div className="relative z-10 h-full flex flex-col">
                        <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-6">Quick Actions</h3>
                        <div className="grid grid-cols-1 gap-2 sm:gap-3 flex-1">
                            <QuickButton label="New Sale" icon={<ArrowUpRight size={16} />} color="emerald" onClick={() => setShowSaleModal(true)} />
                            <QuickButton label="New Purchase" icon={<ArrowDownRight size={16} />} color="blue" onClick={() => setShowPurchaseModal(true)} />
                            <QuickButton label="Stock Adjustment" icon={<TrendingUp size={16} />} color="amber" onClick={() => window.location.href = '/warehouse/adjustment'} />
                        </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                </div>
            </div>

            {/* Module Summaries */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                {/* Warehouse Snapshot */}
                <div className="enterprise-card border-none shadow-sm flex flex-col h-full p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <Package size={16} className="text-blue-500" />
                            <h3 className="text-sm sm:text-base font-bold uppercase tracking-widest">Warehouse Snapshot</h3>
                        </div>
                        <a href="/warehouse" className="text-[10px] font-black text-blue-600 hover:underline">VIEW ALL</a>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 flex-1">
                        <div className="space-y-3 sm:space-y-4">
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Recent Items</p>
                            <div className="space-y-2">
                                {items.slice(0, 4).map(item => (
                                    <div key={item.id} className="p-2.5 sm:p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-700 truncate max-w-[60%]">{item.name}</span>
                                        <span className={`font-black ${Number(item.current_qty) < 10 ? 'text-rose-600' : 'text-slate-500'}`}>{Number(item.current_qty)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Recent Intents</p>
                            <div className="space-y-2">
                                {intents.slice(0, 4).map(intent => (
                                    <div key={intent.id} className="p-2.5 sm:p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-700">#{intent.number}</span>
                                        <span className="text-[9px] sm:text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-100 font-black">{intent.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Accounting Snapshot */}
                <div className="enterprise-card border-none shadow-sm flex flex-col h-full p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <ShieldCheck size={16} className="text-emerald-500" />
                            <h3 className="text-sm sm:text-base font-bold uppercase tracking-widest">Accounting Snapshot</h3>
                        </div>
                        <a href="/reports" className="text-[10px] font-black text-emerald-600 hover:underline">VIEW ALL</a>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 flex-1">
                        <div className="space-y-3 sm:space-y-4">
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Recent Journals</p>
                            <div className="space-y-2">
                                {journalEntries.slice(0, 4).map(je => (
                                    <div key={je.id} className="p-2.5 sm:p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-700">#{je.number}</span>
                                        <span className="font-black text-emerald-600">+{Number(je.lines?.[0]?.debit || 0).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Recent Invoices</p>
                            <div className="space-y-2">
                                {invoices.slice(0, 4).map(inv => (
                                    <div key={inv.id} className="p-2.5 sm:p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-700">{inv.invoice_number}</span>
                                        <span className="font-black text-blue-600">{Number(inv.total_amount).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showSaleModal && <SaleForm onClose={() => setShowSaleModal(false)} onSuccess={fetchData} />}
            {showPurchaseModal && <PurchaseForm onClose={() => setShowPurchaseModal(false)} onSuccess={fetchData} />}
        </div>
    );
}
