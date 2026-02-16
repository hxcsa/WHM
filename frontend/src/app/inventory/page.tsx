"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
    Package, Plus, Search, Filter, Warehouse,
    BarChart3, TrendingDown, ClipboardList, ArrowRightLeft,
    History, X, ChevronRight, Activity, Box, Database,
    Info, ExternalLink, Calendar, ShieldCheck, Loader2
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import React, { useCallback, memo } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fetchWithAuth } from "@/lib/api";

const ItemForm = dynamic(() => import("@/components/ItemForm"), { ssr: false });
const SaleForm = dynamic(() => import("@/components/SaleForm"), { ssr: false });
const TransferForm = dynamic(() => import("@/components/TransferForm"), { ssr: false });
const ReconciliationForm = dynamic(() => import("@/components/ReconciliationForm"), { ssr: false });
const InventoryAnalytics = dynamic(() => import("@/components/InventoryAnalytics"), { ssr: false });


// Memoized Action Button
const InventoryAction = memo(({ title, sub, icon, color, onClick }: any) => (
    <button
        onClick={onClick}
        className={`${color} text-white p-6 rounded-[2rem] flex items-center justify-between group hover:scale-[1.05] transition-all shadow-xl active:scale-95 border-none relative overflow-hidden`}
    >
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-500">{icon}</div>
        <div className="text-left relative z-10">
            <h4 className="text-xl font-black leading-tight uppercase tracking-tight">{title}</h4>
            <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-1">{sub}</p>
        </div>
        <div className="p-3 bg-white/20 rounded-2xl group-hover:bg-white/30 transition-all relative z-10">
            {icon}
        </div>
    </button>
));

InventoryAction.displayName = "InventoryAction";

// Memoized Table Row
const InventoryRow = memo(({ item, onHistoryClick }: any) => (
    <tr className="group hover:bg-[var(--bg)]/40 transition-colors border-b border-[var(--bg-soft)]">
        <td className="px-6 py-5">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => onHistoryClick(item)}
                    className="w-10 h-10 bg-[var(--bg)] rounded-xl flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--accent)] hover:bg-white border border-[var(--ink-thin)] transition-all active:scale-90 shadow-sm"
                    title="View Stock History"
                >
                    <History size={16} />
                </button>
                <div>
                    <div className="font-black text-[var(--ink)] tracking-tight">{item.name}</div>
                    <div className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-tighter font-mono opacity-70">{item.sku}</div>
                </div>
            </div>
        </td>
        <td className="px-6 py-5">
            <span className="px-4 py-1.5 bg-white border border-[var(--ink-thin)] text-[var(--ink-soft)] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                {item.category || "Standard"}
            </span>
        </td>
        <td className="px-6 py-5 text-right">
            <div className="font-black text-[var(--ink)] text-lg tracking-tighter tabular-nums">{Number(item.current_qty).toFixed(0)}</div>
            <div className="text-[8px] font-black text-[var(--ink-soft)] uppercase tracking-[0.2em]">{item.unit || "Units"}</div>
        </td>
        <td className="px-6 py-5 text-right">
            <div className="font-black text-[var(--ink-soft)] font-mono text-xs tabular-nums tracking-tighter">{Number(item.current_wac).toLocaleString()}</div>
            <p className="text-[8px] font-black text-[var(--ink-thin)] uppercase tracking-widest">WAC Protocol</p>
        </td>
        <td className="px-6 py-5 text-right">
            <div className="font-black text-[var(--accent)] text-lg font-mono tracking-tighter tabular-nums">{Number(item.total_value).toLocaleString()}</div>
            <div className="text-[8px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Valuation (IQD)</div>
        </td>
    </tr>
));

InventoryRow.displayName = "InventoryRow";

