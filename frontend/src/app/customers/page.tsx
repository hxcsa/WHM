"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { Plus, Search, Phone, Edit2, Trash2, History, DollarSign, User, CheckCircle, AlertCircle, X, MapPin, Mail, CreditCard } from "lucide-react";

interface Customer {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    address: string;
    balance: string;
    total_purchases: string;
}

interface Purchase {
    id: string;
    invoice_number: string;
    total_amount: string;
    payment_status: string;
    created_at: string;
}

interface PaymentHistory {
    id: string;
    amount: string;
    payment_method: string;
    notes?: string;
    created_at: string;
}

interface CustomerSummary {
    invoice_count: number;
    total_invoiced: string;
    total_paid_on_invoices: string;
    total_manual_payments: string;
    outstanding: string;
    credit_available: string;
}

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error';
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [showDetails, setShowDetails] = useState<Customer | null>(null);
    const [showPayment, setShowPayment] = useState<Customer | null>(null);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        address: ""
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [paymentAmount, setPaymentAmount] = useState("");
    const [customerPurchases, setCustomerPurchases] = useState<Purchase[]>([]);
    const [customerPayments, setCustomerPayments] = useState<PaymentHistory[]>([]);
    const [customerSummary, setCustomerSummary] = useState<CustomerSummary | null>(null);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const fetchCustomers = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/customers", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setCustomers(await res.json());
            }
        } catch (error) {
            console.error("Error fetching customers:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomerPurchases = async (customerId: string) => {
        setCustomerPurchases([]);
        setCustomerPayments([]);
        setCustomerSummary(null);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/customers/${customerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCustomerPurchases(data.purchases || []);
                setCustomerPayments(data.payments || []);
                setCustomerSummary(data.summary || null);
            }
        } catch (error) {
            console.error("Error fetching purchases:", error);
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.first_name.trim()) {
            newErrors.first_name = "First name is required";
        }
        if (!formData.phone.trim()) {
            newErrors.phone = "Phone number is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const isFormValid = () => {
        return formData.first_name.trim() && formData.phone.trim();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        if (submitting) return;

        setSubmitting(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : "/api/customers";
            const method = editingCustomer ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                showToast(editingCustomer ? "Customer updated successfully!" : "Customer created successfully!");
                setShowModal(false);
                setEditingCustomer(null);
                setFormData({
                    first_name: "",
                    last_name: "",
                    phone: "",
                    email: "",
                    address: ""
                });
                setErrors({});
                fetchCustomers();
            } else {
                const raw = await res.text();
                let detail = "Failed to save customer";
                try {
                    const errorData = JSON.parse(raw);
                    detail = errorData.detail || detail;
                } catch {
                    if (raw) detail = raw;
                }
                showToast(detail, "error");
            }
        } catch (error) {
            console.error("Error saving customer:", error);
            showToast("An error occurred while saving", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showPayment || !paymentAmount) return;

        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/customers/${showPayment.id}/payment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: parseFloat(paymentAmount),
                    payment_method: "cash"
                })
            });

            if (res.ok) {
                showToast("Payment recorded successfully!");
                setShowPayment(null);
                setPaymentAmount("");
                fetchCustomers();
            } else {
                showToast("Failed to record payment", "error");
            }
        } catch (error) {
            console.error("Error processing payment:", error);
            showToast("An error occurred", "error");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this customer?")) return;

        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/customers/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                showToast("Customer deleted successfully!");
                fetchCustomers();
            } else {
                showToast("Failed to delete customer", "error");
            }
        } catch (error) {
            console.error("Error deleting customer:", error);
            showToast("An error occurred while deleting", "error");
        }
    };

    const filteredCustomers = customers.filter(customer => {
        const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return fullName.includes(searchLower) || customer.phone.includes(searchLower);
    });

    const formatCurrency = (amount: string) => {
        return new Intl.NumberFormat('en-IQ', {
            style: 'currency',
            currency: 'IQD',
            minimumFractionDigits: 0
        }).format(parseFloat(amount));
    };

    const totalOutstanding = customers.reduce((sum, c) => sum + Math.max(0, parseFloat(c.balance || '0')), 0);
    const totalCredits = customers.reduce((sum, c) => sum + Math.max(0, -parseFloat(c.balance || '0')), 0);
    const topBuyer = [...customers].sort((a, b) => parseFloat(b.total_purchases || '0') - parseFloat(a.total_purchases || '0'))[0];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-[100] space-y-2">
                {toasts.map(toast => (
                    <div key={toast.id} className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl text-white transition-all transform scale-100 ${toast.type === 'success' ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'
                        }`}>
                        {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span className="font-medium">{toast.message}</span>
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)]">Customers</h1>
                    <p className="text-[var(--ink-soft)] mt-1">Manage client profiles, balances, and transaction history</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCustomer(null);
                        setFormData({
                            first_name: "",
                            last_name: "",
                            phone: "",
                            email: "",
                            address: ""
                        });
                        setErrors({});
                        setShowModal(true);
                    }}
                    className="opengate-button-primary flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg shadow-[var(--accent-thin)] active:scale-95 transition-all w-full sm:w-auto"
                >
                    <Plus size={20} />
                    Add Customer
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="surface-card p-6 border border-[var(--ink-thin)]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--accent-thin)] flex items-center justify-center text-[var(--accent)]">
                            <User size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-[var(--ink-soft)]">Top Client</p>
                            <h3 className="text-lg font-bold text-[var(--ink)] truncate max-w-[150px]">
                                {topBuyer ? `${topBuyer.first_name} ${topBuyer.last_name}` : 'No Customers'}
                            </h3>
                        </div>
                    </div>
                    {topBuyer && (
                        <div className="mt-4 pt-4 border-t border-[var(--bg-soft)]">
                            <p className="text-xs text-[var(--ink-soft)]">Total Purchasing Volume</p>
                            <p className="text-xl font-black text-[var(--accent)]">{formatCurrency(topBuyer.total_purchases)}</p>
                        </div>
                    )}
                </div>

                <div className="surface-card p-6 border border-[var(--ink-thin)]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--danger-thin)] flex items-center justify-center text-[var(--danger)]">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-[var(--ink-soft)]">Total Receivables</p>
                            <h3 className="text-2xl font-black text-[var(--danger)]">{formatCurrency(String(totalOutstanding))}</h3>
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-[var(--ink-soft)]">Outstanding credit across all accounts</p>
                </div>

                <div className="surface-card p-6 border border-[var(--ink-thin)]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--success-thin)] flex items-center justify-center text-[var(--success)]">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-[var(--ink-soft)]">Customer Credits</p>
                            <h3 className="text-2xl font-black text-[var(--success)]">{formatCurrency(String(totalCredits))}</h3>
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-[var(--ink-soft)]">Credit balances available for future purchases</p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-soft)] group-focus-within:text-[var(--accent)] transition-colors" size={20} />
                <input
                    type="text"
                    placeholder="Quick search by name or contact number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="enterprise-input pl-12 h-14 text-lg bg-[var(--bg)] border-[var(--ink-thin)] focus:bg-white transition-all shadow-sm"
                />
            </div>

            {/* Customers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.map((customer) => (
                    <div key={customer.id} className="enterprise-card group hover:scale-[1.02] transition-transform">
                        <div className="p-6 border-b border-[var(--bg-soft)]">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[var(--accent-thin)]">
                                        {customer.first_name[0]}{customer.last_name[0]}
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <h3 className="font-bold text-lg text-[var(--ink)] truncate">
                                            {customer.first_name} {customer.last_name}
                                        </h3>
                                        <div className="flex items-center gap-2 text-sm text-[var(--ink-soft)] font-medium">
                                            <Phone size={14} className="text-[var(--accent)]" />
                                            {customer.phone}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingCustomer(customer);
                                            setFormData({
                                                first_name: customer.first_name,
                                                last_name: customer.last_name,
                                                phone: customer.phone,
                                                email: customer.email,
                                                address: customer.address
                                            });
                                            setErrors({});
                                            setShowModal(true);
                                        }}
                                        className="p-2 rounded-lg text-[var(--ink-soft)] hover:text-[var(--accent)] hover:bg-[var(--accent-thin)] transition-all"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(customer.id)}
                                        className="p-2 rounded-lg text-[var(--ink-soft)] hover:text-[var(--danger)] hover:bg-[var(--danger-thin)] transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-[var(--bg)]/30 space-y-4">
                            <div className="flex justify-between items-center group/item">
                                <span className="text-sm font-semibold text-[var(--ink-soft)]">Lifetime Purchases</span>
                                <span className="font-black text-[var(--ink)]">
                                    {formatCurrency(customer.total_purchases)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-white border border-[var(--ink-thin)]">
                                <span className="text-sm font-semibold text-[var(--ink-soft)]">Account Status</span>
                                <span className={`font-black text-sm px-3 py-1 rounded-full ${parseFloat(customer.balance) > 0
                                    ? 'bg-[var(--danger-thin)] text-[var(--danger)]'
                                    : parseFloat(customer.balance) < 0
                                        ? 'bg-[var(--success-thin)] text-[var(--success)]'
                                        : 'bg-[var(--bg-soft)] text-[var(--ink-soft)]'
                                    }`}>
                                    {parseFloat(customer.balance) < 0
                                        ? `Credit: ${formatCurrency(String(Math.abs(parseFloat(customer.balance))))}`
                                        : parseFloat(customer.balance) > 0
                                            ? `Owes: ${formatCurrency(customer.balance)}`
                                            : 'Balanced'}
                                </span>
                            </div>
                        </div>

                        <div className="p-4 grid grid-cols-2 gap-3">
                            <button
                                onClick={() => {
                                    setShowDetails(customer);
                                    fetchCustomerPurchases(customer.id);
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--ink-thin)] text-[var(--ink)] hover:bg-[var(--bg-soft)] font-bold text-sm transition-all"
                            >
                                <History size={16} />
                                History
                            </button>
                            {parseFloat(customer.balance) > 0 ? (
                                <button
                                    onClick={() => setShowPayment(customer)}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--success)] text-white font-bold text-sm shadow-md shadow-[var(--success-thin)] hover:brightness-110 active:scale-95 transition-all"
                                >
                                    <DollarSign size={16} />
                                    Pay Now
                                </button>
                            ) : (
                                <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-soft)] text-[var(--ink-soft)] font-bold text-sm">
                                    <CheckCircle size={16} />
                                    No Debt
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredCustomers.length === 0 && (
                <div className="text-center py-24 bg-[var(--bg)] rounded-3xl border-2 border-dashed border-[var(--ink-thin)]">
                    <div className="w-20 h-20 bg-[var(--bg-soft)] rounded-full flex items-center justify-center mx-auto mb-6">
                        <User size={40} className="text-[var(--ink-soft)]" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--ink)]">No Customers Found</h3>
                    <p className="text-[var(--ink-soft)] mt-2">Try adjusting your search or add a new customer.</p>
                </div>
            )}

            {/* Customer History Modal */}
            {showDetails && (
                <div className="fixed inset-0 bg-[var(--ink)]/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-300">
                    <div className="enterprise-modal max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-8 border-b border-[var(--bg-soft)] flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-[var(--accent-thin)] flex items-center justify-center text-[var(--accent)]">
                                    <User size={32} />
                                </div>
                                <div className="text-left">
                                    <h2 className="text-2xl font-black text-[var(--ink)]">
                                        {showDetails.first_name} {showDetails.last_name}
                                    </h2>
                                    <div className="flex items-center gap-4 mt-1">
                                        <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--ink-soft)]">
                                            <Phone size={14} className="text-[var(--accent)]" /> {showDetails.phone}
                                        </span>
                                        {showDetails.email && (
                                            <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--ink-soft)]">
                                                <Mail size={14} className="text-[var(--accent)]" /> {showDetails.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetails(null)}
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--bg-soft)] hover:text-[var(--ink)] transition-colors"
                            >
                                <X size={28} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                            {/* Summary Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-5 rounded-2xl bg-[var(--bg)] border border-[var(--ink-thin)] text-left">
                                    <p className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wider mb-1">Invoice Count</p>
                                    <p className="text-2xl font-black text-[var(--ink)]">{customerSummary?.invoice_count ?? customerPurchases.length}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-[var(--bg)] border border-[var(--ink-thin)] text-left">
                                    <p className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wider mb-1">Total Volume</p>
                                    <p className="text-2xl font-black text-[var(--ink)]">{formatCurrency(customerSummary?.total_invoiced || '0')}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-[var(--danger-thin)] border border-[var(--danger)]/10 text-left">
                                    <p className="text-xs font-bold text-[var(--danger)] uppercase tracking-wider mb-1">Outstanding</p>
                                    <p className="text-2xl font-black text-[var(--danger)]">{formatCurrency(customerSummary?.outstanding || '0')}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-[var(--success-thin)] border border-[var(--success)]/10 text-left">
                                    <p className="text-xs font-bold text-[var(--success)] uppercase tracking-wider mb-1">Credit Balance</p>
                                    <p className="text-2xl font-black text-[var(--success)]">{formatCurrency(customerSummary?.credit_available || '0')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Invoices Table */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black text-[var(--ink)]">Invoices</h3>
                                        <span className="px-3 py-1 bg-[var(--bg-soft)] rounded-lg text-xs font-bold text-[var(--ink-soft)] group">
                                            {customerPurchases.length} Total
                                        </span>
                                    </div>
                                    <div className="enterprise-table rounded-2xl overflow-hidden border border-[var(--ink-thin)] shadow-sm overflow-x-auto">
                                        <table className="w-full text-sm min-w-[500px]">
                                            <thead>
                                                <tr className="bg-[var(--bg)]">
                                                    <th className="text-left px-5 py-4 font-bold text-[var(--ink-soft)]">Reference</th>
                                                    <th className="text-left px-5 py-4 font-bold text-[var(--ink-soft)]">Amount</th>
                                                    <th className="text-left px-5 py-4 font-bold text-[var(--ink-soft)]">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--bg-soft)]">
                                                {customerPurchases.map((p) => (
                                                    <tr key={p.id} className="hover:bg-[var(--bg)] transition-colors">
                                                        <td className="px-5 py-4 font-bold text-[var(--ink)]">#{p.invoice_number}</td>
                                                        <td className="px-5 py-4 font-black text-[var(--ink)]">{formatCurrency(p.total_amount)}</td>
                                                        <td className="px-5 py-4">
                                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${p.payment_status?.toLowerCase() === 'paid' ? 'bg-[var(--success-thin)] text-[var(--success)]' : 'bg-[var(--warning-thin)] text-[var(--warning)]'
                                                                }`}>
                                                                {p.payment_status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {customerPurchases.length === 0 && (
                                                    <tr><td colSpan={3} className="px-5 py-12 text-center text-[var(--ink-soft)] font-medium">No purchase records found.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Payment History Table */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black text-[var(--ink)]">Payment History</h3>
                                        <span className="px-3 py-1 bg-[var(--bg-soft)] rounded-lg text-xs font-bold text-[var(--ink-soft)]">
                                            {customerPayments.length} Entries
                                        </span>
                                    </div>
                                    <div className="enterprise-table rounded-2xl overflow-hidden border border-[var(--ink-thin)] shadow-sm overflow-x-auto">
                                        <table className="w-full text-sm min-w-[500px]">
                                            <thead>
                                                <tr className="bg-[var(--bg)]">
                                                    <th className="text-left px-5 py-4 font-bold text-[var(--ink-soft)]">Date</th>
                                                    <th className="text-left px-5 py-4 font-bold text-[var(--ink-soft)]">Amount</th>
                                                    <th className="text-left px-5 py-4 font-bold text-[var(--ink-soft)]">Method</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--bg-soft)]">
                                                {customerPayments.map((p) => (
                                                    <tr key={p.id} className="hover:bg-[var(--bg)] transition-colors">
                                                        <td className="px-5 py-4 font-medium text-[var(--ink-soft)]">
                                                            {p.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                                        </td>
                                                        <td className="px-5 py-4 font-black text-[var(--success)]">+{formatCurrency(p.amount)}</td>
                                                        <td className="px-5 py-4">
                                                            <span className="px-2.5 py-1 bg-[var(--bg-soft)] rounded-lg text-xs font-bold text-[var(--ink)] uppercase">
                                                                {p.payment_method}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {customerPayments.length === 0 && (
                                                    <tr><td colSpan={3} className="px-5 py-12 text-center text-[var(--ink-soft)] font-medium">No payment history found.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-[var(--bg)] border-t border-[var(--ink-thin)] flex justify-end">
                            <button
                                onClick={() => setShowDetails(null)}
                                className="px-8 py-3 rounded-xl bg-[var(--ink)] text-white font-bold hover:brightness-125 transition-all"
                            >
                                Close History
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-[var(--ink)]/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in zoom-in duration-300">
                    <div className="enterprise-modal max-w-xl w-full flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-[var(--bg-soft)] flex items-center justify-between text-left">
                            <div>
                                <h2 className="text-2xl font-black text-[var(--ink)]">
                                    {editingCustomer ? "Refine Customer" : "New Customer"}
                                </h2>
                                <p className="text-[var(--ink-soft)] font-medium mt-1">
                                    {editingCustomer ? "Modify existing client records" : "Create a new entry in the registry"}
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--bg-soft)] transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 text-left">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-[var(--ink)]">First Name <span className="text-[var(--danger)]">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="E.g. Ali"
                                        value={formData.first_name}
                                        onChange={(e) => {
                                            setFormData({ ...formData, first_name: e.target.value });
                                            if (errors.first_name) setErrors({ ...errors, first_name: '' });
                                        }}
                                        className={`enterprise-input ${errors.first_name ? 'border-[var(--danger)]' : ''}`}
                                    />
                                    {errors.first_name && <p className="text-[var(--danger)] text-xs font-bold uppercase tracking-tight">{errors.first_name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-[var(--ink)]">Last Name</label>
                                    <input
                                        type="text"
                                        placeholder="E.g. Hassan"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="enterprise-input"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[var(--ink)]">Contact Number <span className="text-[var(--danger)]">*</span></label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" size={18} />
                                    <input
                                        type="tel"
                                        placeholder="+964..."
                                        value={formData.phone}
                                        onChange={(e) => {
                                            setFormData({ ...formData, phone: e.target.value });
                                            if (errors.phone) setErrors({ ...errors, phone: '' });
                                        }}
                                        className={`enterprise-input pl-10 ${errors.phone ? 'border-[var(--danger)]' : ''}`}
                                    />
                                </div>
                                {errors.phone && <p className="text-[var(--danger)] text-xs font-bold uppercase tracking-tight">{errors.phone}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[var(--ink)]">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" size={18} />
                                    <input
                                        type="email"
                                        placeholder="client@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="enterprise-input pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[var(--ink)]">Physical Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-[var(--ink-soft)]" size={18} />
                                    <textarea
                                        rows={3}
                                        placeholder="City, Street, Building..."
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="enterprise-input pl-10 py-3 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-6 py-3 rounded-xl border-2 border-[var(--ink-thin)] text-[var(--ink)] font-bold hover:bg-[var(--bg-soft)] transition-all"
                                >
                                    Dismiss
                                </button>
                                <button
                                    type="submit"
                                    disabled={!isFormValid() || submitting}
                                    className="flex-1 opengate-button-primary px-6 py-3 rounded-xl font-black shadow-xl shadow-[var(--accent-thin)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {submitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Processing...
                                        </span>
                                    ) : (
                                        editingCustomer ? "Commit Changes" : "Create Record"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPayment && (
                <div className="fixed inset-0 bg-[var(--ink)]/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in zoom-in duration-300">
                    <div className="enterprise-modal max-w-md w-full flex flex-col shadow-2xl overflow-hidden text-left">
                        <div className="p-8 border-b border-[var(--bg-soft)] flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-[var(--ink)]">
                                    Collect Payment
                                </h2>
                                <p className="text-[var(--ink-soft)] font-medium mt-1">
                                    Entry for {showPayment.first_name} {showPayment.last_name}
                                </p>
                            </div>
                            <button onClick={() => setShowPayment(null)} className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--bg-soft)] transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handlePayment} className="p-8 space-y-6">
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--danger-thin)] to-transparent border border-[var(--danger)]/10">
                                <p className="text-xs font-black text-[var(--danger)] uppercase tracking-widest mb-1">Current Indebtedness</p>
                                <p className="text-4xl font-black text-[var(--danger)] tracking-tight">
                                    {formatCurrency(showPayment.balance)}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[var(--ink)] uppercase tracking-wider">
                                    Receipt Amount (IQD)
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" size={20} />
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={parseFloat(showPayment.balance)}
                                        required
                                        autoFocus
                                        placeholder="0.00"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="enterprise-input pl-10 text-xl font-black h-14"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPayment(null);
                                        setPaymentAmount("");
                                    }}
                                    className="flex-1 px-6 py-3 rounded-xl border-2 border-[var(--ink-thin)] text-[var(--ink)] font-bold hover:bg-[var(--bg-soft)] transition-all"
                                >
                                    Dismiss
                                </button>
                                <button
                                    type="submit"
                                    disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                                    className="flex-1 bg-[var(--success)] text-white px-6 py-3 rounded-xl font-black shadow-xl shadow-[var(--success-thin)] active:scale-95 disabled:opacity-50 transition-all hover:brightness-110"
                                >
                                    Record Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
