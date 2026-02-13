"use client";
import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api";
import { ArrowRightLeft, Plus, Save, X, Package, Truck, User, Calendar, Search } from "lucide-react";

export default function TransferPage() {
    const [transfers, setTransfers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    useEffect(() => {
        loadData();
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        const [whRes, custRes, prodRes] = await Promise.all([
            fetchWithAuth("/api/warehouse/warehouses"),
            fetchWithAuth("/api/customers"),
            fetchWithAuth("/api/warehouse/products")
        ]);
        setWarehouses(await whRes.json());
        setCustomers((await custRes.json()).customers || []);
        setProducts(await prodRes.json());
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/warehouse/ops/transfers");
            setTransfers(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <ArrowRightLeft className="text-indigo-500" size={28} />
                        Stock Transfers / تحويل المخزون
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Move stock between warehouses or customers</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg active:scale-95"
                >
                    <Plus size={20} /> New Transfer / تحويل جديد
                </button>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {transfers.map((t, idx) => (
                        <div
                            key={idx}
                            onClick={() => setSelectedTransfer(t)}
                            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 cursor-pointer transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-500">
                                    <ArrowRightLeft size={20} />
                                </div>
                                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                    {t.status}
                                </span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                                    <span>#{t.number}</span>
                                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-4 py-3 border-y border-slate-50">
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">From</p>
                                        <p className="font-bold text-slate-700 text-sm truncate">{warehouses.find((w: any) => w.id === t.from_warehouse_id)?.name || "Unknown"}</p>
                                    </div>
                                    <ArrowRightLeft className="text-slate-200" size={16} />
                                    <div className="flex-1 text-right">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">To</p>
                                        <p className="font-bold text-slate-700 text-sm truncate">{warehouses.find((w: any) => w.id === t.to_warehouse_id)?.name || "Unknown"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500">{customers.find((c: any) => c.id === t.customer_id)?.company_name || "Unknown"}</span>
                                    </div>
                                    <span className="text-xs font-black text-primary">{t.items?.length || 0} items</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <TransferForm
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); loadData(); }}
                    warehouses={warehouses}
                    customers={customers}
                    products={products}
                />
            )}

            {selectedTransfer && (
                <TransferDetailsModal
                    transfer={selectedTransfer}
                    onClose={() => setSelectedTransfer(null)}
                    warehouses={warehouses}
                    customers={customers}
                    products={products}
                />
            )}
        </div>
    );
}

function TransferDetailsModal({ transfer, onClose, warehouses, customers, products }: any) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black tracking-tight">Transfer Details</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">#{transfer.number}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                </div>
                <div className="p-8 overflow-y-auto space-y-8">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">From</p>
                            <p className="font-bold text-slate-700 text-lg">{warehouses.find((w: any) => w.id === transfer.from_warehouse_id)?.name || "Unknown"}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">To</p>
                            <p className="font-bold text-slate-700 text-lg">{warehouses.find((w: any) => w.id === transfer.to_warehouse_id)?.name || "Unknown"}</p>
                        </div>
                        <div className="col-span-2 pt-4 border-t border-slate-200 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                                <p className="font-bold text-slate-700">{customers.find((c: any) => c.id === transfer.customer_id)?.company_name || "Unknown"}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                                <p className="font-bold text-slate-700">{new Date(transfer.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Package size={16} className="text-primary" /> Transferred Items
                        </h4>
                        <div className="space-y-3">
                            {transfer.items?.map((item: any, idx: number) => {
                                const prod = products.find((p: any) => p.id === item.item_id);
                                return (
                                    <div key={idx} className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                                        <div>
                                            <p className="font-black text-slate-800 text-sm">{prod?.name || "Unknown Item"}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">SKU: {prod?.sku || "N/A"}</span>
                                                {item.batch_number && <span className="text-[9px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded">Batch: {item.batch_number}</span>}
                                            </div>
                                        </div>
                                        <span className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-black text-sm">x{item.quantity}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notes */}
                    {transfer.notes && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800 text-sm">
                            <span className="font-bold">Note:</span> {transfer.notes}
                        </div>
                    )}
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button onClick={onClose} className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-50">Close</button>
                </div>
            </div>
        </div>
    );
}



function TransferForm({ onClose, onSuccess, warehouses, customers, products }: any) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        number: `TRF-${Math.floor(Math.random() * 9000) + 1000}`,
        from_warehouse_id: "",
        to_warehouse_id: "",
        customer_id: "",
        items: [] as any[],
        notes: ""
    });

    const [itemInput, setItemInput] = useState({ item_id: "", quantity: "1", batch_number: "" });
    const [currentStock, setCurrentStock] = useState<number | null>(null);
    const [loadingStock, setLoadingStock] = useState(false);

    useEffect(() => {
        if (itemInput.item_id) {
            setLoadingStock(true);
            const warehouseParam = formData.from_warehouse_id ? `&warehouse_id=${formData.from_warehouse_id}` : '';
            fetchWithAuth(`/api/warehouse/ops/stock?item_id=${itemInput.item_id}${warehouseParam}`)
                .then(res => res.json())
                .then(data => setCurrentStock(data.balance))
                .catch(err => console.error("Error fetching stock", err))
                .finally(() => setLoadingStock(false));
        } else {
            setCurrentStock(null);
        }
    }, [itemInput.item_id, formData.from_warehouse_id]);

    const handleAddItem = () => {
        if (!itemInput.item_id) return;
        setFormData({ ...formData, items: [...formData.items, itemInput] });
        setItemInput({ item_id: "", quantity: "1", batch_number: "" });
        setCurrentStock(null);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/warehouse/ops/transfers", {
                method: "POST",
                body: JSON.stringify(formData)
            });
            if (res.ok) onSuccess();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
                    <h3 className="text-lg font-black tracking-tight">New Stock Transfer / تحويل جديد</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="p-8 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Customer</label>
                            <select className="form-input w-full font-bold" value={formData.customer_id} onChange={e => setFormData({ ...formData, customer_id: e.target.value })}>
                                <option value="">- Select -</option>
                                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Transfer #</label>
                            <input readOnly className="form-input w-full bg-slate-50 font-mono font-bold" value={formData.number} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">From Warehouse</label>
                            <select className="form-input w-full font-bold" value={formData.from_warehouse_id} onChange={e => setFormData({ ...formData, from_warehouse_id: e.target.value })}>
                                <option value="">- Select -</option>
                                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">To Warehouse</label>
                            <select className="form-input w-full font-bold" value={formData.to_warehouse_id} onChange={e => setFormData({ ...formData, to_warehouse_id: e.target.value })}>
                                <option value="">- Select -</option>
                                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Item to Transfer</p>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-12">
                                <select className="form-input w-full font-bold text-sm" value={itemInput.item_id} onChange={e => setItemInput({ ...itemInput, item_id: e.target.value })}>
                                    <option value="">- Choose Item -</option>
                                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                {itemInput.item_id && (
                                    <div className="mt-1 px-1 flex justify-between items-center">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                                            {loadingStock ? "Checking stock..." : `Available: ${currentStock ?? 0} units @ ${warehouses.find((w: any) => w.id === formData.from_warehouse_id)?.name || 'Global'}`}
                                        </p>
                                        {currentStock !== null && parseFloat(itemInput.quantity) > currentStock && (
                                            <p className="text-[9px] font-bold text-rose-500 animate-pulse">Insufficient Stock! / نقص في المخزون</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-4">
                                <input type="number" className="form-input w-full text-sm font-bold" placeholder="Qty" value={itemInput.quantity} onChange={e => setItemInput({ ...itemInput, quantity: e.target.value })} />
                            </div>
                            <div className="md:col-span-5">
                                <input className="form-input w-full text-sm font-bold" placeholder="Batch #" value={itemInput.batch_number} onChange={e => setItemInput({ ...itemInput, batch_number: e.target.value })} />
                            </div>
                            <div className="md:col-span-3">
                                <button onClick={handleAddItem} className="w-full bg-primary text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"><Plus size={16} /> Add</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {formData.items.map((it, i) => (
                            <div key={i} className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                                <div>
                                    <p className="font-black text-slate-800 text-sm">{products.find((p: any) => p.id === it.item_id)?.name}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Batch: {it.batch_number || "N/A"}</p>
                                </div>
                                <span className="bg-primary/5 text-primary px-3 py-1 rounded-lg font-black text-sm">x{it.quantity}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || formData.items.length === 0}
                        className="bg-primary text-white px-10 py-3 rounded-2xl font-black shadow-lg hover:shadow-primary/20 active:scale-95 disabled:scale-100 disabled:opacity-50 transition-all"
                    >
                        {loading ? "Processing..." : "Confirm Transfer / تأكيد التحويل"}
                    </button>
                </div>
            </div>
        </div>
    );
}
