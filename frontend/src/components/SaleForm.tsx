import { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, ShoppingCart, User, Package, Building2, TrendingDown } from "lucide-react";
import SuccessModal from "./SuccessModal";
import { fetchWithAuth } from "@/lib/api";

interface SaleFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function SaleForm({ onClose, onSuccess }: SaleFormProps) {
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        number: `DO-${Date.now().toString().slice(-6)}`,
        customer_account_id: "",
        lines: [
            { item_id: "", warehouse_id: "", quantity: "1" }
        ]
    });

    useEffect(() => {
        // Fetch Items
        fetchWithAuth("/api/inventory/items").then(res => res.json()).then(data => {
            const list = data.items || (Array.isArray(data) ? data : []);
            setItems(list);
        });

        // Fetch Accounts (Filter for Customers/Receivables)
        fetchWithAuth("/api/accounts?limit=200").then(res => res.json()).then(data => {
            const list = data.accounts || (Array.isArray(data) ? data : []);
            // Heuristic: Accounts starting with '122' (Receivables) and not groups
            const custs = list.filter((acc: any) => acc.code.startsWith('122') && !acc.is_group);
            setCustomers(custs);
        });

        // Fetch Warehouses
        fetchWithAuth("/api/warehouses").then(res => res.json()).then(data => {
            const list = data.warehouses || (Array.isArray(data) ? data : []);
            setWarehouses(list);
            // Set default warehouse if available
            if (list.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    lines: prev.lines.map(l => ({ ...l, warehouse_id: list[0].id }))
                }));
            }
        });
    }, []);

    const addLine = () => {
        const defaultWh = warehouses.length > 0 ? warehouses[0].id : "";
        setFormData({
            ...formData,
            lines: [...formData.lines, { item_id: "", warehouse_id: defaultWh, quantity: "1" }]
        });
    };

    const removeLine = (index: number) => {
        if (formData.lines.length <= 1) return;
        setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== index) });
    };

    const updateLine = (index: number, field: string, value: string) => {
        const newLines = [...formData.lines];
        (newLines[index] as any)[field] = value;
        setFormData({ ...formData, lines: newLines });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/inventory/delivery-note", {
                method: "POST",
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                // Show success modal instead of immediately closing
                setShowSuccess(true);
            } else {
                const err = await res.json();
                alert("Failed to process sale: " + (err.detail || "Unknown Error"));
            }
        } catch (err) {
            alert("Connection error");
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccess(false);
        onSuccess();
        onClose();
    };

    const getStock = (itemId: string) => {
        const item = items.find((i: any) => i.id === itemId);
        return item ? Number(item.current_qty) : 0;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-200">
                <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ShoppingCart size={24} />
                        <div>
                            <h3 className="text-lg font-bold">New Sale / بيع جديد</h3>
                            <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Delivery Note & Invoice</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-[#f8fafc]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <User size={14} /> Customer / العميل
                            </label>
                            <select
                                required
                                className="form-input"
                                value={formData.customer_account_id}
                                onChange={(e) => setFormData({ ...formData, customer_account_id: e.target.value })}
                            >
                                <option value="">Select Customer...</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                ))}
                            </select>
                            {customers.length === 0 && (
                                <p className="text-[10px] text-amber-600 font-bold">No accounts found under '122' (Receivable).</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase">Document Number</label>
                            <input disabled className="form-input bg-slate-100 font-mono" value={formData.number} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sale Items / المواد المباعة</h4>
                            <button type="button" onClick={addLine} className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors">
                                <Plus size={14} /> Add Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formData.lines.map((line, idx) => {
                                const stock = getStock(line.item_id);
                                const isLowStock = stock < Number(line.quantity || 0);

                                return (
                                    <div key={idx} className="flex gap-4 items-start bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400">ITEM</label>
                                            <select
                                                required
                                                className="form-input text-sm font-bold"
                                                value={line.item_id}
                                                onChange={(e) => updateLine(idx, 'item_id', e.target.value)}
                                            >
                                                <option value="">Select Item...</option>
                                                {items.map(it => <option key={it.id} value={it.id}>{it.name} ({it.sku})</option>)}
                                            </select>
                                            {line.item_id && (
                                                <div className={`text-[10px] font-bold flex gap-2 ${isLowStock ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                    <span>Available: {stock}</span>
                                                    {isLowStock && <span>(Insufficient Stock!)</span>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-1/4 space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Building2 size={10} /> WAREHOUSE</label>
                                            <select
                                                required
                                                className="form-input text-sm"
                                                value={line.warehouse_id}
                                                onChange={(e) => updateLine(idx, 'warehouse_id', e.target.value)}
                                            >
                                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="w-24 space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400">QTY</label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                className="form-input text-right font-bold"
                                                value={line.quantity}
                                                onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                                            />
                                        </div>
                                        <button type="button" onClick={() => removeLine(idx)} className="mt-6 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Save size={20} />}
                            {loading ? "Processing..." : "Confirm Sale / تأكيد البيع"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Success Modal */}
            {showSuccess && (
                <SuccessModal
                    title="Sale Complete! / تم البيع"
                    message="The delivery note was created successfully and inventory has been updated."
                    onClose={handleSuccessClose}
                />
            )}
        </div>
    );
}
