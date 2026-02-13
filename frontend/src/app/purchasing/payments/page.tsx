"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Plus, Search, X, CreditCard, Loader2, Trash2, Calendar, Filter
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const PAYMENT_METHODS = ["CASH", "BANK", "CARD", "CHECK", "OTHERS"];

export default function PaymentVouchersPage() {
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [methodFilter, setMethodFilter] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [authReady, setAuthReady] = useState(false);
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        payee: "",
        receiver: "",
        payment_method: "CASH",
        cash_bank_account_id: "",
        description: "",
        lines: [{ account_id: "", description: "", amount: "" }],
    });

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    const fetchVouchers = useCallback(async () => {
        if (!authReady || !authUser) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (dateFrom) params.set("date_from", dateFrom);
            if (dateTo) params.set("date_to", dateTo);
            if (methodFilter) params.set("payment_method", methodFilter);
            const res = await fetchWithAuth(`/api/accounting/vouchers/payment?${params}`);
            if (res.ok) {
                const data = await res.json();
                setVouchers(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error("Failed to fetch payment vouchers:", e);
        } finally {
            setLoading(false);
        }
    }, [authReady, authUser, search, dateFrom, dateTo, methodFilter]);

    const fetchData = useCallback(async () => {
        if (!authReady || !authUser) return;
        try {
            const [accRes, custRes, suppRes] = await Promise.all([
                fetchWithAuth("/api/accounting/accounts"),
                fetchWithAuth("/api/customers?page=1&page_size=200"),
                fetchWithAuth("/api/suppliers")
            ]);

            if (accRes.ok) {
                const data = await accRes.json();
                setAccounts(data.accounts || (Array.isArray(data) ? data : []));
            }
            if (custRes.ok) {
                const data = await custRes.json();
                setCustomers(data.customers || (Array.isArray(data) ? data : []));
            }
            if (suppRes.ok) {
                const data = await suppRes.json();
                setSuppliers(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error("Failed to fetch reference data:", e);
        }
    }, [authReady, authUser]);

    useEffect(() => {
        fetchVouchers();
        fetchData();
    }, [fetchVouchers, fetchData]);

    const addLine = () => {
        setFormData({
            ...formData,
            lines: [...formData.lines, { account_id: "", description: "", amount: "" }],
        });
    };

    const removeLine = (idx: number) => {
        if (formData.lines.length <= 1) return;
        setFormData({
            ...formData,
            lines: formData.lines.filter((_, i) => i !== idx),
        });
    };

    const updateLine = (idx: number, field: string, value: string) => {
        const newLines = [...formData.lines];
        newLines[idx] = { ...newLines[idx], [field]: value };
        setFormData({ ...formData, lines: newLines });
    };

    const totalAmount = formData.lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

    const handleSubmit = async () => {
        if (!formData.payee || !formData.cash_bank_account_id || totalAmount <= 0) {
            alert("Please fill required fields: Payee, Payment Account, and at least one line with amount.");
            return;
        }

        const firstLine = formData.lines.find((l: any) => parseFloat(l.amount) > 0);
        if (!firstLine?.account_id) {
            alert("Please select an expense account for at least one line.");
            return;
        }

        setSubmitting(true);
        try {
            const voucherNum = `PV-${Date.now().toString(36).toUpperCase()}`;
            const payload = {
                voucher_number: voucherNum,
                date: formData.date,
                payee: formData.payee,
                amount: totalAmount.toFixed(4),
                payment_method: formData.payment_method,
                cash_bank_account_id: formData.cash_bank_account_id,
                expense_account_id: firstLine!.account_id,
                description: formData.description,
                lines: formData.lines.filter((l) => parseFloat(l.amount) > 0),
            };

            const res = await fetchWithAuth("/api/accounting/vouchers/payment", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setShowModal(false);
                setFormData({
                    date: new Date().toISOString().split("T")[0],
                    payee: "",
                    receiver: "",
                    payment_method: "CASH",
                    cash_bank_account_id: "",
                    description: "",
                    lines: [{ account_id: "", description: "", amount: "" }],
                });
                fetchVouchers();
            } else {
                const err = await res.json();
                alert("Error: " + (err.detail || "Unknown error"));
            }
        } catch (e) {
            alert("Failed to create payment voucher");
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

    const assetAccounts = accounts.filter((a) => a.type === "ASSET");
    const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE" || a.type === "LIABILITY" || a.type === "ASSET");

    if (!authReady) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-rose-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-200">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">Payment Vouchers / سندات الصرف</h2>
                        <p className="text-slate-500 text-sm">Manage outgoing payments</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 text-sm"
                >
                    <Plus size={18} /> Create Payment Voucher
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full ps-9 pe-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <input type="date" className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <span className="text-slate-400 text-xs">to</span>
                    <input type="date" className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <select
                    className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                >
                    <option value="">All Methods</option>
                    {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-start">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Voucher #</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Payee</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Method</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-end">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading...</td></tr>
                        ) : vouchers.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No payment vouchers found.</td></tr>
                        ) : (
                            vouchers.map((v) => (
                                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700 font-mono">{v.voucher_number || "-"}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(v.date)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{v.payee || "-"}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-slate-100 text-slate-600">
                                            {v.payment_method || "-"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900 font-mono text-end">
                                        {Number(v.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900">New Payment Voucher / سند صرف جديد</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* Row 1: Date + Payment Method */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                                    <input type="date" className="w-full bg-slate-50 border-none p-3.5 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500"
                                        value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Method</label>
                                    <select className="w-full bg-slate-50 border-none p-3.5 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500"
                                        value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}>
                                        {PAYMENT_METHODS.map((m) => (<option key={m} value={m}>{m}</option>))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: Payee + Receiver */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Distributor / Payee (Who pays)</label>
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <select
                                                className="flex-1 bg-slate-50 border-none p-2 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-rose-500"
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (!val) return;
                                                    if (val.startsWith("cust:")) {
                                                        const c = customers.find((x: any) => x.id === val.split(":")[1]);
                                                        if (c) setFormData({ ...formData, payee: `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.company || c.id });
                                                    } else if (val.startsWith("supp:")) {
                                                        const s = suppliers.find((x: any) => x.id === val.split(":")[1]);
                                                        if (s) setFormData({ ...formData, payee: s.name || s.company || s.id });
                                                    }
                                                }}
                                            >
                                                <option value="">Select Customer/Supplier...</option>
                                                <optgroup label="Customers">
                                                    {customers.map(c => (
                                                        <option key={c.id} value={`cust:${c.id}`}>{c.first_name} {c.last_name} ({c.company || "No Company"})</option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Suppliers">
                                                    {suppliers.map(s => (
                                                        <option key={s.id} value={`supp:${s.id}`}>{s.name || s.company}</option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </div>
                                        <input type="text" className="w-full bg-slate-50 border-none p-3.5 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500"
                                            placeholder="Manual entry or selected above" value={formData.payee} onChange={(e) => setFormData({ ...formData, payee: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Receiver</label>
                                    <div className="space-y-2">
                                        <select
                                            className="w-full bg-slate-50 border-none p-2 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-rose-500"
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (!val) return;
                                                if (val.startsWith("cust:")) {
                                                    const c = customers.find((x: any) => x.id === val.split(":")[1]);
                                                    if (c) setFormData({ ...formData, receiver: `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.company || c.id });
                                                } else if (val.startsWith("supp:")) {
                                                    const s = suppliers.find(x => x.id === val.split(":")[1]);
                                                    if (s) setFormData({ ...formData, receiver: s.name || s.company || s.id });
                                                }
                                            }}
                                        >
                                            <option value="">Select Receiver...</option>
                                            <optgroup label="Customers">
                                                {customers.map(c => (
                                                    <option key={c.id} value={`cust:${c.id}`}>{c.first_name} {c.last_name}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Suppliers">
                                                {suppliers.map(s => (
                                                    <option key={s.id} value={`supp:${s.id}`}>{s.name || s.company}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                        <input type="text" className="w-full bg-slate-50 border-none p-3.5 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500"
                                            placeholder="Manual entry or selected above" value={formData.receiver} onChange={(e) => setFormData({ ...formData, receiver: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Payment Account */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Account (Cash/Bank)</label>
                                <select className="w-full bg-slate-50 border-none p-3.5 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500"
                                    value={formData.cash_bank_account_id} onChange={(e) => setFormData({ ...formData, cash_bank_account_id: e.target.value })}>
                                    <option value="">Select account...</option>
                                    {assetAccounts.map((a) => (<option key={a.id} value={a.id}>{a.code} - {a.name_en}</option>))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                <textarea className="w-full bg-slate-50 border-none p-3.5 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 h-20 resize-none"
                                    placeholder="Payment details..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            </div>

                            {/* Line Items */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Line Items</label>
                                    <button onClick={addLine} className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1">
                                        <Plus size={14} /> Add Line
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {formData.lines.map((line, idx) => (
                                        <div key={idx} className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl">
                                            <div className="flex-1 space-y-2">
                                                <select
                                                    className="w-full bg-white border border-slate-100 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                                                    value={line.account_id}
                                                    onChange={(e) => updateLine(idx, "account_id", e.target.value)}
                                                >
                                                    <option value="">Account...</option>
                                                    {expenseAccounts.map((a) => (
                                                        <option key={a.id} value={a.id}>{a.code} - {a.name_en}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="text"
                                                    placeholder="Description"
                                                    className="w-full bg-white border border-slate-100 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                                                    value={line.description}
                                                    onChange={(e) => updateLine(idx, "description", e.target.value)}
                                                />
                                            </div>
                                            <div className="w-32">
                                                <input
                                                    type="number"
                                                    placeholder="Amount"
                                                    className="w-full bg-white border border-slate-100 p-2.5 rounded-lg text-sm font-mono text-end outline-none focus:ring-2 focus:ring-rose-500"
                                                    value={line.amount}
                                                    onChange={(e) => updateLine(idx, "amount", e.target.value)}
                                                />
                                            </div>
                                            {formData.lines.length > 1 && (
                                                <button onClick={() => removeLine(idx)} className="p-2 hover:bg-red-50 rounded-lg mt-0.5">
                                                    <Trash2 size={14} className="text-red-400" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="flex justify-between items-center p-4 bg-slate-900 text-white rounded-xl">
                                <span className="font-bold text-sm">Total Amount</span>
                                <span className="font-black text-xl font-mono tabular-nums">
                                    {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-bold opacity-50">IQD</span>
                                </span>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full py-4 bg-rose-600 text-white rounded-xl font-bold shadow-lg hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {submitting ? "Creating..." : "Create Payment Voucher"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
