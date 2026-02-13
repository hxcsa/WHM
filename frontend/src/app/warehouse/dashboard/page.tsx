"use client";

import { useEffect, useState } from "react";
import {
    Package, Warehouse, AlertTriangle, Truck, ClipboardCheck, TrendingUp,
    Search, Bell, Settings as SettingsIcon, Plus, Calendar, MapPin, MoreVertical,
    ArrowUpRight, ArrowDownRight, Activity, Box, Search as SearchIcon,
    ShieldCheck, ChevronRight, Filter, ExternalLink
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function WarehouseDashboardPage() {
    const [stats, setStats] = useState({ totalItems: 0, lowStock: 0, totalWarehouses: 0, totalValue: 0 });
    const [recentIntents, setRecentIntents] = useState<any[]>([]);
    const [recentAdjustments, setRecentAdjustments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetchWithAuth("/api/warehouse/products"),
            fetchWithAuth("/api/warehouse/warehouses"),
            fetchWithAuth("/api/warehouse/intents"),
            fetchWithAuth("/api/warehouse/ops/adjustments")
        ]).then(async ([prodRes, whRes, intRes, adjRes]) => {
            const prods = prodRes.ok ? await prodRes.json() : [];
            const whs = whRes.ok ? await whRes.json() : [];
            const ints = intRes.ok ? await intRes.json() : [];
            const adjs = adjRes.ok ? await adjRes.json() : [];

            const totalVal = Array.isArray(prods)
                ? prods.reduce((acc: number, p: any) => acc + (Number(p.cost_price || 0) * Number(p.current_qty || 0)), 0)
                : 0;

            setStats({
                totalItems: Array.isArray(prods) ? prods.reduce((acc: number, p: any) => acc + Number(p.current_qty || 0), 0) : 0,
                lowStock: Array.isArray(prods) ? prods.filter((p: any) => Number(p.current_qty) < 10).length : 0,
                totalWarehouses: whs.length,
                totalValue: totalVal
            });
            setRecentIntents(ints.slice(0, 5));
            setRecentAdjustments(adjs.slice(0, 5));
        }).catch(err => {
            console.error("Dashboard data fetch error:", err);
        }).finally(() => setLoading(false));
    }, []);

    // Mock data for the chart
    const data = [
        { name: 'Jan', value: 4000 },
        { name: 'Feb', value: 3000 },
        { name: 'Mar', value: 5000 },
        { name: 'Apr', value: 4780 },
        { name: 'May', value: 6890 },
        { name: 'Jun', value: 5390 },
        { name: 'Jul', value: 7490 },
    ];

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            {/* Professional Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div>
                    <h1 className="text-4xl font-black text-[var(--ink)] tracking-tight">Warehouse Ops Hub</h1>
                    <p className="text-[var(--ink-soft)] mt-2 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--success)] shadow-sm"></span>
                        Operational Integrity: <span className="text-[var(--ink)] font-black">HIGH</span>
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="relative group flex-1 lg:w-80">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-thin)] group-focus-within:text-[var(--accent)] transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Query manifest storage..."
                            className="enterprise-input w-full h-12 pl-12 pr-4 text-sm font-bold"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="w-12 h-12 bg-white rounded-xl border border-[var(--ink-thin)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--accent)] hover:border-[var(--accent-thin)] transition-all">
                            <SettingsIcon size={20} />
                        </button>
                        <button className="w-12 h-12 bg-white rounded-xl border border-[var(--ink-thin)] flex items-center justify-center text-[var(--ink-soft)] relative hover:text-[var(--accent)] transition-all">
                            <Bell size={20} />
                            <span className="absolute top-3 right-3 w-2 h-2 bg-[var(--danger)] rounded-full border-2 border-white"></span>
                        </button>
                    </div>
                    <button className="opengate-button-primary flex items-center justify-center gap-2 px-6 h-12 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[var(--accent-thin)]">
                        <span>Ingest Logic</span>
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* Performance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                <div className="enterprise-card p-5 sm:p-6 border-none bg-gradient-to-br from-[#102642] to-[#1a3b63] text-white relative overflow-hidden group shadow-xl">
                    <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:scale-150 transition-transform duration-500"><Box size={80} /></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-3 sm:mb-4">Storage Volume</p>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{stats.totalItems.toLocaleString()} <span className="text-sm font-medium text-white/50">Units</span></h3>
                    <div className="mt-4 sm:mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <span className="text-[var(--accent)]">+12.5%</span>
                        <span className="text-white/30 truncate">Cycle Velocity</span>
                    </div>
                </div>

                <div className="enterprise-card p-5 sm:p-6 border border-[var(--ink-thin)] bg-white group hover:scale-[1.02] transition-all">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ink-soft)] mb-3 sm:mb-4">Capital Appraisal</p>
                    <h3 className="text-xl sm:text-2xl font-black text-[var(--ink)] tracking-tight">IQD {stats.totalValue.toLocaleString()}</h3>
                    <div className="mt-4 sm:mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <TrendingUp size={12} className="text-[var(--success)]" />
                        <span className="text-[var(--success)]">Appreciating</span>
                    </div>
                </div>

                <div className="enterprise-card p-5 sm:p-6 border border-[var(--ink-thin)] bg-white group hover:scale-[1.02] transition-all">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ink-soft)] mb-3 sm:mb-4">Precision Metric</p>
                    <div className="flex items-end justify-between mb-2">
                        <h3 className="text-xl sm:text-2xl font-black text-[var(--ink)] tracking-tight">98.2%</h3>
                        <span className="text-[10px] font-black text-[var(--success)] uppercase">Audit Grade</span>
                    </div>
                    <div className="w-full bg-[var(--bg-soft)] rounded-full h-1.5 mt-4">
                        <div className="bg-[var(--accent)] h-1.5 rounded-full" style={{ width: '98.2%' }}></div>
                    </div>
                </div>

                <div className="enterprise-card p-5 sm:p-6 border border-[var(--ink-thin)] bg-white group hover:scale-[1.02] transition-all">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ink-soft)] mb-3 sm:mb-4">Node Count</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-[var(--ink)] tracking-tight">{stats.totalWarehouses} <span className="text-sm font-medium text-[var(--ink-soft)]">Sites</span></h3>
                    <div className="mt-4 sm:mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <div className="flex -space-x-2">
                            <div className="w-4 h-4 rounded-full bg-[var(--accent)] border border-white"></div>
                            <div className="w-4 h-4 rounded-full bg-indigo-500 border border-white"></div>
                            <div className="w-4 h-4 rounded-full bg-emerald-500 border border-white"></div>
                        </div>
                        <span className="text-[var(--ink-soft)] ml-2">Distributed</span>
                    </div>
                </div>

                <div className="enterprise-card p-5 sm:p-6 border border-[var(--ink-thin)] bg-white group hover:scale-[1.02] transition-all">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ink-soft)] mb-3 sm:mb-4">Critical Alerts</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-[var(--danger)] tracking-tight">{stats.lowStock} <span className="text-sm font-medium text-[var(--ink-soft)]">SKUs</span></h3>
                    <div className="mt-4 sm:mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <AlertTriangle size={12} className="text-[var(--danger)]" />
                        <span className="text-[var(--danger)]">Action Required</span>
                    </div>
                </div>
            </div>

            {/* Core Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 enterprise-card p-8 border border-[var(--ink-thin)] bg-white flex flex-col h-full">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-xl font-black text-[var(--ink)] tracking-tight uppercase">Throughput Analytics</h3>
                            <p className="text-xs font-bold text-[var(--ink-soft)] mt-1 uppercase tracking-widest italic">Cycle Data: Last 7 Business Periods</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <h3 className="text-2xl font-black text-[var(--ink)] tracking-tighter">IQD 14.8M</h3>
                                <div className="text-[8px] font-black text-[var(--success)] uppercase tracking-[0.2em] mt-1 bg-[var(--success-thin)] px-2 py-0.5 rounded-full inline-block">Protocols Met</div>
                            </div>
                            <button className="flex items-center gap-2 px-4 h-10 border border-[var(--ink-thin)] rounded-xl text-xs font-black uppercase tracking-widest text-[var(--ink-soft)] bg-[var(--bg)]/30 hover:bg-white transition-all">
                                <Calendar size={14} /> Full Ledger
                            </button>
                        </div>
                    </div>

                    <div className="h-[340px] w-full mt-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#54C7E5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#54C7E5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ink-thin)" opacity={0.3} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--ink-soft)', fontSize: 10, fontWeight: 900 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--ink-soft)', fontSize: 10, fontWeight: 900 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: '1px solid var(--ink-thin)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: '900', fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="enterprise-card p-0 border border-[var(--ink-thin)] bg-[#102642] overflow-hidden text-white h-full flex flex-col relative shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                        <div className="p-8 border-b border-white/10 relative z-10 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/50">Node Distribution</h3>
                                <p className="text-2xl font-black tracking-tight mt-1">Regional Density</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[var(--accent)]">
                                <MapPin size={20} />
                            </div>
                        </div>

                        <div className="flex-1 p-8 flex flex-col justify-center relative z-10">
                            <div className="space-y-8">
                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="text-xl font-black text-white/30 group-hover:text-white transition-colors">01</div>
                                        <div>
                                            <p className="text-sm font-black text-white">Central Baghdad</p>
                                            <p className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest mt-0.5">Primary Hub</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-black italic">65%</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                    <div className="bg-[var(--accent)] h-full" style={{ width: '65%' }}></div>
                                </div>

                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="text-xl font-black text-white/30 group-hover:text-white transition-colors">02</div>
                                        <div>
                                            <p className="text-sm font-black text-white">Northern Basra</p>
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Secondary Hub</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-black italic">35%</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                    <div className="bg-indigo-400 h-full" style={{ width: '35%' }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-black/20 border-t border-white/10 relative z-10">
                            <button className="w-full h-12 rounded-xl bg-[var(--accent)] text-[#102642] font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[var(--accent-thin)] active:scale-95 transition-all">
                                Global Map View
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Operations Ledger */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 enterprise-card p-0 border border-[var(--ink-thin)] bg-white overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[var(--ink-thin)] flex items-center justify-between bg-[var(--bg)]/30">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--ink)] flex items-center gap-3">
                            <Activity size={18} className="text-[var(--accent)]" /> Active Operations Journal
                        </h3>
                        <div className="flex items-center gap-2">
                            <button className="p-2 text-[var(--ink-soft)] hover:text-[var(--ink)]"><Filter size={16} /></button>
                            <button className="flex items-center gap-2 px-3 h-8 border border-[var(--ink-thin)] rounded-lg text-[10px] font-black uppercase tracking-widest text-[var(--ink-soft)] bg-white hover:bg-[var(--bg)] transition-all">
                                Protocol View
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full enterprise-table">
                            <thead className="bg-[var(--bg)]/10 text-[var(--ink-soft)]">
                                <tr>
                                    <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest">Manifest Entity</th>
                                    <th className="py-2 px-6 text-left text-[10px] font-black uppercase tracking-widest">Protocol ID</th>
                                    <th className="py-2 px-6 text-left text-[10px] font-black uppercase tracking-widest">Quota</th>
                                    <th className="py-2 px-6 text-left text-[10px] font-black uppercase tracking-widest">Latency</th>
                                    <th className="py-2 px-6 text-right text-[10px] font-black uppercase tracking-widest">Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--bg-soft)]">
                                {[
                                    { name: "Tactical Backpack", sku: "BP-OG-04", id: "P-10029", price: "IQD 45k", status: "Validated", color: "text-[var(--success)]" },
                                    { name: "Compression Baselayer", sku: "CB-OG-01", id: "P-10034", price: "IQD 12k", status: "Audit Due", color: "text-amber-500" },
                                    { name: "Optic Guard (Polar)", sku: "OG-OG-09", id: "P-10045", price: "IQD 89k", status: "Halted", color: "text-[var(--danger)]" },
                                    { name: "Personnel Utility Rig", sku: "PR-OG-03", id: "P-10051", price: "IQD 120k", status: "In Buffer", color: "text-indigo-400" },
                                ].map((item, i) => (
                                    <tr key={i} className="group hover:bg-[var(--bg)]/40 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-[var(--bg)] flex items-center justify-center text-[var(--ink-thin)]">
                                                    <Box size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-[var(--ink)] tracking-tight">{item.name}</p>
                                                    <p className="text-[10px] text-[var(--ink-soft)] font-black uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity">{item.sku}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-xs font-black text-[var(--ink-soft)] font-mono">{item.id}</td>
                                        <td className="py-4 px-6 text-sm font-black text-[var(--ink)]">{item.price}</td>
                                        <td className={`py-4 px-6 text-[10px] font-black uppercase tracking-[0.15em] ${item.color}`}>
                                            <span className="flex items-center gap-1.5 whitespace-nowrap">
                                                <div className={`w-1.5 h-1.5 rounded-full bg-current ${item.status === 'Halted' ? '' : 'animate-pulse'}`}></div>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-thin)] hover:text-[var(--accent)] hover:bg-white transition-all ml-auto">
                                                <ExternalLink size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="enterprise-card p-8 border border-[var(--ink-thin)] bg-white relative overflow-hidden h-full flex flex-col">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] transition-transform group-hover:rotate-12 duration-1000">
                            <TrendingUp size={160} />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--ink)] flex items-center gap-3 mb-8">
                            <ShieldCheck size={18} className="text-[var(--success)]" /> Critical Capacity Audit
                        </h3>

                        <div className="flex-1 flex flex-col justify-center space-y-10 py-6">
                            <div className="relative w-48 h-48 mx-auto">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="96" cy="96" r="88" stroke="var(--bg-soft)" strokeWidth="12" fill="transparent" />
                                    <circle cx="96" cy="96" r="88" stroke="var(--accent)" strokeWidth="12" fill="transparent" strokeDasharray="552.9" strokeDashoffset="110" strokeLinecap="round" className="animate-in slide-in-from-right duration-1000" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-black text-[var(--ink)] tracking-tighter italic">82%</span>
                                    <span className="text-[10px] text-[var(--ink-soft)] font-black uppercase tracking-widest mt-1">Saturated</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                                    <p className="text-lg font-black text-amber-700">10%</p>
                                    <p className="text-[8px] text-amber-600 font-black uppercase tracking-widest leading-tight mt-1">Warning Zone Intensity</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                                    <p className="text-lg font-black text-rose-700">8%</p>
                                    <p className="text-[8px] text-rose-600 font-black uppercase tracking-widest leading-tight mt-1">Risk Buffer Exhaustion</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 pt-8 border-t border-[var(--ink-thin)]">
                            <button className="w-full py-4 rounded-2xl bg-[var(--bg)] border border-[var(--ink-thin)] text-[var(--ink)] font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all flex items-center justify-center gap-3 group">
                                Optimize Site Allocation
                                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
