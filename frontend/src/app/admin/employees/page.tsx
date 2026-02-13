"use client";
import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserCog, Plus, Search, X, Edit3, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

const ROLES = ["admin", "accountant", "storekeeper", "driver", "viewer"];

export default function EmployeesPage() {
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [role, setRole] = useState("viewer");
    const [employees, setEmployees] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", role: "viewer" });
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => { const unsub = onAuthStateChanged(auth, async (u) => { setAuthUser(u); setAuthReady(true); if (u) { try { const t = await u.getIdTokenResult(); if (t.claims.role) setRole(t.claims.role as string); } catch { } } }); return () => unsub(); }, []);



    const fetchEmployees = useCallback(async () => {
        if (!authReady || !authUser) return;
        setLoading(true); setError(null);
        try {
            const p = new URLSearchParams();
            if (search) p.set("search", search);
            if (roleFilter) p.set("role_filter", roleFilter);
            const res = await fetchWithAuth(`/api/employees?${p}`);
            if (res.ok) { const d = await res.json(); setEmployees(d.employees || []); setTotalCount(d.total_count || 0); }
            else if (res.status === 403) setError("Admin access required");
            else setError("Failed to fetch employees");
        } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    }, [authReady, authUser, search, roleFilter]);

    useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
    const isAdmin = role === "admin";

    const openNew = () => { setEditingId(null); setForm({ full_name: "", email: "", password: "", phone: "", role: "viewer" }); setFormError(null); setShowForm(true); };
    const openEdit = (e: any) => { setEditingId(e.id); setForm({ full_name: e.full_name || "", email: e.email || "", password: "", phone: e.phone || "", role: e.role || "viewer" }); setFormError(null); setShowForm(true); };

    const handleSave = async () => {
        setFormError(null);
        if (!editingId) { if (!form.email || !form.password) { setFormError("Email and password required"); return; } }
        setSaving(true);
        try {
            if (editingId) {
                const { password, email, ...updateData } = form;
                const res = await fetchWithAuth(`/api/employees/${editingId}`, { method: "PUT", body: JSON.stringify(updateData) });
                if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Failed"); }
            } else {
                const res = await fetchWithAuth("/api/employees", { method: "POST", body: JSON.stringify(form) });
                if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Failed"); }
            }
            setShowForm(false); fetchEmployees();
        } catch (e: any) { setFormError(e.message); } finally { setSaving(false); }
    };

    const roleBadge = (r: string) => {
        const colors: Record<string, string> = { admin: "bg-purple-100 text-purple-700", accountant: "bg-blue-100 text-blue-700", storekeeper: "bg-amber-100 text-amber-700", driver: "bg-teal-100 text-teal-700", viewer: "bg-slate-100 text-slate-500" };
        return <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${colors[r] || colors.viewer}`}>{r}</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-black text-slate-800 flex items-center gap-3"><UserCog className="text-purple-600" /> Employees / الموظفين</h1><p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{totalCount} total</p></div>
                {isAdmin && <button onClick={openNew} className="flex items-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-xl text-sm font-black hover:bg-purple-700 transition-all active:scale-95 shadow-lg shadow-purple-200"><Plus size={16} /> Add Employee</button>}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"><option value="">All Roles</option>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? <div className="p-8 text-center text-slate-400 font-bold">Loading...</div> : error ? <div className="p-8 text-center text-rose-500 font-bold">{error}</div> : employees.length === 0 ? <div className="p-12 text-center"><UserCog size={48} className="mx-auto text-slate-200 mb-4" /><h3 className="text-lg font-black text-slate-400">No employees found</h3></div> : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100"><tr>
                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Email</th>
                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Phone</th>
                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Role</th>
                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50">{employees.map(e => (
                            <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-5 py-4 font-black text-slate-800">{e.full_name || e.email?.split("@")[0] || "—"}</td>
                                <td className="px-5 py-4 text-sm text-slate-500">{e.email}</td>
                                <td className="px-5 py-4 text-sm font-mono text-slate-600">{e.phone || "—"}</td>
                                <td className="px-5 py-4">{roleBadge(e.role)}</td>
                                <td className="px-5 py-4 text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">{isAdmin && <button onClick={() => openEdit(e)} className="p-2 text-purple-400 hover:text-purple-700 hover:bg-purple-50 rounded-xl" title="Edit"><Edit3 size={16} /></button>}</div></td>
                            </tr>
                        ))}</tbody>
                    </table>
                )}
            </div>
            {showForm && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between"><h2 className="text-lg font-black text-slate-800">{editingId ? "Edit Employee" : "Add Employee / إضافة موظف"}</h2><button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} /></button></div>
                    <div className="p-6 space-y-4">
                        {formError && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-sm">{formError}</div>}
                        <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Full Name</label><input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                        {!editingId && <>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Email *</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Password *</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                        </>}
                        <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Phone</label><input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Role</label><select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold">{ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}</select></div>
                    </div>
                    <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                        <button onClick={() => setShowForm(false)} className="px-5 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button onClick={handleSave} disabled={saving} className="px-5 py-3 bg-purple-600 text-white rounded-xl text-sm font-black hover:bg-purple-700 disabled:opacity-50">{saving ? "Saving..." : (editingId ? "Update" : "Create")}</button>
                    </div>
                </div>
            </div>}
        </div>
    );
}
