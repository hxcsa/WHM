"use client";

import { useEffect, useState } from "react";
import {
    Activity, Filter, Search, Package, TrendingUp, TrendingDown,
    ArrowRightLeft, ClipboardCheck, FileText, Package2, RefreshCw,
    Clock, User, ChevronRight
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface LogEntry {
    id: string;
    timestamp: any;
    item_id?: string;
    item_name?: string;
    warehouse_id?: string;
    quantity?: string;
    source_document_type?: string;
    description?: string;
    valuation_rate?: string;
}

export default function ActivityLog() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("ALL");
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch item names for mapping
    const [itemNames, setItemNames] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch stock ledger (comprehensive history)
                const [ledgerRes, itemsRes] = await Promise.all([
                    fetchWithAuth("/api/inventory/history?limit=100"),
                    fetchWithAuth("/api/inventory/items?limit=500")
                ]);

                const ledgerData = ledgerRes.ok ? await ledgerRes.json() : [];
                const itemsData = itemsRes.ok ? await itemsRes.json() : [];

                // Build item name map
                const nameMap: Record<string, string> = {};
                itemsData.forEach((item: any) => {
                    nameMap[item.id] = item.name;
                });
                setItemNames(nameMap);

                // Enrich logs with item names
                const enrichedLogs = ledgerData.map((log: any) => ({
                    ...log,
                    item_name: nameMap[log.item_id] || log.item_id
                }));

                setLogs(enrichedLogs);
            } catch (err) {
                console.error("Activity fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "GRN": return <TrendingUp className="text-emerald-500" size={16} />;
            case "DO": return <TrendingDown className="text-rose-500" size={16} />;
            case "TRF": return <ArrowRightLeft className="text-indigo-500" size={16} />;
            case "ADJ": return <ClipboardCheck className="text-amber-500" size={16} />;
            default: return <FileText className="text-slate-400" size={16} />;
        }
    };

    const getTypeBadge = (type: string) => {
        const styles: Record<string, string> = {
            "GRN": "bg-emerald-50 text-emerald-700 border-emerald-200",
            "DO": "bg-rose-50 text-rose-700 border-rose-200",
            "TRF": "bg-indigo-50 text-indigo-700 border-indigo-200",
            "ADJ": "bg-amber-50 text-amber-700 border-amber-200",
        };
        return styles[type] || "bg-slate-50 text-slate-700 border-slate-200";
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "GRN": return "Purchase / شراء";
            case "DO": return "Sale / بيع";
            case "TRF": return "Transfer / تحويل";
            case "ADJ": return "Adjustment / تسوية";
            default: return type;
        }
    };

    const filteredLogs = logs.filter(log => {
        if (filter !== "ALL" && log.source_document_type !== filter) return false;
        if (searchTerm && !log.item_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Activity className="text-blue-600" size={28} />
                        Activity Log / سجل النشاط
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Complete history of all inventory movements and transactions</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-white border border-slate-200 px-5 py-2.5 rounded-xl flex items-center gap-2 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        placeholder="Search by item name..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {["ALL", "GRN", "DO", "TRF", "ADJ"].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === type
                                ? "bg-slate-900 text-white shadow-lg"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            {type === "ALL" ? "All" : type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Logs Table */}
            <div className="enterprise-card border-none shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center font-bold text-slate-400 flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-blue-600" />
                        Loading Activity History...
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-20 text-center font-bold text-slate-400">
                        No activity found matching your filters
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Date / Time</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Item</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4 text-right">Quantity</th>
                                <th className="px-6 py-4 text-right">Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Clock size={14} />
                                            <span className="font-mono text-xs">
                                                {log.timestamp?.seconds
                                                    ? new Date(log.timestamp.seconds * 1000).toLocaleString()
                                                    : "N/A"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getTypeBadge(log.source_document_type || "")}`}>
                                            {getTypeIcon(log.source_document_type || "")}
                                            {log.source_document_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                <Package2 size={14} className="text-slate-400" />
                                            </div>
                                            <span className="font-bold text-slate-700">{log.item_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-600 max-w-[200px] truncate block" title={log.description}>
                                            {log.description || "-"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-mono font-black text-sm ${Number(log.quantity) > 0 ? "text-emerald-600" : "text-rose-600"
                                            }`}>
                                            {Number(log.quantity) > 0 ? "+" : ""}{Number(log.quantity).toFixed(0)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-mono text-sm text-slate-400">
                                            {Number(log.valuation_rate || 0).toLocaleString()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Total Purchases"
                    value={logs.filter(l => l.source_document_type === "GRN").length}
                    icon={<TrendingUp className="text-emerald-500" size={18} />}
                    color="emerald"
                />
                <StatCard
                    label="Total Sales"
                    value={logs.filter(l => l.source_document_type === "DO").length}
                    icon={<TrendingDown className="text-rose-500" size={18} />}
                    color="rose"
                />
                <StatCard
                    label="Transfers"
                    value={logs.filter(l => l.source_document_type === "TRF").length}
                    icon={<ArrowRightLeft className="text-indigo-500" size={18} />}
                    color="indigo"
                />
                <StatCard
                    label="Adjustments"
                    value={logs.filter(l => l.source_document_type === "ADJ").length}
                    icon={<ClipboardCheck className="text-amber-500" size={18} />}
                    color="amber"
                />
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }: any) {
    const bgColors: Record<string, string> = {
        emerald: "bg-emerald-50",
        rose: "bg-rose-50",
        indigo: "bg-indigo-50",
        amber: "bg-amber-50"
    };

    return (
        <div className={`enterprise-card flex items-center gap-4`}>
            <div className={`p-3 rounded-xl ${bgColors[color] || "bg-slate-50"}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <h4 className="text-2xl font-black text-slate-800">{value}</h4>
            </div>
        </div>
    );
}
