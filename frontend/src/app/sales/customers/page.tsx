"use client";
import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fetchWithAuth } from "@/lib/api";
import { Users, Plus, Search, X, Edit3, ChevronLeft, ChevronRight, Box, RefreshCw, Package } from "lucide-react";

export default function CustomersPage() {
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [role, setRole] = useState("viewer");
    const [customers, setCustomers] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ first_name: "", last_name: "", company_name: "", phone: "", email: "", address: { city: "", state: "", street: "", notes: "" }, status: "active" });
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => { const unsub = onAuthStateChanged(auth, async (u) => { setAuthUser(u); setAuthReady(true); if (u) { try { const t = await u.getIdTokenResult(); if (t.claims.role) setRole(t.claims.role as string); } catch { } } }); return () => unsub(); }, []);



    const fetchCustomers = useCallback(async () => {
        if (!authReady || !authUser) return;
        setLoading(true); setError(null);
        try {
            const p = new URLSearchParams();
            if (search) p.set("search", search);
            if (statusFilter) p.set("status", statusFilter);
            p.set("page", String(page)); p.set("page_size", String(pageSize));
            const res = await fetchWithAuth(`/api/customers?${p}`);
            if (res.ok) {
                const d = await res.json();
                setCustomers(d.customers || []);
                setTotalCount(d.total_count || 0);
            } else {
                const errBody = await res.text();
                console.error(`[Customers] Fetch failed: ${res.status} - ${errBody}`);
                setError(`Failed to fetch customers: ${res.status}`);
            }
        } catch (e: any) {
            console.error("[Customers] Fetch exception:", e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [authReady, authUser, search, statusFilter, page]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
    const canModify = role === "admin" || role === "accountant";
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    const openNew = () => { setEditingId(null); setForm({ first_name: "", last_name: "", company_name: "", phone: "", email: "", address: { city: "", state: "", street: "", notes: "" }, status: "active" }); setFormError(null); setShowForm(true); };
    const openEdit = (c: any) => { setEditingId(c.id); setForm({ first_name: c.first_name || "", last_name: c.last_name || "", company_name: c.company_name || "", phone: c.phone || "", email: c.email || "", address: c.address || { city: "", state: "", street: "", notes: "" }, status: c.status || "active" }); setFormError(null); setShowForm(true); };

    const handleSave = async () => {
        setFormError(null);
        if (!form.first_name || !form.last_name) { setFormError("Name required"); return; }
        if (!form.phone) { setFormError("Phone required"); return; }
        setSaving(true);
        try {
            const url = editingId ? `/api/customers/${editingId}` : "/api/customers";
            const res = await fetchWithAuth(url, { method: editingId ? "PUT" : "POST", body: JSON.stringify(form) });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Failed to save"); }
            setShowForm(false); fetchCustomers();
        } catch (e: any) { setFormError(e.message); } finally { setSaving(false); }
    };

    const [viewingItemsId, setViewingItemsId] = useState<string | null>(null);
    const [customerItems, setCustomerItems] = useState<any[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);

    const openItems = async (c: any) => {
        setViewingItemsId(c.id);
        setItemsLoading(true);
        try {
            const res = await fetchWithAuth(`/api/warehouse/products?customer_id=${c.id}`);
            setCustomerItems(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setItemsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Users className="text-blue-600" /> Customers / الزبائن</h1><p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{totalCount} total</p></div>
                {canModify && <button onClick={openNew} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200"><Plus size={16} /> Add Customer</button>}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, phone, email..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"><option value="">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? <div className="p-8 text-center text-slate-400 font-bold">Loading...</div> : error ? <div className="p-8 text-center text-rose-500 font-bold">{error}</div> : customers.length === 0 ? <div className="p-12 text-center"><Users size={48} className="mx-auto text-slate-200 mb-4" /><h3 className="text-lg font-black text-slate-400">No customers found</h3></div> : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100"><tr>
                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Company</th>
                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Phone</th>
                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50">{customers.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-5 py-4 font-black text-slate-800">{c.first_name} {c.last_name}</td>
                                <td className="px-5 py-4 text-sm text-slate-500">{c.company_name || "—"}</td>
                                <td className="px-5 py-4 text-sm font-mono text-slate-600">{c.phone}</td>
                                <td className="px-5 py-4"><span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{c.status || "active"}</span></td>
                                <td className="px-5 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => openItems(c)} className="p-2 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl flex items-center gap-1 text-xs font-black uppercase tracking-tighter" title="View Items">
                                            <Box size={16} /> Stock
                                        </button>
                                        {canModify && <button onClick={() => openEdit(c)} className="p-2 text-blue-400 hover:text-blue-700 hover:bg-blue-50 rounded-xl" title="Edit"><Edit3 size={16} /></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                )}
                {totalPages > 1 && <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100"><span className="text-xs text-slate-400 font-bold">Page {page} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={16} /></button><button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={16} /></button></div></div>}
            </div>

            {/* Customer Items Modal */}
            {viewingItemsId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black tracking-tight">Customer Inventory / مخزون العميل</h3>
                                <p className="text-slate-400 text-sm font-medium">{customers.find((c: any) => c.id === viewingItemsId)?.company_name}</p>
                            </div>
                            <button onClick={() => setViewingItemsId(null)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 bg-slate-50">
                            {itemsLoading ? (
                                <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-primary" /></div>
                            ) : customerItems.length === 0 ? (
                                <div className="py-20 text-center space-y-4">
                                    <Box size={48} className="mx-auto text-slate-200" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest">No items assigned to this customer</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {customerItems.map(item => (
                                        <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-primary/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                                    <Package size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800">{item.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.sku}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-primary">{parseFloat(item.current_qty).toLocaleString()} <span className="text-[10px] uppercase text-slate-400">{item.unit}</span></p>
                                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">In Stock</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-white border-t border-slate-100 flex justify-center">
                            <button onClick={() => setViewingItemsId(null)} className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-95">Close View</button>
                        </div>
                    </div>
                </div>
            )}
            {showForm && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between"><h2 className="text-lg font-black text-slate-800">{editingId ? "Edit Customer" : "Add Customer / إضافة زبون"}</h2><button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} /></button></div>
                    <div className="p-6 space-y-4">
                        {formError && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-sm">{formError}</div>}
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">First Name *</label><input type="text" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Last Name *</label><input type="text" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                        </div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Company</label><input type="text" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Phone *</label><input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                        </div>
                        <h3 className="text-xs font-black text-slate-500 uppercase pt-2">Address</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">City</label><input type="text" value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">State</label><input type="text" value={form.address.state} onChange={e => setForm(f => ({ ...f, address: { ...f.address, state: e.target.value } }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                        </div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Street</label><input type="text" value={form.address.street} onChange={e => setForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Status</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                    </div>
                    <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                        <button onClick={() => setShowForm(false)} className="px-5 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button onClick={handleSave} disabled={saving} className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving..." : (editingId ? "Update" : "Create")}</button>
                    </div>
                </div>
            </div>}
        </div>
    );
}
