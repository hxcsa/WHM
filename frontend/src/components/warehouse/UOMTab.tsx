"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Ruler, Info } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { Loader2 } from "lucide-react";
import UOMForm from "./UOMForm";

export default function UOMTab() {
    const [uoms, setUoms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchUOMs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/warehouse/uoms");
            if (res.ok) {
                const data = await res.json();
                setUoms(data);
            }
        } catch (err) {
            console.error("Failed to fetch UOMs:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUOMs();
    }, [fetchUOMs]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black text-slate-800">Units of Measure / وحدات القياس</h3>
                    <p className="text-slate-500 text-xs">Standardized units for product measurement</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-black text-sm"
                >
                    <Plus size={20} /> Add New UOM / إضافة وحدة
                </button>
            </div>

            {showAddModal && (
                <UOMForm onClose={() => setShowAddModal(false)} onSuccess={fetchUOMs} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center gap-2 text-primary font-bold">
                        <Loader2 className="animate-spin" size={32} />
                        <span>Loading Units...</span>
                    </div>
                ) : uoms.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-slate-400 font-bold">No measurement units found.</div>
                ) : uoms.map((uom) => (
                    <div key={uom.id} className="enterprise-card p-5 flex items-center justify-between group hover:scale-[1.02] transition-all bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                                <Ruler size={22} />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 leading-tight">{uom.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{uom.code}</p>
                            </div>
                        </div>
                        <button className="text-slate-300 hover:text-slate-600 transition-colors">
                            <Info size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
