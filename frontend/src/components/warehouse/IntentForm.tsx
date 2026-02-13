"use client";

import { useState, useEffect } from "react";
import {
    X, Save, Package, Truck, User,
    Calendar, ChevronRight, ChevronLeft,
    Hash, Phone, Car, MessageSquare, Plus, Trash2
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface IntentFormProps {
    onClose: () => void;
    onSuccess: () => void;
    customers: any[];
}

export default function IntentForm({ onClose, onSuccess, customers }: IntentFormProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]);

    // Form Data
    const [formData, setFormData] = useState({
        number: `INT-${Math.floor(Math.random() * 9000) + 1000}`,
        client_id: "",
        type: "get", // give or get
        eta: "",
        driver_name: "",
        driver_phone: "",
        delivery_guy: "",
        car_number: "",
        notes: "",
        items: [] as any[]
    });

    // Step 3 state
    const [selectedItem, setSelectedItem] = useState("");
    const [itemQty, setItemQty] = useState("1");
    const [itemNote, setItemNote] = useState("");
    const [currentStock, setCurrentStock] = useState<number | null>(null);
    const [loadingStock, setLoadingStock] = useState(false);

    // Load products when client changes
    useEffect(() => {
        if (formData.client_id) {
            fetchWithAuth(`/api/warehouse/products?customer_id=${formData.client_id}`)
                .then(res => res.json())
                .then(data => setProducts(data))
                .catch(err => console.error("Error fetching items", err));
        }
    }, [formData.client_id]);

    useEffect(() => {
        if (selectedItem) {
            setLoadingStock(true);
            fetchWithAuth(`/api/warehouse/ops/stock?item_id=${selectedItem}`)
                .then(res => res.json())
                .then(data => setCurrentStock(data.balance))
                .catch(err => console.error("Error fetching stock", err))
                .finally(() => setLoadingStock(false));
        } else {
            setCurrentStock(null);
        }
    }, [selectedItem]);

    const handleAddItem = () => {
        if (!selectedItem) return;
        const product = products.find((p: any) => p.id === selectedItem);
        const newItem = {
            item_id: selectedItem,
            name: product?.name || "Unknown",
            sku: product?.sku,
            quantity: itemQty,
            note: itemNote
        };
        setFormData({ ...formData, items: [...formData.items, newItem] });
        setSelectedItem("");
        setItemQty("1");
        setItemNote("");
        setCurrentStock(null);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async () => {
        console.log("IntentForm: Submit initiated");

        if (formData.items.length === 0) {
            alert("Please add at least one product before submitting.");
            return;
        }

        setLoading(true);
        try {
            // Safer date parsing
            let etaISO = null;
            if (formData.eta) {
                const d = new Date(formData.eta);
                if (!isNaN(d.getTime())) {
                    etaISO = d.toISOString();
                } else {
                    console.warn("Invalid ETA date:", formData.eta);
                }
            }

            const payload = {
                ...formData,
                eta: etaISO
            };

            console.log("IntentForm: Sending payload", payload);

            const res = await fetchWithAuth("/api/warehouse/intents", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            console.log("IntentForm: Response status", res.status);

            if (res.ok) {
                onSuccess();
            } else {
                const err = await res.json();
                console.error("IntentForm: Error response", err);
                alert(`Error: ${err.detail || 'Failed to create intent'}`);
            }
        } catch (err) {
            console.error("IntentForm: Exception", err);
            alert("Connection error: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, label: "Basic Info / معلومات أساسية", icon: Calendar },
        { id: 2, label: "Logistics / البيانات اللوجستية", icon: Truck },
        { id: 3, label: "Products / المنتجات", icon: Package },
        { id: 4, label: "Finalize / إنهاء", icon: Save },
    ];

    const handleNext = () => {
        if (step === 3 && selectedItem) {
            // Auto-add item if user tries to proceed without clicking "Add"
            const product = products.find((p: any) => p.id === selectedItem);
            const newItem = {
                item_id: selectedItem,
                name: product?.name || "Unknown",
                sku: product?.sku,
                quantity: itemQty,
                note: itemNote
            };
            setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
            setSelectedItem("");
            setItemQty("1");
            setItemNote("");
            setCurrentStock(null);
        }
        setStep(step + 1);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 bg-slate-800 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-2.5 rounded-xl border border-white/20">
                            <Truck size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight">New Intent / طلب جديد</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Step {step} of 4: {steps[step - 1].label}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Stepper Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between shrink-0">
                    {steps.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${step >= s.id ? 'bg-primary border-primary text-white scale-110' : 'bg-white border-slate-200 text-slate-400'
                                }`}>
                                {s.id}
                            </div>
                            {i < steps.length - 1 && <div className={`w-8 h-0.5 ${step > s.id ? 'bg-primary' : 'bg-slate-200'}`} />}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto grow">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                                        <Hash size={14} className="text-primary" /> Request Number / رقم الطلب
                                    </label>
                                    <input
                                        readOnly
                                        className="form-input w-full bg-slate-50 font-mono font-bold border-dashed"
                                        value={formData.number}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                                        Type / النوع
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setFormData({ ...formData, type: "get" })}
                                            className={`flex-1 py-2.5 rounded-xl font-bold transition-all border ${formData.type === 'get' ? 'bg-teal-500 text-white border-teal-600' : 'bg-white text-slate-400 border-slate-200'}`}
                                        >
                                            Get (Receive) / استلام
                                        </button>
                                        <button
                                            onClick={() => setFormData({ ...formData, type: "give" })}
                                            className={`flex-1 py-2.5 rounded-xl font-bold transition-all border ${formData.type === 'give' ? 'bg-rose-500 text-white border-rose-600' : 'bg-white text-slate-400 border-slate-200'}`}
                                        >
                                            Give / صرف
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                                    <User size={14} className="text-primary" /> Select Client / اختر الزبون
                                </label>
                                <select
                                    className="form-input w-full font-bold"
                                    value={formData.client_id}
                                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                >
                                    <option value="">- Select -</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.company_name || `${c.first_name} ${c.last_name}`}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                                    <Calendar size={14} className="text-primary" /> Expected Arrival (ETA)
                                </label>
                                <input
                                    type="datetime-local"
                                    className="form-input w-full font-bold"
                                    value={formData.eta}
                                    onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                                    <User size={14} className="text-primary" /> Driver Name / اسم السائق
                                </label>
                                <input
                                    className="form-input w-full font-bold"
                                    value={formData.driver_name}
                                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                                    <Phone size={14} className="text-primary" /> Driver Phone / رقم السائق
                                </label>
                                <input
                                    className="form-input w-full font-mono"
                                    value={formData.driver_phone}
                                    onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                                    <Car size={14} className="text-primary" /> Car Number / رقم السيارة
                                </label>
                                <input
                                    className="form-input w-full font-bold"
                                    placeholder="Ex: 50402 - Bag"
                                    value={formData.car_number}
                                    onChange={(e) => setFormData({ ...formData, car_number: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                                    <User size={14} className="text-primary" /> Delivery Guy / المندوب
                                </label>
                                <input
                                    className="form-input w-full font-bold"
                                    value={formData.delivery_guy}
                                    onChange={(e) => setFormData({ ...formData, delivery_guy: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-2xl space-y-4 border border-slate-200 shadow-inner">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Product</p>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                    <div className="md:col-span-6">
                                        <select
                                            className="form-input w-full font-bold text-sm"
                                            value={selectedItem}
                                            onChange={(e) => setSelectedItem(e.target.value)}
                                        >
                                            <option value="">- Choose Item -</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                            ))}
                                        </select>
                                        {selectedItem && (
                                            <div className="mt-1 px-1 flex justify-between items-center">
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                                                    {loadingStock ? "Checking stock..." : `Available: ${currentStock ?? 0} units`}
                                                </p>
                                                {formData.type === 'give' && currentStock !== null && parseFloat(itemQty) > currentStock && (
                                                    <p className="text-[9px] font-bold text-rose-500 animate-pulse">Insufficient Stock! / نقص في المخزون</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-3">
                                        <input
                                            type="number"
                                            className="form-input w-full font-bold text-sm"
                                            placeholder="Qty"
                                            value={itemQty}
                                            onChange={(e) => setItemQty(e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <button
                                            onClick={handleAddItem}
                                            disabled={!selectedItem}
                                            className="w-full bg-primary text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:bg-slate-200 shadow-md"
                                        >
                                            <Plus size={16} /> Add
                                        </button>
                                    </div>
                                    <div className="md:col-span-12">
                                        <input
                                            className="form-input w-full text-xs"
                                            placeholder="Note / ملاحظة للمنتج"
                                            value={itemNote}
                                            onChange={(e) => setItemNote(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {formData.items.map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm group">
                                        <div className="bg-primary/5 p-2 rounded-lg text-primary">
                                            <Package size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-black text-slate-800 text-sm">{item.name}</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.sku} • {item.note || 'No note'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-primary text-lg">x{item.quantity}</p>
                                        </div>
                                        <button onClick={() => handleRemoveItem(i)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                                    <MessageSquare size={14} className="text-primary" /> Overall Notes / ملاحظات عامة
                                </label>
                                <textarea
                                    className="form-input w-full min-h-[120px] font-medium"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Add any extra information about this request..."
                                />
                            </div>

                            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
                                <h4 className="text-primary font-black uppercase text-xs tracking-widest mb-4">Summary</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between font-bold">
                                        <span className="text-slate-500">Number</span>
                                        <span className="text-slate-800">#{formData.number}</span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                        <span className="text-slate-500">Client</span>
                                        <span className="text-slate-800">
                                            {customers.find((c: any) => c.id === formData.client_id)?.company_name || 'Not Selected'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                        <span className="text-slate-500">Total Items</span>
                                        <span className="text-slate-800">{formData.items.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-50"
                        >
                            <ChevronLeft size={20} /> Back
                        </button>
                    )}
                    <div className="flex-1" />
                    {step < 4 ? (
                        <button
                            disabled={step === 1 && !formData.client_id}
                            onClick={handleNext}
                            className="bg-primary text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-primary/90 disabled:bg-slate-200 transition-all shadow-lg"
                        >
                            Next <ChevronRight size={20} />
                        </button>
                    ) : (
                        <button
                            disabled={loading}
                            onClick={handleSubmit}
                            className="bg-primary text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-primary/90 disabled:bg-slate-200 transition-all shadow-lg active:scale-95"
                        >
                            <Save size={20} /> {loading ? "Saving..." : "Submit Request / تقديم الطلب"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
