"use client";

import { useState, useEffect } from "react";
import { X, Save, Warehouse, Hash, MapPin, Inbox } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface WarehouseFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function WarehouseForm({ onClose, onSuccess }: WarehouseFormProps) {
    const [loading, setLoading] = useState(false);
    const [uoms, setUoms] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        capacity_value: "",
        capacity_unit: "PLT", // Default
        location: ""
    });

    useEffect(() => {
        fetchWithAuth("/api/warehouse/uoms")
            .then(res => res.json())
            .then(data => setUoms(data))
            .catch(err => console.error("Failed to fetch UOMs", err));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Combine capacity value and unit
            const finalData = {
                ...formData,
                capacity: `${formData.capacity_value} ${formData.capacity_unit}`
            };

            const res = await fetchWithAuth("/api/warehouse/warehouses", {
                method: "POST",
                body: JSON.stringify(finalData),
            });
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert("Failed to create warehouse");
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
                <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-500 p-2 rounded-lg">
                            <Warehouse size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">New Warehouse / مخزن جديد</h3>
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
                                <Warehouse size={14} /> Name / اسم المخزن
                            </label>
                            <input
                                required
                                className="form-input w-full font-bold"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                    <Hash size={14} /> Code / الكود
                                </label>
                                <input
                                    required
                                    className="form-input w-full font-mono"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                    <Inbox size={14} /> Capacity / السعة
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        className="form-input flex-1 min-w-0"
                                        placeholder="Qty"
                                        type="number"
                                        value={formData.capacity_value}
                                        onChange={(e) => setFormData({ ...formData, capacity_value: e.target.value })}
                                    />
                                    <select
                                        className="form-input w-24 font-bold"
                                        value={formData.capacity_unit}
                                        onChange={(e) => setFormData({ ...formData, capacity_unit: e.target.value })}
                                    >
                                        {uoms.length > 0 ? (
                                            uoms.map((u) => (
                                                <option key={u.id} value={u.code}>
                                                    {u.code}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="PLT">...</option>
                                        )}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <MapPin size={14} /> Location / الموقع
                            </label>
                            <input
                                className="form-input w-full"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg"
                        >
                            <Save size={20} />
                            {loading ? "Saving..." : "Save Warehouse / حفظ المخزن"}
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