export default function Inventory() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [historyItem, setHistoryItem] = useState<any>(null);
    const [authReady, setAuthReady] = useState(false);
    const [authUser, setAuthUser] = useState<User | null>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    const { t } = useLanguage();

    const fetchItems = useCallback(async () => {
        if (!authReady || !authUser) return;
        setLoading(true);
        try {
            const res = await fetchWithAuth(`/api/inventory/items?page=${page}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || (Array.isArray(data) ? data : []));
            }
        } catch (err) {
            console.error("Failed to fetch inventory items:", err);
        } finally {
            setLoading(false);
        }
    }, [authReady, authUser, page]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    if (!authReady) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="animate-spin text-[var(--accent)]" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20 max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div>
                    <h1 className="text-4xl font-black text-[var(--ink)] tracking-tight uppercase">Registry & Flux</h1>
                    <p className="text-[var(--ink-soft)] mt-2 font-medium italic">Monitor stock lifecycle and global distribution vectors</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="opengate-button-primary h-14 px-8 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
                >
                    <Plus size={20} /> Provision Material
                </button>
            </div>

            {/* Quick Action Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <InventoryAction
                    title="Liquidate"
                    sub="Outbound Flow"
                    icon={<TrendingDown size={24} />}
                    color="bg-[#102642]"
                    onClick={() => setShowSaleModal(true)}
                />
                <InventoryAction
                    title="Transfer"
                    sub="Cross-Node Move"
                    icon={<ArrowRightLeft size={24} />}
                    color="bg-indigo-600"
                    onClick={() => setShowTransferModal(true)}
                />
                <InventoryAction
                    title="Audit"
                    sub="Manual Synthesis"
                    icon={<ClipboardList size={24} />}
                    color="bg-[var(--accent)]"
                    onClick={() => setShowReconcileModal(true)}
                />
                <InventoryAction
                    title="Analytics"
                    sub="Intelligence Layer"
                    icon={<BarChart3 size={24} />}
                    color="bg-emerald-600"
                    onClick={() => setShowAnalyticsModal(true)}
                />
            </div>

            {/* Main Ledger Card */}
            <div className="enterprise-card border border-[var(--ink-thin)] bg-white p-0 overflow-hidden shadow-sm">
                <div className="p-8 border-b border-[var(--ink-thin)] bg-[var(--bg)]/30 flex flex-col lg:flex-row gap-6">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-thin)] group-focus-within:text-[var(--accent)] transition-colors" size={20} />
                        <input
                            placeholder="Query by SKU, Designation, or Protocol Segment..."
                            className="enterprise-input w-full h-12 pl-12 pr-4 text-sm font-bold"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button className="h-12 px-5 bg-white border border-[var(--ink-thin)] rounded-xl text-xs font-black uppercase tracking-widest text-[var(--ink-soft)] flex items-center gap-2 hover:bg-[var(--bg)] transition-all">
                            <Filter size={16} /> Filter
                        </button>
                        <button className="h-12 px-5 bg-white border border-[var(--ink-thin)] rounded-xl text-xs font-black uppercase tracking-widest text-[var(--ink-soft)] flex items-center gap-2 hover:bg-[var(--bg)] transition-all">
                            <Warehouse size={16} /> Global View
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full enterprise-table">
                        <thead className="bg-[var(--bg)]/10 text-[var(--ink-soft)]">
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] border-b border-[var(--ink-thin)]">
                                <th className="px-8 py-4 text-left">Manifest Item</th>
                                <th className="px-8 py-4 text-left">Classification</th>
                                <th className="px-8 py-4 text-right">Fluid Qty</th>
                                <th className="px-8 py-4 text-right">Avg Protocol Cost</th>
                                <th className="px-8 py-4 text-right">Net Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--bg-soft)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="animate-spin text-[var(--accent)]" size={48} />
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--ink-soft)] animate-pulse">Synchronizing Ledger...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-32 text-center text-[var(--ink-soft)] font-black uppercase tracking-[0.3em] opacity-30 italic">No materials found in registry</td>
                                </tr>
                            ) : items.map((item) => (
                                <InventoryRow key={item.id} item={item} onHistoryClick={setHistoryItem} />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-8 py-6 border-t border-[var(--ink-thin)] flex items-center justify-between bg-[var(--bg)]/20">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                        className="h-10 px-6 text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest disabled:opacity-30 hover:bg-white rounded-xl transition-all border border-[var(--ink-thin)] shadow-sm flex items-center gap-2"
                    >
                        Previous
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center text-xs font-black shadow-lg shadow-[var(--accent-thin)]">{page}</span>
                        <span className="text-[10px] font-black text-[var(--ink-thin)] uppercase tracking-widest">Active Index</span>
                    </div>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={items.length < 10 || loading}
                        className="h-10 px-6 text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest disabled:opacity-30 hover:bg-white rounded-xl transition-all border border-[var(--ink-thin)] shadow-sm flex items-center gap-2"
                    >
                        Next
                    </button>
                </div>
            </div>

            {showAddModal && <ItemForm onClose={() => setShowAddModal(false)} onSuccess={fetchItems} />}
            {showSaleModal && <SaleForm onClose={() => setShowSaleModal(false)} onSuccess={fetchItems} />}
            {showTransferModal && <TransferForm onClose={() => setShowTransferModal(false)} onSuccess={fetchItems} />}
            {showReconcileModal && <ReconciliationForm onClose={() => setShowReconcileModal(false)} onSuccess={fetchItems} />}
            {showAnalyticsModal && <InventoryAnalytics onClose={() => setShowAnalyticsModal(false)} />}

            {/* Stock History Modal */}
            {historyItem && (
                <HistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />
            )}
        </div>
    );
}

function HistoryModal({ item, onClose }: any) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth(`/api/inventory/history?item_id=${item.id}`)
            .then(res => res.json())
            .then(data => {
                const list = Array.isArray(data) ? data : (data.history || []);
                setHistory(list);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [item]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#102642]/60 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] w-full max-w-4xl h-[700px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-10 bg-[#102642] text-white flex justify-between items-center shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-20 opacity-10"><Database size={160} /></div>
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl group-hover:rotate-6 transition-transform">
                            <Box size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black tracking-tight">{item.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-[10px] font-black opacity-60 font-mono tracking-[0.2em] uppercase">{item.sku}</p>
                                <div className="w-1 h-1 rounded-full bg-white/30"></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">Temporal Log</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all flex items-center justify-center border border-white/10 relative z-10">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[var(--bg)]/50 sticky top-0 z-20">
                            <tr className="text-[10px] font-black uppercase text-[var(--ink-soft)] tracking-[0.2em] border-b border-[var(--ink-thin)]">
                                <th className="px-8 py-5">Sync Time</th>
                                <th className="px-8 py-5">Flux Vector</th>
                                <th className="px-8 py-5">Metadata / Log</th>
                                <th className="px-8 py-5 text-right">Delta</th>
                                <th className="px-8 py-5 text-right">Final Velocity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--bg-soft)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-soft)]">Accessing Archives...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-[var(--ink-soft)] font-black uppercase tracking-widest opacity-30 italic">No temporal records found for this entity</td>
                                </tr>
                            ) : history.map((h) => (
                                <tr key={h.id} className="group hover:bg-[var(--bg)]/30 transition-colors">
                                    <td className="px-8 py-5 text-[10px] font-black font-mono text-[var(--ink-soft)] uppercase tracking-tighter">
                                        {h.timestamp?.seconds ? new Date(h.timestamp.seconds * 1000).toLocaleString() : 'UNDEFINED'}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-sm ${Number(h.quantity) > 0 ? 'bg-[var(--success-thin)] text-[var(--success)]' : 'bg-[var(--danger-thin)] text-[var(--danger)]'
                                            }`}>
                                            {h.source_document_type || 'SYSTEM'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-xs font-black text-[var(--ink)] max-w-[240px] truncate italic" title={h.description || ''}>
                                        {h.description || 'System Log generated automatically.'}
                                    </td>
                                    <td className={`px-8 py-5 text-right font-mono text-sm font-black italic ${Number(h.quantity) > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                        {Number(h.quantity) > 0 ? '+' : ''}{Number(h.quantity)}
                                    </td>
                                    <td className="px-8 py-5 text-right text-xs text-[var(--ink-soft)] font-black font-mono tabular-nums opacity-60">
                                        {Number(h.valuation_rate).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 bg-[var(--bg)]/30 border-t border-[var(--ink-thin)] shrink-0 flex items-center justify-between">
                    <span className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Protocol Level 04</span>
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-[var(--success)]" />
                        <span className="text-[10px] font-black text-[var(--success)] uppercase tracking-widest">Integrity Verified</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
