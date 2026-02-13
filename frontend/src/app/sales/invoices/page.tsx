"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import InvoiceFilterBar from "@/components/InvoiceFilterBar";
import InvoiceTable from "@/components/InvoiceTable";
import { Plus, FileText, TrendingUp, CheckCircle, Clock } from "lucide-react";
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
    const [pagination, setPagination] = useState({ page: 1, page_size: 50, total_count: -1 }); // Increased page size for better stats
    const { t } = useLanguage();
    const router = useRouter();

    // Wait for Firebase Auth to initialize before doing anything
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
            // router.push(`/sales/invoices/${invoice.id}`);
            alert("View Details Coming Soon");
        } else if (action === 'print') {
            window.open(`/api/sales/invoices/${invoice.id}/pdf`, '_blank');
        } else if (action === 'whatsapp') {
            const text = `Hello ${invoice.customer_name || 'Valued Customer'},%0A%0AHere is your invoice *${invoice.invoice_number}* for *${Number(invoice.total).toLocaleString()} IQD*.%0A%0AThank you for your business!`;
            // Assuming customer_phone is available in invoice object, otherwise prompt
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

    // Calculate Analytics from loaded invoices
    const stats = useMemo(() => {
        let totalSales = 0;
        let totalPaid = 0;
        let totalPending = 0;

        invoices.forEach(inv => {
            if (inv.status !== 'VOID') {
                totalSales += (inv.total || 0);
                totalPaid += (inv.paid_amount || 0);
                totalPending += (inv.remaining_amount || (inv.status === 'PAID' ? 0 : inv.total));
            }
        });

        return { totalSales, totalPaid, totalPending };
    }, [invoices]);

    const fmtIQD = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 font-heading">Invoices / الفواتير</h1>
                    <p className="text-sm text-slate-500 font-medium">Manage customer invoices, track payments, and audit document lifecycle</p>
                </div>

                {(role === "admin" || role === "accountant") && (
                    <button
                        onClick={() => router.push("/sales/invoices/new")}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 font-black text-sm uppercase tracking-wider active:scale-95"
                    >
                        <Plus size={20} /> Create New Invoice
                    </button>
                )}
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 flex items-center gap-4 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="absolute end-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp size={80} className="text-primary" />
                    </div>
                    <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                        <TrendingUp size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Sales / المبيعات</p>
                        <p className="text-2xl font-black text-slate-800 font-mono mt-1">{fmtIQD(stats.totalSales)}</p>
                    </div>
                </div>

                <div className="glass-panel p-6 flex items-center gap-4 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="absolute end-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <CheckCircle size={80} className="text-emerald-600" />
                    </div>
                    <div className="p-4 bg-emerald-100/50 rounded-2xl text-emerald-600">
                        <CheckCircle size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Received / المستلم</p>
                        <p className="text-2xl font-black text-slate-800 font-mono mt-1">{fmtIQD(stats.totalPaid)}</p>
                    </div>
                </div>

                <div className="glass-panel p-6 flex items-center gap-4 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="absolute end-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock size={80} className="text-amber-500" />
                    </div>
                    <div className="p-4 bg-amber-100/50 rounded-2xl text-amber-500">
                        <Clock size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Pending / المعلق</p>
                        <p className="text-2xl font-black text-slate-800 font-mono mt-1">{fmtIQD(stats.totalPending)}</p>
                    </div>
                </div>
            </div>

            <InvoiceFilterBar onFilterChange={(f) => { setFilters(f); setPagination(prev => ({ ...prev, page: 1 })); }} />

            {error ? (
                <div className="glass-panel border-s-4 border-s-rose-500 p-8 text-center">
                    <p className="text-rose-600 font-bold mb-3">{error}</p>
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
