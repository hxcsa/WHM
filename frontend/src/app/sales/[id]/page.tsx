"use client";

import { useEffect, useState, useMemo } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Printer, Download, CreditCard, CheckCircle, Ban, AlertCircle, Calendar, User as UserIcon, Phone, MapPin, Receipt } from "lucide-react";
import { auth } from "@/lib/firebase";
import { fetchWithAuth } from "@/lib/api";

function formatIQD(val: any): string {
    const n = Number(val || 0);
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " IQD";
}

function formatDate(val: any): string {
    if (!val) return "-";
    if (val?.seconds) {
        return new Date(val.seconds * 1000).toLocaleDateString("en-GB");
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB");
}

export default function InvoiceDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState("viewer");

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                try {
                    const tokenResult = await u.getIdTokenResult();
                    if (tokenResult.claims.role) setRole(String(tokenResult.claims.role));
                } catch {
                    setRole("viewer");
                }
            }
        });
        return () => unsub();
    }, []);

    const fetchInvoice = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`/api/sales/invoices/${id}`);
            if (res.ok) {
                setInvoice(await res.json());
            } else {
                setError("Invoice not found");
            }
        } catch (e) {
            setError("Error loading invoice");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && id) fetchInvoice();
    }, [user, id]);

    const handlePayment = async () => {
        if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        setProcessingPayment(true);
        try {
            const res = await fetchWithAuth(
                `/api/sales/invoices/${id}/pay?amount=${paymentAmount}`,
                { method: "POST" }
            );

            if (res.ok) {
                setShowPaymentModal(false);
                setPaymentAmount("");
                fetchInvoice(); // Refresh data
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.detail || "Payment failed");
            }
        } catch (e) {
            alert("Error processing payment");
        } finally {
            setProcessingPayment(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading invoice details...</div>;
    if (error || !invoice) return (
        <div className="p-8 text-center">
            <div className="text-xl font-bold text-slate-800 mb-2">Invoice Not Found</div>
            <button onClick={() => router.back()} className="text-blue-600 font-bold hover:underline">Go Back</button>
        </div>
    );

    const total = Number(invoice.total_amount || 0);
    const paid = Number(invoice.amount_paid || 0);
    const remaining = total - paid;
    const isPaid = remaining <= 0;

    const canModify = role === "admin" || role === "accountant";

    return (
        <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.push("/sales")}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        {invoice.invoice_number}
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide 
                            ${invoice.status === 'VOIDED' ? 'bg-slate-100 text-slate-500 line-through' :
                                isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {invoice.status === 'VOIDED' ? 'VOIDED' : isPaid ? 'PAID' : 'PENDING'}
                        </span>
                    </h1>
                    <p className="text-sm font-bold text-slate-500 flex items-center gap-2 mt-1">
                        <Calendar size={14} /> Created on {formatDate(invoice.issue_date)} by {invoice.created_by || "Unknown"}
                    </p>
                </div>
                <div className="ml-auto flex gap-3">
                    <button
                        onClick={() => {
                            const text = encodeURIComponent(
                                `*Invoice Details*\n` +
                                `Number: ${invoice.invoice_number}\n` +
                                `Customer: ${invoice.customer_name}\n` +
                                `Total: ${formatIQD(total)}\n` +
                                `Status: ${isPaid ? "PAID" : "PENDING"}\n` +
                                `Link: ${window.location.href}`
                            );
                            window.open(`https://wa.me/?text=${text}`, '_blank');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#22c35e] transition-colors"
                    >
                        <Phone size={18} /> WhatsApp
                    </button>
                    <button
                        onClick={() => window.open(`/api/sales/invoices/${id}/pdf`, '_blank')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                    >
                        <Printer size={18} /> Print
                    </button>
                    {canModify && !isPaid && invoice.status !== 'VOIDED' && (
                        <>
                            <button
                                onClick={async () => {
                                    if (confirm("Are you sure you want to VOID this invoice? This action cannot be undone.")) {
                                        try {
                                            const res = await fetchWithAuth(`/api/sales/invoices/${id}/void`, { method: "POST" });
                                            if (res.ok) fetchInvoice();
                                            else alert("Failed to void invoice");
                                        } catch (e) {
                                            alert("Error voiding invoice");
                                        }
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-100 transition-colors"
                            >
                                <Ban size={18} /> Void
                            </button>
                            <button
                                onClick={() => setShowPaymentModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
                            >
                                <CreditCard size={18} /> Add Payment
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* Main Content */}
                <div className="space-y-6">

                    {/* Items Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="font-black text-lg text-slate-800 flex items-center gap-2">
                                <Receipt size={20} className="text-slate-400" />
                                Invoice Items
                            </h2>
                            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                                {invoice.items?.length || 0} Items
                            </span>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 tracking-wider">Item</th>
                                    <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 tracking-wider text-end">Qty</th>
                                    <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 tracking-wider text-end">Price</th>
                                    <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 tracking-wider text-end">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {invoice.items?.map((item: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-700 text-sm">{item.product_name}</p>
                                        </td>
                                        <td className="px-6 py-4 text-end font-mono text-sm font-bold text-slate-600">
                                            {item.quantity}
                                        </td>
                                        <td className="px-6 py-4 text-end font-mono text-sm font-bold text-slate-600">
                                            {formatIQD(item.price)}
                                        </td>
                                        <td className="px-6 py-4 text-end font-mono text-sm font-black text-slate-900">
                                            {formatIQD(item.total || (item.quantity * item.price))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Notes */}
                    {invoice.notes && (
                        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                            <h3 className="text-xs font-black uppercase tracking-wider text-amber-800 mb-2 flex items-center gap-2">
                                <AlertCircle size={14} /> Notes
                            </h3>
                            <p className="text-sm font-medium text-amber-900">{invoice.notes}</p>
                        </div>
                    )}
                </div>

                {/* Verticalized Sidebar Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                            <UserIcon size={14} /> Customer Details
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-black text-slate-800">{invoice.customer_name}</p>
                                <p className="text-xs font-bold text-slate-400">ID: {invoice.customer_id?.substring(0, 8)}...</p>
                            </div>
                            {invoice.customer_phone && (
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                    <Phone size={14} className="text-slate-400" />
                                    {invoice.customer_phone}
                                </div>
                            )}
                            {invoice.warehouse_name && (
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                    <MapPin size={14} className="text-slate-400" />
                                    {invoice.warehouse_name}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="bg-slate-900 rounded-2xl shadow-xl shadow-slate-900/10 p-6 text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Receipt size={100} />
                        </div>
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-6 relative z-10">Payment Summary</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-bold">Subtotal</span>
                                    <span className="font-mono font-bold">{formatIQD(invoice.subtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-bold">Discount</span>
                                    <span className="font-mono font-bold text-emerald-400">-{formatIQD(invoice.discount)}</span>
                                </div>
                                <div className="h-px bg-slate-800 my-2" />
                                <div className="flex justify-between items-center text-lg">
                                    <span className="font-black">Total</span>
                                    <span className="font-mono font-black">{formatIQD(total)}</span>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 rounded-xl p-4 space-y-2 border border-slate-700/50">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-emerald-400 font-bold flex items-center gap-2">
                                        <CheckCircle size={14} /> Paid
                                    </span>
                                    <span className="font-mono font-bold text-emerald-400">{formatIQD(paid)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className={`font-bold flex items-center gap-2 ${remaining > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                        <AlertCircle size={14} /> Remaining
                                    </span>
                                    <span className={`font-mono font-bold ${remaining > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                        {formatIQD(remaining)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-lg text-slate-900">Add Payment</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <Ban size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">Amount (IQD)</label>
                                <input
                                    type="number"
                                    autoFocus
                                    className="w-full text-lg font-mono font-bold p-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300"
                                    placeholder={String(remaining)}
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                />
                                <div className="mt-2 flex justify-between text-xs font-bold text-slate-400">
                                    <span>Remaining: {formatIQD(remaining)}</span>
                                    <button
                                        onClick={() => setPaymentAmount(String(remaining))}
                                        className="text-blue-600 hover:underline"
                                    >
                                        Pay Full Amount
                                    </button>
                                </div>
                            </div>

                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePayment}
                                disabled={processingPayment}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-sm flex items-center gap-2"
                            >
                                {processingPayment ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
