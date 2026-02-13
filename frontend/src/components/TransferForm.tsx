"use client";

import { useState, useEffect } from "react";
import { X, ArrowRightLeft, Package, Warehouse } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

export default function TransferForm({ onClose, onSuccess }: any) {
    const [items, setItems] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState("");
    const [fromWh, setFromWh] = useState("");
    const [toWh, setToWh] = useState("");
    const [qty, setQty] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchWithAuth("/api/inventory/items").then(res => res.json()).then(data => {
            const list = data.items || (Array.isArray(data) ? data : []);
            setItems(list);
        });
        fetchWithAuth("/api/warehouses").then(res => res.json()).then(data => {
            const list = data.warehouses || (Array.isArray(data) ? data : []);
            setWarehouses(list);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await fetchWithAuth(`/api/inventory/transfer?from_wh=${fromWh}&to_wh=${toWh}&item_id=${selectedItem}&qty=${qty}`, {
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
                <div className="p-6 bg-[#0f172a] text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ArrowRightLeft className="text-blue-400" size={24} />
                        <div>
                            <h3 className="text-lg font-black">Stock Transfer / تحويل مخزني</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Movement between warehouses</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6" dir="rtl">
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
                                {items.map(it => <option key={it.id} value={it.id}>{it.name} ({Number(it.current_qty).toFixed(0)} available)</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-black text-slate-400 px-1 text-right">From / من مخزن</label>
                                <select
                                    required
                                    value={fromWh}
                                    onChange={(e) => setFromWh(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                                >
                                    <option value="">Source...</option>
                                    {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-black text-slate-400 px-1">To / إلى مخزن</label>
                                <select
                                    required
                                    value={toWh}
                                    onChange={(e) => setToWh(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                                >
                                    <option value="">Target...</option>
                                    {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black text-slate-400 px-1">Quantity / الكمية المحولة</label>
                            <input
                                type="number"
                                required
                                value={qty}
                                onChange={(e) => setQty(e.target.value)}
                                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-center text-lg"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
                    >
                        {loading ? "Processing..." : "Confirm Transfer / تأكيد التحويل"}
                    </button>
                </form>
            </div>
        </div>
    );
}
