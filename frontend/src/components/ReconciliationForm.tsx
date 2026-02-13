"use client";

import { useState, useEffect } from "react";
import { X, ClipboardList, Package, Info } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

export default function ReconciliationForm({ onClose, onSuccess }: any) {
    const [items, setItems] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState("");
    const [warehouse, setWarehouse] = useState("");
    const [qty, setQty] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchWithAuth("/api/inventory/items").then(res => res.json()).then(data => {
            setItems(data.items || (Array.isArray(data) ? data : []));
        });
        fetchWithAuth("/api/warehouses").then(res => res.json()).then(data => {
            setWarehouses(data.warehouses || (Array.isArray(data) ? data : []));
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await fetchWithAuth(`/api/inventory/adjust?item_id=${selectedItem}&warehouse_id=${warehouse}&qty=${qty}&reason=${encodeURIComponent(reason)}`, {
            method: "POST"
        });
        if (res.ok) {
            onSuccess();
            onClose();
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ClipboardList className="text-amber-400" size={24} />
                        <div>
                            <h3 className="text-lg font-black">Inventory Count / جرد مخزني</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Manual adjustment and reconciliation</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6" dir="rtl">
                    <div className="bg-amber-50 rounded-2xl p-4 flex gap-4 items-start border border-amber-100 mb-4">
                        <Info className="text-amber-600 shrink-0" size={18} />
                        <p className="text-xs text-amber-800 font-medium leading-relaxed">
                            Use this form for physical counts. Positve numbers add to stock, negative numbers reduce stock (loss/damage).
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black text-slate-400 px-1">Item / المادة</label>
                            <select
                                required
                                value={selectedItem}
                                onChange={(e) => setSelectedItem(e.target.value)}
                                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                            >
                                <option value="">Select Item...</option>
                                {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black text-slate-400 px-1">Warehouse / المخزن</label>
                            <select
                                required
                                value={warehouse}
                                onChange={(e) => setWarehouse(e.target.value)}
                                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                            >
                                <option value="">Select Warehouse...</option>
                                {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-black text-slate-400 px-1">Adjustment / الكمية (+/-)</label>
                                <input
                                    type="number"
                                    required
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-center text-lg"
                                    placeholder="e.g. -5 for loss"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-black text-slate-400 px-1">Reason / السبب</label>
                                <input
                                    required
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                                    placeholder="Found / Missing / Damage"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-slate-800 text-white rounded-xl font-black hover:bg-slate-900 transition-all shadow-xl shadow-slate-500/20 disabled:opacity-50"
                    >
                        {loading ? "Saving..." : "Process Adjustment / معالجة الجرد"}
                    </button>
                </form>
            </div>
        </div>
    );
}
