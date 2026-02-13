"use client";

import { useEffect, useState } from "react";
import { X, BarChart3, TrendingUp, Package, DollarSign, Activity, ChevronRight, ShieldCheck, Box, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchWithAuth } from "@/lib/api";

interface InventoryAnalyticsProps {
    onClose: () => void;
}

export default function InventoryAnalytics({ onClose }: InventoryAnalyticsProps) {
    const [stats, setStats] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    useEffect(() => {
        Promise.all([
            fetchWithAuth("/api/reports/inventory-valuation").then(res => res.json()),
            fetchWithAuth("/api/inventory/items").then(res => res.json())
        ]).then(([valuation, inventory]) => {
            setStats(valuation);
            setItems(inventory);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const totalValue = Number(stats?.total_inventory_value || 0);
    const lowStockCount = items.filter(i => Number(i.current_qty) < 10).length;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#102642]/60 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-10 bg-[#102642] text-white flex justify-between items-center shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-20 opacity-10"><BarChart3 size={160} /></div>
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl group-hover:rotate-6 transition-transform">
                            <Activity size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black tracking-tight">{t("inventoryAnalytics") || "Intelligence Hub"}</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em]">Stock Health & Asset Valuation</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all flex items-center justify-center border border-white/10 relative z-10">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-[var(--bg)]/10 p-10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--ink-soft)] font-black uppercase tracking-[0.3em] animate-pulse">
                            <Loader2 className="animate-spin text-[var(--accent)]" size={48} />
                            Synthesis in Progress...
                        </div>
                    ) : (
                        <div className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <StatCard
                                    label={t("totalStockValue") || "Total Liquidity"}
                                    value={`${totalValue.toLocaleString()} IQD`}
                                    icon={<DollarSign className="text-[var(--accent)]" />}
                                    sub="Current Asset Valuation"
                                />
                                <StatCard
                                    label={t("itemsCount") || "Node Population"}
                                    value={items.length.toString()}
                                    icon={<Package className="text-indigo-600" />}
                                    sub="Total Identified SKUs"
                                />
                                <StatCard
                                    label="Critical Thresholds"
                                    value={lowStockCount.toString()}
                                    icon={<Activity className="text-[var(--danger)]" />}
                                    sub="Anomalous Stock Levels"
                                    isWarning={lowStockCount > 0}
                                />
                            </div>

                            <div className="enterprise-card bg-white p-10 border border-[var(--ink-thin)] shadow-sm">
                                <div className="flex items-center justify-between mb-10">
                                    <h4 className="text-sm font-black text-[var(--ink)] uppercase tracking-[0.2em] flex items-center gap-3">
                                        <TrendingUp size={20} className="text-[var(--accent)]" />
                                        Temporal Flux Analysis
                                    </h4>
                                    <span className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest bg-[var(--bg)]/50 px-3 py-1.5 rounded-lg border border-[var(--ink-thin)]">Metric: 15-Day Cycle</span>
                                </div>
                                <div className="h-48 flex items-end gap-3 px-2">
                                    {[35, 45, 30, 60, 85, 40, 55, 75, 45, 90].map((h, i) => (
                                        <div key={i} className="flex-1 group relative">
                                            <div
                                                className={`w-full bg-[var(--bg)] group-hover:bg-[var(--accent)] transition-all rounded-t-xl shadow-lg shadow-black/[0.02]`}
                                                style={{ height: `${h}%` }}
                                            ></div>
                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[var(--ink)] text-white text-[10px] font-black py-2 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-xl transform group-hover:-translate-y-2">
                                                {h}% Shift
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between mt-8 text-[10px] font-black text-[var(--ink-thin)] uppercase tracking-[0.3em]">
                                    <span>T-Minus 14 Days</span>
                                    <span>Mid-Cycle Sync</span>
                                    <span className="text-[var(--accent)]">Live Protocol</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="enterprise-card bg-white p-8 border border-[var(--ink-thin)] shadow-sm">
                                    <h4 className="text-[10px] font-black text-[var(--ink-soft)] mb-8 tracking-[0.2em] uppercase flex items-center justify-between">
                                        High-Velocity Assets
                                        <ExternalLink size={14} className="text-[var(--ink-thin)]" />
                                    </h4>
                                    <div className="space-y-6">
                                        {items.sort((a, b) => b.total_value - a.total_value).slice(0, 5).map((item, idx) => (
                                            <div key={item.id} className="flex justify-between items-center text-sm group">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-[var(--ink-thin)] w-4 italic">{idx + 1}.</span>
                                                    <span className="font-black text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors tracking-tight">{item.name}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="font-black font-mono text-[var(--ink)]">{Number(item.total_value).toLocaleString()}</span>
                                                    <span className="text-[8px] font-black text-[var(--ink-thin)] uppercase tracking-widest">IQD Manifest</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="enterprise-card bg-[#102642] text-white p-8 border-none shadow-2xl relative overflow-hidden flex flex-col justify-between">
                                    <div className="absolute -left-10 -bottom-10 p-20 opacity-[0.05] rotate-12"><ShieldCheck size={200} /></div>
                                    <div>
                                        <h4 className="text-[10px] font-black text-white/40 mb-6 tracking-[0.3em] uppercase">Intelligence Brief</h4>
                                        <p className="text-lg leading-snug text-white font-medium italic relative z-10">
                                            "Operational equilibrium detected within {items.length} nodes.
                                            {lowStockCount > 10 ? " Proactive restock required for critical thresholds." : " Flow velocity remains within standard deviations."}"
                                        </p>
                                    </div>
                                    <div className="mt-10 pt-8 border-t border-white/10 flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/50">SEC-LEVEL: PROTOCOL-04</span>
                                        </div>
                                        <button className="h-10 px-6 bg-[var(--accent)] text-[#102642] rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--accent-thin)] active:scale-95 transition-all">
                                            Export Dossier
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, sub, isWarning }: any) {
    return (
        <div className={`enterprise-card p-8 border-none shadow-lg transition-all hover:scale-[1.03] ${isWarning ? 'bg-rose-600 text-white' : 'bg-white'}`}>
            <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isWarning ? 'bg-white/10 border-white/20 text-white' : 'bg-[var(--bg)] border-[var(--ink-thin)]'}`}>
                    {icon}
                </div>
                {isWarning && (
                    <div className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full border border-white/30 backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                        <span className="text-[8px] font-black text-white uppercase tracking-tighter">ANOMALY</span>
                    </div>
                )}
            </div>
            <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.15em] mb-2 ${isWarning ? 'text-white/60' : 'text-[var(--ink-soft)]'}`}>{label}</p>
                <h4 className={`text-2xl font-black tracking-tighter leading-none mb-3 ${isWarning ? 'text-white' : 'text-[var(--ink)]'}`}>{value}</h4>
                <p className={`text-[10px] font-bold italic ${isWarning ? 'text-white/50' : 'text-[var(--ink-thin)]'}`}>{sub}</p>
            </div>
        </div>
    );
}

const Loader2 = ({ className, size }: any) => <Activity className={className} size={size} />;
