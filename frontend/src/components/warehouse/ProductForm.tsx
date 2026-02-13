"use client";

import { useState, useEffect } from "react";
import { X, Save, Package, Hash, Barcode, Thermometer } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface ProductFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function ProductForm({ onClose, onSuccess }: ProductFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        barcode: "",
        production_date: "",
        expiry_date: "",
        cost_price: "",
        selling_price: "",
        initial_quantity: "",
        description: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Convert strings to numbers where appropriate
            const payload = {
                ...formData,
                cost_price: parseFloat(formData.cost_price) || 0,
                selling_price: parseFloat(formData.selling_price) || 0,
                initial_quantity: parseFloat(formData.initial_quantity) || 0,
            };

            const res = await fetchWithAuth("/api/warehouse/products", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const err = await res.json();
                alert(`Failed to create product: ${err.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert("Error connecting to API");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="bg-primary/20 p-3 rounded-2xl ring-1 ring-primary/30 backdrop-blur-md">
                            <Package size={24} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black tracking-tight font-heading">New Product</h3>
                            <p className="text-sm text-slate-400 font-medium">Add a new item to inventory</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors relative z-10">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Basic Info */}
                        <div className="space-y-2 lg:col-span-2">
                            <label className="form-label flex items-center gap-2">
                                <Package size={14} className="text-primary" /> Product Name / اسم المنتج
                            </label>
                            <input
                                required
                                className="form-input text-lg font-bold"
                                placeholder="e.g. Premium Widget X200"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="form-label flex items-center gap-2">
                                <Hash size={14} className="text-primary" /> Sku / الكود
                            </label>
                            <input
                                required
                                className="form-input font-mono uppercase tracking-wider"
                                placeholder="WID-X200"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="form-label flex items-center gap-2">
                                <Barcode size={14} className="text-primary" /> Barcode / الباركود
                            </label>
                            <input
                                className="form-input font-mono"
                                placeholder="Scan barcode..."
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                            />
                        </div>

                        {/* Dates */}
                        <div className="space-y-2">
                            <label className="form-label">Production Date / تاريخ الإنتاج</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.production_date}
                                onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="form-label">Expiry Date / تاريخ الانتهاء</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.expiry_date}
                                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                            />
                        </div>

                        {/* Pricing & Stock */}
                        <div className="space-y-2">
                            <label className="form-label text-emerald-600">Cost Price / سعر التكلفة</label>
                            <div className="relative">
                                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    className="form-input ps-8 font-mono text-emerald-700 font-bold"
                                    placeholder="0.00"
                                    value={formData.cost_price}
                                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="form-label text-blue-600">Selling Price / سعر البيع</label>
                            <div className="relative">
                                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    className="form-input ps-8 font-mono text-blue-700 font-bold"
                                    placeholder="0.00"
                                    value={formData.selling_price}
                                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="form-label">Initial Stock / الكمية الأولية</label>
                            <input
                                type="number"
                                min="0"
                                className="form-input font-bold"
                                placeholder="0"
                                value={formData.initial_quantity}
                                onChange={(e) => setFormData({ ...formData, initial_quantity: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-6 flex gap-4 border-t border-slate-200">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 btn-primary flex items-center justify-center gap-3 text-lg"
                        >
                            {loading ? (
                                <span className="animate-spin text-2xl">⟳</span>
                            ) : (
                                <>
                                    <Save size={20} />
                                    <span>Save Product / حفظ المنتج</span>
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
