"use client";

import { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, Truck, Building2, DollarSign } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface PurchaseOrderFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function PurchaseOrderForm({ onClose, onSuccess }: PurchaseOrderFormProps) {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        supplier_name: "",
        supplier_account_id: "",
        currency: "IQD",
        notes: "",
        lines: [{ item_id: "", item_name: "", quantity: "10", unit_cost: "0" }]
    });

    useEffect(() => {
        fetchWithAuth("/api/inventory/items").then(res => res.json()).then(data => {
            const list = data.items || (Array.isArray(data) ? data : []);
            setItems(list);
        });
    }, []);

    const addLine = () => {
        setFormData({
            ...formData,
            lines: [...formData.lines, { item_id: "", item_name: "", quantity: "10", unit_cost: "0" }]
        });
    };

    const removeLine = (index: number) => {
        if (formData.lines.length <= 1) return;
        setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== index) });
    };

    const updateLine = (index: number, field: string, value: string) => {
        const newLines = [...formData.lines];
        (newLines[index] as any)[field] = value;
        if (field === "item_id") {
            const item = items.find((i: any) => i.id === value);
            if (item) newLines[index].item_name = item.name;
        }
        setFormData({ ...formData, lines: newLines });
    };

    const calculateTotal = () => {
        return formData.lines.reduce((sum, line) => {
            return sum + (Number(line.quantity) * Number(line.unit_cost));
        }, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                total: calculateTotal()
            };
            const res = await fetchWithAuth("/api/purchase-orders", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert("Failed to create purchase order");
            }
        } catch (err) {
            alert("Connection error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-200">
                <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Truck size={24} />
                        <div>
                            <h3 className="text-lg font-bold">New Purchase Order / طلب شراء جديد</h3>
                            <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Supplier Order</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-[#f8fafc]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Building2 size={14} /> Supplier Name / المورد
                            </label>
                            <input
                                required
                                className="form-input"
                                placeholder="e.g., Al-Noor Supplies"
                                value={formData.supplier_name}
                                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase">Supplier Account ID</label>
                            <input
                                className="form-input"
                                placeholder="e.g., 21"
                                value={formData.supplier_account_id}
                                onChange={(e) => setFormData({ ...formData, supplier_account_id: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <DollarSign size={14} /> Currency
                            </label>
                            <select
                                className="form-input"
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            >
                                <option value="IQD">IQD - Iraqi Dinar</option>
                                <option value="USD">USD - US Dollar</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Order Items / المواد المطلوبة</h4>
                            <button type="button" onClick={addLine} className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                                <Plus size={14} /> Add Item
                            </button>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                    <tr>
                                        <th className="p-3 text-right">Item</th>
                                        <th className="p-3 text-right">Qty</th>
                                        <th className="p-3 text-right">Unit Cost</th>
                                        <th className="p-3 text-right">Line Total</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.lines.map((line, idx) => (
                                        <tr key={idx} className="border-t border-slate-100">
                                            <td className="p-2">
                                                <select
                                                    required
                                                    className="w-full p-2 bg-slate-50 border-none rounded-lg font-bold outline-none"
                                                    value={line.item_id}
                                                    onChange={(e) => updateLine(idx, 'item_id', e.target.value)}
                                                >
                                                    <option value="">Select Item...</option>
                                                    {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    required
                                                    className="w-full p-2 bg-slate-50 border-none rounded-lg font-bold text-right outline-none"
                                                    value={line.quantity}
                                                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    required
                                                    className="w-full p-2 bg-indigo-50/50 border-none rounded-lg font-bold text-right outline-none text-indigo-700"
                                                    value={line.unit_cost}
                                                    onChange={(e) => updateLine(idx, 'unit_cost', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2 text-right font-mono font-black text-slate-700">
                                                {(Number(line.quantity) * Number(line.unit_cost)).toLocaleString()}
                                            </td>
                                            <td className="p-2 text-center">
                                                <button type="button" onClick={() => removeLine(idx)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-slate-900 rounded-xl text-white">
                        <span className="text-sm font-bold text-slate-400">Grand Total</span>
                        <span className="text-2xl font-black tabular-nums">{calculateTotal().toLocaleString()} {formData.currency}</span>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20"
                    >
                        <Save size={20} />
                        {loading ? "Saving..." : "Create Purchase Order / إنشاء طلب الشراء"}
                    </button>
                </form>
            </div>
        </div>
    );
}
