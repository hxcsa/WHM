"use client";

import { useState } from "react";
import { X, Save, Ruler, Hash, AlignLeft } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface UOMFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function UOMForm({ onClose, onSuccess }: UOMFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/warehouse/uoms", {
                method: "POST",
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert("Failed to create UOM");
            }
        } catch (err) {
            console.error(err);
            alert("Error connecting to API");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 p-2 rounded-lg">
                            <Ruler size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">New UOM / وحدة جديدة</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Warehouse Management</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <AlignLeft size={14} /> Name / الاسم
                            </label>
                            <input
                                required
                                className="form-input w-full font-bold"
                                placeholder="Ex: Kilogram"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Hash size={14} /> Symbol (Code) / الرمز
                            </label>
                            <input
                                required
                                className="form-input w-full font-mono"
                                placeholder="Ex: KG"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                Description / الوصف
                            </label>
                            <input
                                className="form-input w-full"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg"
                        >
                            <Save size={20} />
                            {loading ? "Saving..." : "Save UOM / حفظ الوحدة"}
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
