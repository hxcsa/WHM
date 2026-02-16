"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import InvoiceFilterBar from "@/components/InvoiceFilterBar";
import InvoiceTable from "@/components/InvoiceTable";
import { Plus, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [role, setRole] = useState("viewer");
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, page_size: 50, total_count: -1 });
    const { t } = useLanguage();
    const router = useRouter();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            setAuthUser(user);
            setAuthReady(true);
            if (user) {
                try {
                    const tokenResult = await user.getIdTokenResult();
                    if (tokenResult.claims.role) {
                        setRole(tokenResult.claims.role as string);
                    }
                } catch (e) {
                    console.error("Failed to get role:", e);
                }
            }
        });
        return () => unsub();
    }, []);

    const fetchData = useCallback(async () => {
        if (!authReady || !authUser) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            params.set("page", String(pagination.page));
            params.set("page_size", String(pagination.page_size));

            const res = await fetchWithAuth(`/api/sales/invoices?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setInvoices(Array.isArray(data) ? data : data.invoices || []);
                if (data.total_count !== undefined) {
                    setPagination(prev => ({ ...prev, total_count: data.total_count }));
                }
            } else if (res.status === 401) {
                setError("Session expired. Please refresh the page.");
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.detail || "Failed to fetch invoices");
            }
        } catch (error: any) {
            console.error("Error fetching invoices:", error);
            setError(error.message || "Network error");
        } finally {
            setLoading(false);
        }
    }, [filters, refreshTrigger, pagination.page, authReady, authUser]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = async (action: string, invoice: any) => {
        if (action === 'view') {
            router.push(`/sales/${invoice.id}`);
        } else if (action === 'print') {
            window.open(`/api/sales/invoices/${invoice.id}/pdf`, '_blank');
        } else if (action === 'whatsapp') {
            const text = `Hello ${invoice.customer_name || 'Valued Customer'},%0A%0AHere is your invoice *${invoice.invoice_number}* for *${Number(invoice.total).toLocaleString()} IQD*.%0A%0AThank you for your business!`;
            const phone = invoice.customer_phone || prompt("Enter customer phone number (e.g., 9647xxxxxxxxx):");
            if (phone) {
                window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
            }
        } else if (action === 'pay') {
            const amountStr = prompt(
                `Enter payment amount for ${invoice.invoice_number}\nRemaining: ${Number(invoice.remaining_amount || invoice.total).toLocaleString()} IQD`,
                String(invoice.remaining_amount || invoice.total)
            );
            if (amountStr) {
                const amount = parseFloat(amountStr);
                if (isNaN(amount) || amount <= 0) return alert("Invalid amount");
                try {
                    const res = await fetchWithAuth(
                        `/api/sales/invoices/${invoice.id}/pay?amount=${amount}&payment_method=CASH`,
                        { method: "POST" }
                    );
                    if (res.ok) {
                        setRefreshTrigger(prev => prev + 1);
                    } else {
                        const err = await res.json().catch(() => ({}));
                        alert(err.detail || "Payment failed");
                    }
                } catch (e) {
                    alert("Error processing payment");
                }
            }
        } else if (action === 'void') {
            if (confirm(`Are you sure you want to VOID invoice ${invoice.invoice_number}?\nThis action is permanent.`)) {
                const reason = prompt("Enter void reason:") || "User cancelled";
                try {
                    const res = await fetchWithAuth(
                        `/api/sales/invoices/${invoice.id}/void?reason=${encodeURIComponent(reason)}`,
                        { method: "POST" }
                    );
                    if (res.ok) {
                        setRefreshTrigger(prev => prev + 1);
                    } else {
                        const err = await res.json().catch(() => ({}));
                        alert(err.detail || "Void failed");
                    }
                } catch (e) {
                    alert("Error voiding invoice");
                }
            }
        }
    };

    const stats = useMemo(() => {
        let totalSales = 0;
        let totalPaid = 0;
        let totalPending = 0;

        invoices.forEach(inv => {
            if (inv.status !== 'VOID' && inv.status !== 'VOIDED') {
                const total = Number(inv.total_amount || 0);
                const paid = Number(inv.amount_paid || 0);
                totalSales += total;
                totalPaid += paid;
                totalPending += (total - paid);
            }
        });

        return { totalSales, totalPaid, totalPending };
    }, [invoices]);

    const fmtIQD = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 font-heading">Invoices</h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Manage customer invoices and track payments</p>
                </div>

                {(role === "admin" || role === "accountant") && (
                    <button
                        onClick={() => router.push("/sales/new")}
                        className="hidden sm:flex bg-emerald-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 font-black text-xs sm:text-sm uppercase tracking-wider active:scale-95"
                    >
                        <Plus size={18} />
                        <span>New Invoice</span>
                    </button>
                )}
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                <div className="enterprise-card p-3 sm:p-4 lg:p-6 flex items-center gap-2 sm:gap-4 relative overflow-hidden group hover:shadow-lg transition-shadow duration-300">
                    <div className="absolute end-0 top-0 p-2 sm:p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp size={40} className="sm:w-20 text-blue-600" />
                    </div>
                    <div className="p-2 sm:p-3 lg:p-4 bg-blue-100 rounded-xl lg:rounded-2xl text-blue-600">
                        <TrendingUp size={18} className="sm:w-6 lg:w-8" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">Total Sales</p>
                        <p className="text-sm sm:text-lg lg:text-2xl font-black text-slate-800 font-mono mt-0.5 truncate">{fmtIQD(stats.totalSales)}</p>
                    </div>
                </div>

                <div className="enterprise-card p-3 sm:p-4 lg:p-6 flex items-center gap-2 sm:gap-4 relative overflow-hidden group hover:shadow-lg transition-shadow duration-300">
                    <div className="absolute end-0 top-0 p-2 sm:p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <CheckCircle size={40} className="sm:w-20 text-emerald-600" />
                    </div>
                    <div className="p-2 sm:p-3 lg:p-4 bg-emerald-100 rounded-xl lg:rounded-2xl text-emerald-600">
                        <CheckCircle size={18} className="sm:w-6 lg:w-8" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">Received</p>
                        <p className="text-sm sm:text-lg lg:text-2xl font-black text-slate-800 font-mono mt-0.5 truncate">{fmtIQD(stats.totalPaid)}</p>
                    </div>
                </div>

                <div className="enterprise-card p-3 sm:p-4 lg:p-6 flex items-center gap-2 sm:gap-4 relative overflow-hidden group hover:shadow-lg transition-shadow duration-300 col-span-2 lg:col-span-1">
                    <div className="absolute end-0 top-0 p-2 sm:p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock size={40} className="sm:w-20 text-amber-500" />
                    </div>
                    <div className="p-2 sm:p-3 lg:p-4 bg-amber-100 rounded-xl lg:rounded-2xl text-amber-500">
                        <Clock size={18} className="sm:w-6 lg:w-8" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">Pending</p>
                        <p className="text-sm sm:text-lg lg:text-2xl font-black text-slate-800 font-mono mt-0.5 truncate">{fmtIQD(stats.totalPending)}</p>
                    </div>
                </div>
            </div>

            <InvoiceFilterBar onFilterChange={(f) => { setFilters(f); setPagination(prev => ({ ...prev, page: 1 })); }} />

            {error ? (
                <div className="enterprise-card border-l-4 border-rose-500 p-6 sm:p-8 text-center">
                    <p className="text-rose-600 font-bold mb-3 text-sm">{error}</p>
                    <button
                        onClick={() => { setError(null); setRefreshTrigger(prev => prev + 1); }}
                        className="px-6 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition-all"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <InvoiceTable
                    invoices={invoices}
                    loading={loading}
                    onAction={handleAction}
                    role={role}
                />
            )}
        </div>
    );
}
