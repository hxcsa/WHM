"use client";

import { useState } from "react";
import { X, Save, Package, Hash, Weight, Calculator, Building2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface ItemFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function ItemForm({ onClose, onSuccess }: ItemFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        unit: "PCS",
        category: "",
        inventory_account_id: "",
        description: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/inventory/items", {
                method: "POST",
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert("Failed to create item");
            }
        } catch (err) {
            console.error(err);
            alert("Error connection to API");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 bg-[#0f172a] text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Package size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">New Item / مادة جديدة</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Inventory Management</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-[#f8fafc]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Package size={14} /> Item Name / اسم المادة
                            </label>
                            <input
                                required
                                className="form-input font-bold"
                                placeholder="Ex: MacBook Pro M3"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Hash size={14} /> SKU / الرمز
                            </label>
                            <input
                                required
                                className="form-input font-mono"
                                placeholder="SKU-001"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Weight size={14} /> Unit / الوحدة
                            </label>
                            <select
                                className="form-input font-bold"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            >
                                <option value="PCS">Pieces / قطعة</option>
                                <option value="KG">Kilograms / كغم</option>
                                <option value="LTR">Liters / لتر</option>
                                <option value="BOX">Box / صندوق</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Calculator size={14} /> Inventory Account / الحساب المخزني
                            </label>
                            <input
                                required
                                className="form-input font-bold"
                                placeholder="Account Code"
                                value={formData.inventory_account_id}
                                onChange={(e) => setFormData({ ...formData, inventory_account_id: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                            <Building2 size={14} /> Category / الصنف
                        </label>
                        <input
                            className="form-input"
                            placeholder="Ex: Electronics"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                            Description / الوصف
                        </label>
                        <textarea
                            className="form-input h-24"
                            placeholder="Additional details..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                        >
                            <Save size={20} />
                            {loading ? "Creating..." : "Save Item / حفظ المادة"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
