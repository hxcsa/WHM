"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash2, Save, ShoppingCart, Calculator } from "lucide-react";

interface InvoiceLine {
    product_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount: number;
    total: number;
}

interface InvoiceFormProps {
    onClose: () => void;
    onSave: (data: any) => void;
}

export default function InvoiceForm({ onClose, onSave }: InvoiceFormProps) {
    const [formData, setFormData] = useState({
        customer_name: "",
        invoice_number: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        warehouse_name: "",
        notes: "",
        lines: [] as InvoiceLine[]
    });

    const [loading, setLoading] = useState(false);

    // Totals calculation
    const totals = useMemo(() => {
        const subtotal = formData.lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
        const discount_total = formData.lines.reduce((sum, line) => sum + line.discount, 0);
        const total = subtotal - discount_total;
        return { subtotal, discount_total, total };
    }, [formData.lines]);

    const addLine = () => {
        setFormData(prev => ({
            ...prev,
            lines: [...prev.lines, {
                product_id: "",
                description: "",
                quantity: 1,
                unit_price: 0,
                discount: 0,
                total: 0
            }]
        }));
    };

    const removeLine = (index: number) => {
        setFormData(prev => ({
            ...prev,
            lines: prev.lines.filter((_, i) => i !== index)
        }));
    };

    const updateLine = (index: number, field: keyof InvoiceLine, value: any) => {
        setFormData(prev => {
            const newLines = [...prev.lines];
            const line = { ...newLines[index], [field]: value };

            // Re-calculate line total
            if (field === 'quantity' || field === 'unit_price' || field === 'discount') {
                line.total = (line.quantity * line.unit_price) - line.discount;
            }

            newLines[index] = line;
            return { ...prev, lines: newLines };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const finalData = {
                ...formData,
                ...totals,
                paid_amount: 0,
                remaining_amount: totals.total
            };
            await onSave(finalData);
        } catch (error) {
            console.error("Save error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                            <ShoppingCart size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">New Invoice / فاتورة جديدة</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Create persistent financial document</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Invoice Number</label>
                            <input
                                required
                                value={formData.invoice_number}
                                onChange={e => setFormData({ ...formData, invoice_number: e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Customer Name / العميل</label>
                            <input
                                required
                                placeholder="Enter customer name..."
                                value={formData.customer_name}
                                onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Issue Date</label>
                            <input
                                type="date"
                                required
                                value={formData.issue_date}
                                onChange={e => setFormData({ ...formData, issue_date: e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Calculator size={18} className="text-emerald-500" />
                                Line Items / بنود الفاتورة
                            </h3>
                            <button
                                type="button"
                                onClick={addLine}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-100 transition-all uppercase tracking-wider"
                            >
                                <Plus size={16} /> Add Item
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.lines.map((line, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 group hover:border-emerald-200 transition-all">
                                    <div className="md:col-span-4 space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                                        <input
                                            required
                                            placeholder="Product description..."
                                            value={line.description}
                                            onChange={e => updateLine(index, 'description', e.target.value)}
                                            className="w-full bg-white border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Qty</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={line.quantity}
                                            onChange={e => updateLine(index, 'quantity', parseFloat(e.target.value))}
                                            className="w-full bg-white border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Price</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={line.unit_price}
                                            onChange={e => updateLine(index, 'unit_price', parseFloat(e.target.value))}
                                            className="w-full bg-white border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Discount</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={line.discount}
                                            onChange={e => updateLine(index, 'discount', parseFloat(e.target.value))}
                                            className="w-full bg-white border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700"
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex flex-col justify-end items-center pb-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total</span>
                                        <span className="text-xs font-black text-emerald-600">{line.total.toLocaleString()} IQD</span>
                                    </div>
                                    <div className="md:col-span-1 flex items-end pb-1">
                                        <button
                                            type="button"
                                            onClick={() => removeLine(index)}
                                            className="w-full h-10 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {formData.lines.length === 0 && (
                                <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                    <p className="text-slate-400 text-sm font-bold">No items added yet. Click 'Add Item' to start.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-3xl p-8 text-white grid grid-cols-1 md:grid-cols-2 gap-8 shadow-xl">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes / ملاحظات</label>
                            <textarea
                                rows={4}
                                placeholder="Additional terms or internal notes..."
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-medium text-slate-200 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-600"
                            />
                        </div>
                        <div className="flex flex-col justify-end space-y-3">
                            <div className="flex justify-between items-center text-slate-400">
                                <span className="text-xs font-black uppercase tracking-widest">Subtotal</span>
                                <span className="text-lg font-mono font-bold">{totals.subtotal.toLocaleString()} IQD</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400">
                                <span className="text-xs font-black uppercase tracking-widest">Discount Total</span>
                                <span className="text-lg font-mono font-bold">-{totals.discount_total.toLocaleString()} IQD</span>
                            </div>
                            <div className="h-px bg-slate-800 my-2" />
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-black uppercase tracking-widest text-emerald-400">Grand Total</span>
                                <span className="text-3xl font-black font-mono text-emerald-400">{totals.total.toLocaleString()} IQD</span>
                            </div>
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-4 rounded-2xl text-sm font-black text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-wider"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || formData.lines.length === 0}
                        className="px-8 py-4 bg-emerald-600 text-white rounded-2xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 font-black text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Processing..." : <><Save size={20} /> Save Invoice </>}
                    </button>
                </div>
            </div>
        </div>
    );
}
