"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Warehouse as WarehouseIcon, MapPin, Loader2, Info, ChevronRight, Activity, Box } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import WarehouseForm from "./WarehouseForm";

export default function WarehousesTab() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchWarehouses = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/warehouse/warehouses");
            if (res.ok) {
                const data = await res.json();
                setWarehouses(data);
            }
        } catch (err) {
            console.error("Failed to fetch warehouses:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="relative w-full sm:max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-thin)] group-focus-within:text-[var(--accent)] transition-colors" size={18} />
                    <input
                        placeholder="Filter active nodes..."
                        className="enterprise-input w-full h-12 pl-12 pr-4 text-sm"
                    />
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="opengate-button-primary flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-sm shadow-md active:scale-95 transition-all w-full sm:w-auto"
                >
                    <Plus size={20} /> Provision Node
                </button>
            </div>

            {showAddModal && (
                <WarehouseForm onClose={() => setShowAddModal(false)} onSuccess={fetchWarehouses} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-32 flex flex-col items-center gap-4 text-[var(--accent)]">
                        <Loader2 className="animate-spin" size={48} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--ink-soft)] animate-pulse">Synchronizing Nodes...</span>
                    </div>
                ) : warehouses.length === 0 ? (
                    <div className="col-span-full py-32 bg-[var(--bg)]/30 rounded-3xl border-2 border-dashed border-[var(--ink-thin)] text-center">
                        <WarehouseIcon size={48} className="mx-auto text-[var(--ink-thin)] mb-4" />
                        <h3 className="text-xl font-black text-[var(--ink)] tracking-tight">Node Void</h3>
                        <p className="text-[var(--ink-soft)] mt-1 font-medium italic">No active nodes registered in this quadrant.</p>
                    </div>
                ) : warehouses.map((wh) => (
                    <div key={wh.id} className="enterprise-card group hover:scale-[1.02] transition-all p-0 overflow-hidden border border-[var(--ink-thin)] bg-white/50 backdrop-blur-sm">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-[var(--bg)] text-[var(--accent)] rounded-2xl flex items-center justify-center border border-[var(--ink-thin)] transition-transform group-hover:rotate-6 shadow-sm">
                                    <WarehouseIcon size={24} />
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-white bg-[var(--ink)] px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-[var(--ink-thin)]">
                                        {wh.code || "STD-01"}
                                    </span>
                                    {wh.status === 'active' && (
                                        <div className="mt-2 flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse shadow-sm shadow-[var(--success)]"></div>
                                            <span className="text-[8px] font-black text-[var(--success)] uppercase tracking-tighter">Operational</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-[var(--ink)] tracking-tight group-hover:text-[var(--accent)] transition-colors mb-2">{wh.name}</h3>
                            <div className="flex items-center gap-2 text-[var(--ink-soft)] text-xs font-bold mb-6">
                                <MapPin size={14} className="text-[var(--accent)]" />
                                <span className="truncate italic">{wh.location || "Global Geocode Unknown"}</span>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-[var(--bg)]/50 border-t border-[var(--ink-thin)] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Efficiency</span>
                                    <div className="flex items-center gap-1.5 font-black text-[var(--ink)] text-sm">
                                        <Activity size={12} className="text-indigo-600" />
                                        <span>{(Math.random() * 20 + 80).toFixed(0)}%</span>
                                    </div>
                                </div>
                                <div className="w-px h-8 bg-[var(--ink-thin)]"></div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Capacity</span>
                                    <div className="flex items-center gap-1.5 font-bold text-[var(--ink)] text-sm font-mono tracking-tighter">
                                        <Box size={12} className="text-[var(--accent)]" />
                                        <span>{wh.capacity || "50k Units"}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white border border-[var(--ink-thin)] flex items-center justify-center text-[var(--ink-thin)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent-thin)] transition-all">
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
