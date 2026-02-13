"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Plus, Search, X, FileText, Loader2, Calendar
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const PAYMENT_METHODS = ["CASH", "BANK", "CARD", "CHECK", "OTHERS"];

export default function ReceiptsPage() {
    const [receipts, setReceipts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [customerFilter, setCustomerFilter] = useState("");
    const [methodFilter, setMethodFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [authReady, setAuthReady] = useState(false);
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        customer_id: "",
        receipt_number: "",
        date: new Date().toISOString().split("T")[0],
        payment_method: "CASH",
        cash_bank_account_id: "",
        amount: "",
        notes: "",
    });

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    const fetchReceipts = useCallback(async () => {
        if (!authReady || !authUser) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (customerFilter) params.set("customer_id", customerFilter);
            if (methodFilter) params.set("payment_method", methodFilter);
            if (dateFrom) params.set("date_from", dateFrom);
            if (dateTo) params.set("date_to", dateTo);
            const res = await fetchWithAuth(`/api/accounting/vouchers/receipt?${params}`);
            if (res.ok) {
                const data = await res.json();
                setReceipts(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error("Failed to fetch receipts:", e);
        } finally {
            setLoading(false);
        }
    }, [authReady, authUser, search, customerFilter, methodFilter, dateFrom, dateTo]);

    const fetchCustomers = useCallback(async () => {
        if (!authReady || !authUser) return;
        try {
            const res = await fetchWithAuth("/api/customers?page=1&page_size=200");
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.customers || (Array.isArray(data) ? data : []));
            }
        } catch (e) {
            console.error("Failed to fetch customers:", e);
        }
    }, [authReady, authUser]);

    const fetchAccounts = useCallback(async () => {
        if (!authReady || !authUser) return;
        try {
            const res = await fetchWithAuth("/api/accounting/accounts");
            if (res.ok) {
                const data = await res.json();
                setAccounts(data.accounts || (Array.isArray(data) ? data : []));
            }
        } catch (e) {
            console.error("Failed to fetch accounts:", e);
        }
    }, [authReady, authUser]);

    useEffect(() => {
        fetchReceipts();
        fetchCustomers();
        fetchAccounts();
    }, [fetchReceipts, fetchCustomers, fetchAccounts]);

    const assetAccounts = accounts.filter((a) => a.type === "ASSET");

    const customerName = (id: string) => {
        const c = customers.find((cust: any) => cust.id === id);
        if (!c) return id;
        return `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.company || id;
    };

    const handleSubmit = async () => {
        if (!formData.customer_id || !formData.amount || !formData.cash_bank_account_id) {
            alert("Please fill required fields: Customer, Amount, and Payment Account.");
            return;
        }

        setSubmitting(true);
        try {
            const receiptNum = formData.receipt_number || `RV-${Date.now().toString(36).toUpperCase()}`;
            const payload = {
                receipt_number: receiptNum,
                date: formData.date,
                customer_id: formData.customer_id,
                amount: parseFloat(formData.amount).toFixed(4),
                payment_method: formData.payment_method,
                cash_bank_account_id: formData.cash_bank_account_id,
                linked_invoices: [],
                notes: formData.notes,
            };

            const res = await fetchWithAuth("/api/accounting/vouchers/receipt", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setShowModal(false);
                setFormData({
                    customer_id: "",
                    receipt_number: "",
                    date: new Date().toISOString().split("T")[0],
                    payment_method: "CASH",
                    cash_bank_account_id: "",
                    amount: "",
                    notes: "",
                });
                fetchReceipts();
            } else {
                const err = await res.json();
                alert("Error: " + (err.detail || "Unknown error"));
            }
        } catch (e) {
            alert("Failed to create receipt");
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (d: any) => {
        if (!d) return "-";
        if (d._seconds) return new Date(d._seconds * 1000).toLocaleDateString();
        if (typeof d === "string") return new Date(d).toLocaleDateString();
        return "-";
    };

    if (!authReady) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">Receipts / سندات القبض</h2>
                        <p className="text-slate-500 text-sm">Manage incoming payments from customers</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 text-sm"
                >
                    <Plus size={18} /> Add Receipt
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search receipts..."
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                >
                    <option value="">All Customers</option>
                    {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                            {`${c.first_name || ""} ${c.last_name || ""}`.trim() || c.company || c.id}
                        </option>
                    ))}
                </select>
                <select
                    className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                >
                    <option value="">All Methods</option>
                    {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <input type="date" className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <span className="text-slate-400 text-xs">to</span>
                    <input type="date" className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Receipt #</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Customer</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Method</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading...</td></tr>
                        ) : receipts.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No receipts found.</td></tr>
                        ) : (
                            receipts.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700 font-mono">{r.receipt_number || "-"}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(r.date)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{customerName(r.customer_id)}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-emerald-50 text-emerald-600">
                                            {r.payment_method || "-"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900 font-mono text-right">
                                        {Number(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900">New Receipt / سند قبض جديد</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Customer */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Customer / العميل</label>
                                <select className="w-full bg-slate-50 border-none p-3.5 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}>
                                    <option value="">Select customer...</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {`${c.first_name || ""} ${c.last_name || ""}`.trim() || c.company || c.id}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Doc Number + Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Document No.</label>
                                    <input type="text" className="w-full bg-slate-50 border-none p-3.5 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Auto-generated" value={formData.receipt_number} onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                                    <input type="date" className="w-full bg-slate-50 border-none p-3.5 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                        value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                            </div>

                            {/* Payment Method + Account */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Method</label>
                                    <select className="w-full bg-slate-50 border-none p-3.5 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                        value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}>
                                        {PAYMENT_METHODS.map((m) => (<option key={m} value={m}>{m}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Deposit Account</label>
                                    <select className="w-full bg-slate-50 border-none p-3.5 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                        value={formData.cash_bank_account_id} onChange={(e) => setFormData({ ...formData, cash_bank_account_id: e.target.value })}>
                                        <option value="">Select account...</option>
                                        {assetAccounts.map((a) => (<option key={a.id} value={a.id}>{a.code} - {a.name_en}</option>))}
                                    </select>
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full bg-slate-50 border-none p-3.5 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-mono"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">IQD</span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                                <textarea
                                    className="w-full bg-slate-50 border-none p-3.5 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none"
                                    placeholder="Optional notes..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {submitting ? "Creating..." : "Create Receipt"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
