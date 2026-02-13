"use client";

import { useState, useEffect } from "react";
import {
    Plus, Search, Filter, MessageSquare,
    Truck, User, Calendar, CheckCircle,
    ChevronRight, Clock, AlertCircle, Package
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import IntentForm from "./IntentForm";

export default function IntentList() {
    const { t } = useLanguage();
    const [intents, setIntents] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Filters
    const [filterClient, setFilterClient] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    useEffect(() => {
        loadData();
    }, [filterClient, filterStatus, page]);

    const loadData = async () => {
        setLoading(true);
        try {
            const url = new URL("/api/warehouse/intents", window.location.origin);
            url.searchParams.append("page", page.toString());
            url.searchParams.append("limit", "10");

            if (filterClient) url.searchParams.append("client_id", filterClient);
            if (filterStatus) url.searchParams.append("status", filterStatus);

            const [intentsRes, customersRes] = await Promise.all([
                fetchWithAuth(url.toString()),
                fetchWithAuth("/api/customers")
            ]);

            const intentsData = intentsRes.ok ? await intentsRes.json() : [];
            const customersData = customersRes.ok ? await customersRes.json() : {};

            setIntents(Array.isArray(intentsData) ? intentsData : []);
            setCustomers(customersData.customers || []);
        } catch (err) {
            console.error("Failed to load intent data", err);
            setIntents([]);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "requested": return "bg-blue-100 text-blue-700 border-blue-200";
            case "guaranteed": return "bg-indigo-100 text-indigo-700 border-indigo-200";
            case "rejected": return "bg-red-100 text-red-700 border-red-200";
            case "in_warehouse": return "bg-amber-100 text-amber-700 border-amber-200";
            case "ready": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "done": return "bg-slate-100 text-slate-700 border-slate-200";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    const getTypeStyle = (type: string) => {
        return type === "give"
            ? "bg-rose-50 text-rose-600 border-rose-100"
            : "bg-teal-50 text-teal-600 border-teal-100";
    };

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Package className="text-primary" size={28} />
                        Warehouse Intents / طلبات المستودع
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Manage incoming and outgoing warehouse requests</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/20 active:scale-95"
                >
                    <Plus size={20} /> New Request / طلب جديد
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Filter by Client</label>
                    <div className="relative">
                        <select
                            className="w-full bg-slate-50 border-none rounded-lg py-2.5 px-4 font-bold text-slate-700 appearance-none focus:ring-2 ring-primary/20"
                            value={filterClient}
                            onChange={(e) => setFilterClient(e.target.value)}
                        >
                            <option value="">All Clients / كل الزبائن</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.company_name || `${c.first_name} ${c.last_name}`}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={16} />
                    </div>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Filter by Status</label>
                    <div className="flex gap-2 flex-wrap">
                        {["requested", "guaranteed", "rejected", "in_warehouse", "ready", "done"].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border ${filterStatus === s
                                    ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                                    : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                                    }`}
                            >
                                {s.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading requests...</p>
                </div>
            ) : intents.length === 0 ? (
                <div className="bg-white rounded-3xl p-20 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                    <div className="bg-slate-50 p-6 rounded-full mb-6">
                        <Filter className="text-slate-300" size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Intents Found</h3>
                    <p className="text-slate-500 max-w-xs">Change filters or create a new request to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {intents.map((intent) => {
                        const client = customers.find((c: any) => c.id === intent.client_id);
                        return (
                            <div key={intent.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-primary/30 transition-all hover:shadow-xl group relative overflow-hidden">
                                {/* Type strip */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${intent.type === 'give' ? 'bg-rose-500' : 'bg-teal-500'}`} />

                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl border ${getTypeStyle(intent.type)}`}>
                                            <Truck size={22} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-slate-800 text-lg">#{intent.number}</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getTypeStyle(intent.type)}`}>
                                                    {intent.type}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-slate-500">{client?.company_name || 'Generic Client'}</p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusStyle(intent.status)}`}>
                                        {intent.status?.replace("_", " ")}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg text-slate-400">
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expected ETA</p>
                                            <p className="text-xs font-bold text-slate-700">
                                                {intent.eta ? new Date(intent.eta).toLocaleDateString() : 'Not Set'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg text-slate-400">
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Driver / Logistics</p>
                                            <p className="text-xs font-bold text-slate-700 truncate w-24">
                                                {intent.driver_name || 'Assigning...'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
                                    <div className="flex items-center gap-4 text-slate-400">
                                        <div className="flex items-center gap-1.5">
                                            <Package size={14} />
                                            <span className="text-xs font-black">{intent.items?.length || 0} items</span>
                                        </div>
                                        {intent.notes && (
                                            <div className="flex items-center gap-1.5">
                                                <MessageSquare size={14} />
                                                <span className="text-xs font-black truncate w-20">Note</span>
                                            </div>
                                        )}
                                    </div>
                                    <button className="text-primary font-black text-xs uppercase tracking-widest hover:underline flex items-center gap-1">
                                        View Details <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                >
                    Previous
                </button>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Page {page}</span>
                <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={intents.length < 10 || loading}
                    className="px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                >
                    Next
                </button>
            </div>

            {showForm && (
                <IntentForm
                    onClose={() => setShowForm(false)}
                    onSuccess={() => {
                        setShowForm(false);
                        loadData();
                    }}
                    customers={customers}
                />
            )}
        </div>
    );
}
