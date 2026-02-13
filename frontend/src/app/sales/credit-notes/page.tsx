"use client";

import { useState, useEffect } from "react";
import { Plus, Search, FileText, ArrowLeft, RefreshCw, Filter } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { auth } from "@/lib/firebase";

export default function CreditNotesPage() {
    const { t } = useLanguage();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        customer_id: "",
        date: new Date().toISOString().split('T')[0],
        reason: "",
        amount: "",
        note: ""
    });

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchNotes(user);
                fetchCustomers(user);
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchNotes = async (user: any) => {
        try {
            const token = await user.getIdToken();
            console.log("[CreditNotes] Fetching with token present:", !!token, "Token length:", token?.length);
            const res = await fetch("/api/credit-notes", {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setNotes(await res.json());
            } else {
                const errBody = await res.text();
                console.error(`[CreditNotes] Fetch failed: ${res.status} - ${errBody}`);
            }
        } catch (e) {
            console.error("[CreditNotes] Fetch exception:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async (user: any) => {
        const token = await user.getIdToken();
        const res = await fetch("/api/customers?page=1&page_size=100", {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setCustomers(data.customers || []);
        }
    };

    const handleSubmit = async () => {
        if (!formData.customer_id || !formData.amount || !formData.reason) {
            alert("Please fill required fields");
            return;
        }

        try {
            const token = await auth.currentUser?.getIdToken();
            const payload = {
                customer_id: formData.customer_id,
                date: formData.date,
                reason: formData.reason,
                total: parseFloat(formData.amount),
                note: formData.note,
                lines: [
                    {
                        description: formData.reason,
                        amount: parseFloat(formData.amount),
                        quantity: 1,
                        unit_price: parseFloat(formData.amount),
                        account_id: null // Use default
                    }
                ]
            };

            const res = await fetch("/api/credit-notes", {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowModal(false);
                // We need to re-fetch. Since we don't have 'user' here readily available 
                // without passing it down or storing it, we can just reload the window 
                // or better, make fetchNotes handle null user by checking auth.currentUser
                // But for now, let's just reload to be safe and simple, or 
                // assume the user is still logged in and get token inside.
                // Actually, let's fix fetchNotes to use auth.currentUser if argument not provided
                // checking the implementation below...
                // The current fetchNotes requires 'user'. 
                // Let's change fetchNotes to be flexible.
                if (auth.currentUser) fetchNotes(auth.currentUser);
                setFormData({
                    customer_id: "",
                    date: new Date().toISOString().split('T')[0],
                    reason: "",
                    amount: "",
                    note: ""
                });
            } else {
                const err = await res.json();
                alert("Error creating credit note: " + (err.detail || "Unknown error"));
            }
        } catch (e) {
            alert("Failed to create credit note");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-orange-600 shadow-xl shadow-orange-200 rounded-3xl text-white transform -rotate-3">
                        <FileText size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Credit Notes</h1>
                        <p className="text-slate-500 font-medium">Manage customer refunds and returns</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center gap-2"
                >
                    <Plus size={20} />
                    New Credit Note
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Number</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Reason</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading...</td></tr>
                        ) : notes.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No credit notes found.</td></tr>
                        ) : (
                            notes.map(note => (
                                <tr key={note.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700 font-mono">{note.number}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(note.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{note.reason || "Return"}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900 font-mono text-right">
                                        {Number(note.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                            {note.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-slate-900">New Credit Note</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <ArrowLeft size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Customer</label>
                                <select
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                                    value={formData.customer_id}
                                    onChange={e => setFormData({ ...formData, customer_id: e.target.value })}
                                >
                                    <option value="">Select Customer...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                        {formData.amount && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm pointer-events-none">
                                                {Number(formData.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="e.g. Broken Item"
                                    value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Internal Note</label>
                                <textarea
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 h-24 resize-none"
                                    value={formData.note}
                                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handleSubmit}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transform transition-all active:scale-95"
                            >
                                Validated & Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
