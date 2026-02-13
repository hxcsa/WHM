"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { Plus, Trash2, Send, ShoppingCart, User, Eye, Download, X, Search, CreditCard, DollarSign, FileText, AlertCircle, CheckCircle, Package, ArrowRight, Wallet } from "lucide-react";

interface Invoice {
    id: string;
    invoice_number: string;
    customer_name: string;
    customer_phone?: string;
    total_amount: string;
    amount_paid: string;
    credit_applied?: string;
    effective_paid?: string;
    payment_status: string;
    payment_method: string;
    status: string;
    created_at: string;
    items?: InvoiceItem[];
    notes?: string;
}

interface Customer {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    balance?: string;
}

interface Product {
    id: string;
    name: string;
    selling_price: string;
    cost_price: string;
    current_qty: string;
    pricing_type: string;
    description?: string;
}

interface InvoiceItem {
    product_id: string;
    product_name: string;
    description?: string;
    quantity: number;
    list_price?: number;
    price: number;
    discount_amount?: number;
    total: number;
}

interface CompanyProfile {
    company_name: string;
    description: string;
    location: string;
    phone: string;
    email: string;
    website: string;
    invoice_note: string;
    payment_details: string;
}

export default function SalesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
        company_name: "Warehouse Pro",
        description: "",
        location: "",
        phone: "",
        email: "",
        website: "",
        invoice_note: "",
        payment_details: "",
    });
    const [showModal, setShowModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [loadingInvoice, setLoadingInvoice] = useState(false);

    // Invoice form state
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [searchCustomer, setSearchCustomer] = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [showQuickCustomer, setShowQuickCustomer] = useState(false);
    const [quickCustomer, setQuickCustomer] = useState({
        first_name: "",
        last_name: "",
        phone: "",
    });
    const [quickCustomerSaving, setQuickCustomerSaving] = useState(false);
    const [quickCustomerError, setQuickCustomerError] = useState("");
    const [searchProduct, setSearchProduct] = useState("");
    const [amountPaid, setAmountPaid] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [notes, setNotes] = useState("");

    // Current item being added
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [currentQuantity, setCurrentQuantity] = useState(1);
    const [currentPrice, setCurrentPrice] = useState("");
    const [itemValidationError, setItemValidationError] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();

            // Fetch invoices
            const invoicesRes = await fetch("/api/invoices", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (invoicesRes.ok) setInvoices(await invoicesRes.json());

            // Fetch customers
            const customersRes = await fetch("/api/customers", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (customersRes.ok) setCustomers(await customersRes.json());

            // Fetch products
            const productsRes = await fetch("/api/products", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (productsRes.ok) setProducts(await productsRes.json());

            const profileRes = await fetch("/api/company/profile", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (profileRes.ok) {
                const profile = await profileRes.json();
                setCompanyProfile((prev) => ({ ...prev, ...profile }));
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        return { subtotal, total: subtotal };
    };

    const selectedCustomerCredit =
        selectedCustomer && parseFloat(selectedCustomer.balance || "0") < 0
            ? Math.abs(parseFloat(selectedCustomer.balance || "0"))
            : 0;
    const totals = calculateTotals();
    const dueAfterCredit = Math.max(0, totals.total - selectedCustomerCredit);

    const handleAddItem = () => {
        if (!currentProduct || currentQuantity <= 0) return;

        const listPrice = parseFloat(currentProduct.selling_price) || 0;
        const price = parseFloat(currentPrice) || 0;
        const cost = parseFloat(currentProduct.cost_price || "0");

        if (price <= 0) {
            setItemValidationError("Price must be greater than zero.");
            return;
        }

        if (price < cost) {
            setItemValidationError("Selling price cannot be less than cost price.");
            return;
        }

        const newItem: InvoiceItem = {
            product_id: currentProduct.id,
            product_name: currentProduct.name,
            description: currentProduct.description || currentProduct.name,
            quantity: currentQuantity,
            list_price: listPrice,
            price: price,
            discount_amount: Math.max(0, listPrice - price),
            total: price * currentQuantity
        };

        setItems([...items, newItem]);
        setCurrentProduct(null);
        setCurrentQuantity(1);
        setCurrentPrice("");
        setItemValidationError("");
        setSearchProduct("");
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer || items.length === 0) return;

        const { subtotal, total } = calculateTotals();
        const paid = parseFloat(amountPaid) || 0;
        let currentBalance = parseFloat(selectedCustomer.balance || "0");
        try {
            const token = await auth.currentUser?.getIdToken();
            const customerRes = await fetch(`/api/customers/${selectedCustomer.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (customerRes.ok) {
                const liveCustomer = await customerRes.json();
                currentBalance = parseFloat(liveCustomer.balance || "0");
            }
        } catch {
            // fallback to selected customer balance
        }
        const availableCredit = currentBalance < 0 ? Math.abs(currentBalance) : 0;
        const creditApplied = Math.min(availableCredit, total);
        const effectivePaid = paid + creditApplied;

        let paymentStatus = 'unpaid';
        if (effectivePaid >= total) paymentStatus = 'paid';
        else if (effectivePaid > 0) paymentStatus = 'partial';

        const invoiceData = {
            invoice_number: `INV-${Date.now()}`,
            customer_id: selectedCustomer.id,
            customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
            customer_phone: selectedCustomer.phone || "",
            items: items,
            subtotal: subtotal,
            total_amount: total,
            amount_paid: paid,
            credit_applied: creditApplied,
            effective_paid: effectivePaid,
            payment_status: paymentStatus,
            payment_method: paymentMethod,
            notes: notes,
            status: 'issued'
        };

        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/invoices", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(invoiceData)
            });

            if (res.ok) {
                setShowModal(false);
                resetForm();
                fetchData();
            } else {
                const raw = await res.text();
                let detail = "Failed to create invoice";
                try {
                    const error = JSON.parse(raw);
                    detail = error.detail || detail;
                } catch {
                    if (raw) detail = raw;
                }
                alert(detail);
            }
        } catch (error) {
            console.error("Error creating invoice:", error);
        }
    };

    const resetForm = () => {
        setSelectedCustomer(null);
        setItems([]);
        setAmountPaid("");
        setPaymentMethod("cash");
        setNotes("");
        setSearchCustomer("");
        setShowCustomerDropdown(false);
        setShowQuickCustomer(false);
        setQuickCustomer({ first_name: "", last_name: "", phone: "" });
        setQuickCustomerError("");
        setItemValidationError("");
    };

    const handleQuickAddCustomer = async () => {
        if (!quickCustomer.first_name.trim() || !quickCustomer.last_name.trim()) {
            setQuickCustomerError("First and last name are required.");
            return;
        }

        setQuickCustomerSaving(true);
        setQuickCustomerError("");
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/customers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(quickCustomer),
            });

            if (!res.ok) {
                const raw = await res.text();
                setQuickCustomerError(raw || "Failed to create customer.");
                return;
            }

            const created = await res.json();
            setCustomers((prev) => [created, ...prev]);
            setSelectedCustomer(created);
            setShowCustomerDropdown(false);
            setShowQuickCustomer(false);
            setSearchCustomer("");
            setQuickCustomer({ first_name: "", last_name: "", phone: "" });
        } catch {
            setQuickCustomerError("Failed to create customer.");
        } finally {
            setQuickCustomerSaving(false);
        }
    };

    const handleSendWhatsApp = (invoice: Invoice) => {
        const phone = invoice.customer_phone || "";
        const message = `Invoice #${invoice.invoice_number}\nTotal: ${formatCurrency(invoice.total_amount)}\nStatus: ${invoice.payment_status.toUpperCase()}`;
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleViewInvoice = async (invoice: Invoice) => {
        setLoadingInvoice(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/invoices/${invoice.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedInvoice(data);
            } else {
                setSelectedInvoice(invoice);
            }
        } catch {
            setSelectedInvoice(invoice);
        } finally {
            setLoadingInvoice(false);
        }
    };

    const handleDownloadInvoice = (invoice: Invoice) => {
        const subtotal = (invoice.items || []).reduce((sum, item) => sum + Number(item.total || 0), 0);
        const totalUnits = (invoice.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        const paid = Number(invoice.amount_paid || 0);
        const creditApplied = Number(invoice.credit_applied || 0);
        const effectivePaid = Number(invoice.effective_paid || (paid + creditApplied));
        const total = Number(invoice.total_amount || 0);
        const due = Math.max(0, total - effectivePaid);

        const itemRows = (invoice.items || [])
            .map((item, idx) => `
                <tr>
                    <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;">${item.description || item.product_name || `Item ${idx + 1}`}</td>
                    <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
                    <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;">${formatCurrency(item.list_price || item.price)}</td>
                    <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;">${formatCurrency(item.price)}</td>
                    <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(item.total)}</td>
                </tr>
            `)
            .join("");

        const html = `
            <html>
            <head>
                <title>Invoice ${invoice.invoice_number}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
                    body { font-family: 'Inter', sans-serif; background:#fff; padding: 40px; color: #0f172a; line-height: 1.5; }
                    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 40px; border-bottom: 4px solid #102642; padding-bottom: 20px; }
                    .brand h1 { font-size: 32px; font-weight: 800; margin: 0; color: #102642; text-transform: uppercase; letter-spacing: -0.05em; }
                    .brand p { color: #64748b; font-size: 14px; margin: 4px 0 0 0; }
                    .invoice-info { text-align: right; }
                    .invoice-info h2 { font-size: 24px; font-weight: 800; margin: 0; color: #54C7E5; }
                    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                    .details-box h3 { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
                    .details-box p { margin: 2px 0; font-size: 14px; font-weight: 600; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                    th { text-align: left; background: #f8fafc; color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 12px 10px; border-bottom: 2px solid #e5e7eb; }
                    td { font-size: 13px; font-weight: 500; }
                    .summary { display: flex; justify-content: flex-end; }
                    .summary-box { width: 300px; background: #f8fafc; padding: 20px; border-radius: 12px; }
                    .summary-line { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                    .summary-line.total { border-top: 2px solid #e5e7eb; margin-top: 12px; padding-top: 12px; font-weight: 800; font-size: 18px; color: #102642; }
                    .footer { margin-top: 60px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="brand">
                        <h1>${companyProfile.company_name || "Warehouse Pro"}</h1>
                        <p>${companyProfile.description || "Supply Chain & Logistics"}</p>
                    </div>
                    <div class="invoice-info">
                        <h2>INVOICE</h2>
                        <p><strong>#${invoice.invoice_number}</strong></p>
                        <p>Date: ${invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : "-"}</p>
                    </div>
                </div>

                <div class="details-grid">
                    <div class="details-box">
                        <h3>Issued To</h3>
                        <p>${invoice.customer_name}</p>
                        <p>${invoice.customer_phone || ""}</p>
                    </div>
                    <div class="details-box" style="text-align: right;">
                        <h3>Company Contact</h3>
                        <p>${companyProfile.location || ""}</p>
                        <p>${companyProfile.phone || ""}</p>
                        <p>${companyProfile.email || ""}</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 40%;">Description</th>
                            <th style="width: 10%; text-align: center;">Qty</th>
                            <th style="width: 15%;">Unit Price</th>
                            <th style="width: 15%;">Final Price</th>
                            <th style="width: 20%; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                    </tbody>
                </table>

                <div class="summary">
                    <div class="summary-box">
                        <div class="summary-line"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
                        <div class="summary-line"><span>Paid</span><span>${formatCurrency(paid)}</span></div>
                        <div class="summary-line"><span>Credit Applied</span><span>${formatCurrency(creditApplied)}</span></div>
                        <div class="summary-line total"><span>Balance Due</span><span>${formatCurrency(due)}</span></div>
                    </div>
                </div>

                <div class="footer">
                    <p>${companyProfile.invoice_note || "Thank you for your business!"}</p>
                    <p>${companyProfile.payment_details || ""}</p>
                </div>
                <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
            </body>
            </html>
        `;

        const win = window.open("", "_blank");
        if (!win) return;
        win.document.open();
        win.document.write(html);
        win.document.close();
    };

    const formatCurrency = (amount: string | number) => {
        return new Intl.NumberFormat('en-IQ', {
            style: 'currency',
            currency: 'IQD',
            minimumFractionDigits: 0
        }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
    };

    const filteredCustomers = customers.filter(c => {
        const name = `${c.first_name} ${c.last_name}`.toLowerCase();
        return name.includes(searchCustomer.toLowerCase()) || c.phone.includes(searchCustomer);
    });
    const visibleCustomers = searchCustomer ? filteredCustomers : customers.slice(0, 8);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchProduct.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-[var(--ink)]">Sales Ledger</h1>
                    <p className="text-[var(--ink-soft)] mt-1">Generate invoices and track enterprise revenue streams</p>
                </div>
                <button
                    onClick={() => window.location.assign("/sales/invoices/new")}
                    className="opengate-button-primary flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg shadow-[var(--accent-thin)] active:scale-95 transition-all w-full sm:w-auto"
                >
                    <Plus size={20} />
                    New Invoice
                </button>
            </div>

            {/* Invoices List */}
            <div className="enterprise-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full enterprise-table">
                        <thead>
                            <tr className="bg-[var(--bg)]/50 border-b border-[var(--ink-thin)]">
                                <th className="text-left py-4 px-6 text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest">Invoice</th>
                                <th className="text-left py-4 px-6 text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest">Client</th>
                                <th className="text-left py-4 px-6 text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest">Amount</th>
                                <th className="text-left py-4 px-6 text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest">Settled</th>
                                <th className="text-left py-4 px-6 text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest">Status</th>
                                <th className="text-right py-4 px-6 text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest">Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--bg-soft)]">
                            {invoices.map((invoice) => (
                                <tr key={invoice.id} className="group hover:bg-[var(--bg)]/40 transition-colors">
                                    <td className="py-4 px-6 font-bold text-[var(--ink)]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-soft)] flex items-center justify-center text-[var(--ink-soft)] group-hover:bg-[var(--accent-thin)] group-hover:text-[var(--accent)] transition-colors">
                                                <FileText size={14} />
                                            </div>
                                            #{invoice.invoice_number}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-sm font-semibold text-[var(--ink-soft)]">{invoice.customer_name}</td>
                                    <td className="py-4 px-6 font-black text-[var(--ink)]">
                                        {formatCurrency(invoice.total_amount)}
                                    </td>
                                    <td className="py-4 px-6 font-bold text-[var(--ink-soft)]">
                                        {formatCurrency(invoice.effective_paid || invoice.amount_paid)}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${invoice.payment_status === 'paid'
                                            ? 'bg-[var(--success-thin)] text-[var(--success)] shadow-sm shadow-[var(--success-thin)]'
                                            : invoice.payment_status === 'partial'
                                                ? 'bg-[var(--warning-thin)] text-[var(--warning)] shadow-sm shadow-[var(--warning-thin)]'
                                                : 'bg-[var(--danger-thin)] text-[var(--danger)] shadow-sm shadow-[var(--danger-thin)]'
                                            }`}>
                                            {invoice.payment_status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleViewInvoice(invoice)}
                                                className="p-2 rounded-xl text-[var(--ink-soft)] hover:text-[var(--accent)] hover:bg-[var(--accent-thin)] transition-all"
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDownloadInvoice(invoice)}
                                                className="p-2 rounded-xl text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg-soft)] transition-all"
                                                title="Generate PDF"
                                            >
                                                <Download size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleSendWhatsApp(invoice)}
                                                className="p-2 rounded-xl text-[var(--ink-soft)] hover:text-[#25D366] hover:bg-[#25D366]/10 transition-all"
                                                title="WhatsApp Distribution"
                                            >
                                                <Send size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {invoices.length === 0 && (
                    <div className="text-center py-20 bg-[var(--bg)]/50">
                        <div className="w-16 h-16 bg-[var(--bg-soft)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--ink-thin)]">
                            <ShoppingCart size={32} className="text-[var(--ink-soft)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--ink)]">No Sales Discovered</h3>
                        <p className="text-[var(--ink-soft)] mt-1">Invoices will appear here once transactions are recorded.</p>
                    </div>
                )}
            </div>

            {/* View Invoice Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-[var(--ink)]/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-300">
                    <div className="enterprise-modal max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-8 border-b border-[var(--bg-soft)] flex items-center justify-between bg-white">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[var(--accent-thin)] flex items-center justify-center text-[var(--accent)]">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-[var(--ink)] uppercase tracking-tight">
                                        Invoice {selectedInvoice.invoice_number}
                                    </h2>
                                    <p className="text-[var(--ink-soft)] font-medium">Record of transaction from {new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedInvoice(null)}
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--bg-soft)] transition-colors"
                            >
                                <X size={28} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--ink-thin)]">
                                    <h3 className="text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest mb-4">Enterprise Issuer</h3>
                                    <p className="font-black text-lg text-[var(--ink)]">{companyProfile.company_name || 'Warehouse Pro'}</p>
                                    <p className="text-sm font-semibold text-[var(--ink-soft)] mt-1">{companyProfile.location || '-'}</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--ink-thin)]">
                                    <h3 className="text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest mb-4">Contractor Details</h3>
                                    <p className="font-black text-lg text-[var(--ink)]">{selectedInvoice.customer_name}</p>
                                    <p className="text-sm font-semibold text-[var(--ink-soft)] mt-1">{selectedInvoice.customer_phone || '-'}</p>
                                </div>
                            </div>

                            <div className="enterprise-table border border-[var(--ink-thin)] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                                <table className="w-full text-sm min-w-[600px]">
                                    <thead>
                                        <tr className="bg-[var(--bg)]">
                                            <th className="text-left px-5 py-4 font-black text-[var(--ink-soft)] uppercase tracking-wider">Product Description</th>
                                            <th className="text-center px-5 py-4 font-black text-[var(--ink-soft)] uppercase tracking-wider">Units</th>
                                            <th className="text-left px-5 py-4 font-black text-[var(--ink-soft)] uppercase tracking-wider">Unit Price</th>
                                            <th className="text-right px-5 py-4 font-black text-[var(--ink-soft)] uppercase tracking-wider">Line Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--bg-soft)]">
                                        {(selectedInvoice.items || []).map((item, index) => (
                                            <tr key={`${item.product_id}-${index}`} className="hover:bg-[var(--bg)]/10 transition-colors">
                                                <td className="px-5 py-4 font-bold text-[var(--ink)]">{item.description || item.product_name}</td>
                                                <td className="px-5 py-4 text-center font-bold text-[var(--ink-soft)]">{item.quantity}</td>
                                                <td className="px-5 py-4 font-semibold text-[var(--ink)]">{formatCurrency(item.price)}</td>
                                                <td className="px-5 py-4 text-right font-black text-[var(--ink)]">{formatCurrency(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--ink-thin)]">
                                    <p className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Gross Total</p>
                                    <p className="text-xl font-black text-[var(--ink)] mt-1">{formatCurrency(selectedInvoice.total_amount)}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--ink-thin)]">
                                    <p className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Liquid Payment</p>
                                    <p className="text-xl font-black text-[var(--success)] mt-1">{formatCurrency(selectedInvoice.amount_paid)}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--ink-thin)]">
                                    <p className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Credit Credit</p>
                                    <p className="text-xl font-black text-[var(--accent)] mt-1">{formatCurrency(selectedInvoice.credit_applied || 0)}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-[var(--danger-thin)] border border-[var(--danger)]/10">
                                    <p className="text-[10px] font-black text-[var(--danger)] uppercase tracking-widest">Outstanding</p>
                                    <p className="text-xl font-black text-[var(--danger)] mt-1">
                                        {formatCurrency(Math.max(0, Number(selectedInvoice.total_amount || 0) - Number(selectedInvoice.effective_paid || (Number(selectedInvoice.amount_paid || 0) + Number(selectedInvoice.credit_applied || 0)))))}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-[var(--bg)] border-t border-[var(--ink-thin)] flex justify-between gap-4">
                            <button
                                onClick={() => handleDownloadInvoice(selectedInvoice)}
                                className="flex-1 opengate-button-primary px-8 py-3 rounded-xl font-black shadow-lg shadow-[var(--accent-thin)] active:scale-95 transition-all text-sm"
                            >
                                Generate PDF Protocol
                            </button>
                            <button
                                onClick={() => setSelectedInvoice(null)}
                                className="flex-1 px-8 py-3 rounded-xl border-2 border-[var(--ink-thin)] font-bold text-[var(--ink)] hover:bg-white transition-all text-sm"
                            >
                                Close Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Invoice Modal */}
            {false && showModal && (
                <div className="fixed inset-0 bg-[var(--ink)]/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in zoom-in duration-300">
                    <div className="enterprise-modal max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-[var(--bg-soft)] flex items-center justify-between bg-white">
                            <div>
                                <h2 className="text-2xl font-black text-[var(--ink)] flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-lg bg-[var(--accent-thin)] flex items-center justify-center text-[var(--accent)]">
                                        <Plus size={24} />
                                    </span>
                                    Issue New Invoice
                                </h2>
                                <p className="text-[var(--ink-soft)] font-medium mt-1">Populate the transaction register for fulfillment</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--bg-soft)] transition-colors"
                            >
                                <X size={28} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Left Column - Customer & Items */}
                                <div className="space-y-8">
                                    {/* Customer Selection */}
                                    <div className="space-y-3">
                                        <label className="block text-sm font-black text-[var(--ink)] uppercase tracking-wider italic">Target Contractor</label>
                                        {!selectedCustomer ? (
                                            <div className="relative group">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-soft)] group-focus-within:text-[var(--accent)] transition-colors" size={20} />
                                                <input
                                                    type="text"
                                                    placeholder="Search client registry..."
                                                    value={searchCustomer}
                                                    onFocus={() => setShowCustomerDropdown(true)}
                                                    onClick={() => setShowCustomerDropdown(true)}
                                                    onChange={(e) => {
                                                        setSearchCustomer(e.target.value);
                                                        setShowCustomerDropdown(true);
                                                    }}
                                                    className="enterprise-input pl-12 h-14 bg-[var(--bg)] border-[var(--ink-thin)] focus:bg-white focus:ring-4 focus:ring-[var(--accent-thin)] transition-all shadow-sm"
                                                />
                                                {showCustomerDropdown && (
                                                    <div className="absolute w-full z-20 mt-2 rounded-2xl border-2 border-[var(--ink-thin)] shadow-2xl overflow-hidden bg-white animate-in slide-in-from-top-2 duration-200">
                                                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                            {visibleCustomers.length > 0 ? (
                                                                visibleCustomers.map((customer) => (
                                                                    <button
                                                                        key={customer.id}
                                                                        onClick={() => {
                                                                            setSelectedCustomer(customer);
                                                                            setSearchCustomer("");
                                                                            setShowCustomerDropdown(false);
                                                                        }}
                                                                        className="w-full text-left p-4 hover:bg-[var(--bg)] border-b last:border-0 border-[var(--bg-soft)] transition-colors flex items-center justify-between group/item"
                                                                    >
                                                                        <div>
                                                                            <p className="font-bold text-[var(--ink)] group-hover/item:text-[var(--accent)] transition-colors">{customer.first_name} {customer.last_name}</p>
                                                                            <p className="text-xs font-semibold text-[var(--ink-soft)]">{customer.phone}</p>
                                                                        </div>
                                                                        <ArrowRight size={16} className="text-[var(--ink-soft)] opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0 transition-all" />
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="p-6 text-center">
                                                                    <p className="text-sm font-bold text-[var(--ink-soft)] mb-3">No contractors found</p>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowQuickCustomer(true)}
                                                                        className="text-sm font-black text-[var(--accent)] hover:underline flex items-center justify-center gap-1 mx-auto"
                                                                    >
                                                                        <Plus size={16} /> Quick Provision
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between p-5 rounded-2xl bg-[var(--accent-thin)] border-2 border-[var(--accent)]/10 animate-in fade-in slide-in-from-left-2 duration-300">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[var(--accent)]">
                                                        <User size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-[var(--ink)] text-lg">{selectedCustomer?.first_name} {selectedCustomer?.last_name}</p>
                                                        <p className="text-xs font-bold text-[var(--accent)] tracking-wider uppercase">{selectedCustomer?.phone}</p>
                                                        {parseFloat(selectedCustomer?.balance || "0") < 0 && (
                                                            <div className="mt-1 flex items-center gap-1 text-[10px] font-black text-[var(--success)] uppercase">
                                                                <Wallet size={10} /> {formatCurrency(Math.abs(parseFloat(selectedCustomer?.balance || "0")))} Credit Available
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedCustomer(null)}
                                                    className="w-10 h-10 rounded-xl bg-white/50 hover:bg-white text-[var(--ink-soft)] hover:text-[var(--danger)] transition-all flex items-center justify-center shadow-sm"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        )}

                                        {showQuickCustomer && !selectedCustomer && (
                                            <div className="p-6 rounded-2xl border-2 border-dashed border-[var(--ink-thin)] bg-[var(--bg)]/30 space-y-4 animate-in fade-in duration-300">
                                                <p className="text-xs font-black text-[var(--ink)] uppercase tracking-widest text-center">Expedited Registration</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <input
                                                        type="text"
                                                        placeholder="First Name*"
                                                        value={quickCustomer.first_name}
                                                        onChange={(e) => setQuickCustomer({ ...quickCustomer, first_name: e.target.value })}
                                                        className="enterprise-input h-11 text-sm bg-white"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Last Name*"
                                                        value={quickCustomer.last_name}
                                                        onChange={(e) => setQuickCustomer({ ...quickCustomer, last_name: e.target.value })}
                                                        className="enterprise-input h-11 text-sm bg-white"
                                                    />
                                                </div>
                                                <input
                                                    type="tel"
                                                    placeholder="Phone Number*"
                                                    value={quickCustomer.phone}
                                                    onChange={(e) => setQuickCustomer({ ...quickCustomer, phone: e.target.value })}
                                                    className="enterprise-input h-11 text-sm bg-white"
                                                />
                                                {quickCustomerError && <p className="text-xs font-black text-[var(--danger)] uppercase">{quickCustomerError}</p>}
                                                <div className="flex gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={handleQuickAddCustomer}
                                                        disabled={quickCustomerSaving}
                                                        className="flex-1 opengate-button-primary h-11 rounded-xl text-sm font-black disabled:opacity-50"
                                                    >
                                                        {quickCustomerSaving ? "Provisionsing..." : "Provision Client"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowQuickCustomer(false)}
                                                        className="px-6 h-11 rounded-xl border-2 border-[var(--ink-thin)] font-bold text-sm hover:bg-white transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Add Products */}
                                    <div className="space-y-4">
                                        <label className="block text-sm font-black text-[var(--ink)] uppercase tracking-wider italic">Provision Commodities</label>
                                        <div className="space-y-4">
                                            <div className="relative group">
                                                <Package size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-soft)] group-focus-within:text-[var(--accent)] transition-colors" />
                                                <input
                                                    type="text"
                                                    placeholder="Search SKU or Product Name..."
                                                    value={searchProduct}
                                                    onChange={(e) => setSearchProduct(e.target.value)}
                                                    className="enterprise-input pl-12 h-14 bg-[var(--bg)] border-[var(--ink-thin)] transition-all shadow-sm"
                                                />
                                            </div>

                                            {searchProduct && (
                                                <div className="rounded-2xl border-2 border-[var(--ink-thin)] shadow-2xl overflow-hidden bg-white max-h-48 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                                                    {filteredProducts.map((product) => (
                                                        <button
                                                            key={product.id}
                                                            onClick={() => {
                                                                setCurrentProduct(product);
                                                                setCurrentPrice(product.selling_price);
                                                                setItemValidationError("");
                                                                setSearchProduct("");
                                                                setCurrentQuantity(1);
                                                            }}
                                                            className="w-full text-left p-4 hover:bg-[var(--bg)] border-b last:border-0 border-[var(--bg-soft)] transition-colors flex justify-between items-center group/pitem"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-lg bg-[var(--bg-soft)] text-[var(--ink-soft)] group-hover/pitem:bg-[var(--accent-thin)] group-hover/pitem:text-[var(--accent)] transition-colors">
                                                                    <Package size={16} />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-[var(--ink)]">{product.name}</p>
                                                                    <p className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">{product.current_qty} Units in Vault</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-black text-[var(--ink)]">{formatCurrency(product.selling_price)}</p>
                                                                <p className="text-[10px] font-bold text-[var(--ink-soft)]">Base MSRP</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {currentProduct && (
                                                <div className="p-6 rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--bg)] to-white shadow-lg space-y-6 animate-in slide-in-from-left-2 duration-300 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-2">
                                                        <button onClick={() => setCurrentProduct(null)} className="p-1 rounded-full text-[var(--ink-soft)] hover:bg-[var(--bg-soft)] transition-colors">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-[var(--accent-thin)] flex items-center justify-center text-[var(--accent)]">
                                                            <ShoppingCart size={20} />
                                                        </div>
                                                        <h4 className="font-black text-lg text-[var(--ink)]">{currentProduct?.name}</h4>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Quantity</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={parseFloat(currentProduct?.current_qty || "0")}
                                                                value={currentQuantity}
                                                                onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 1)}
                                                                className="enterprise-input h-10 text-center font-black"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Override Price</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={currentPrice}
                                                                onChange={(e) => {
                                                                    setCurrentPrice(e.target.value);
                                                                    setItemValidationError("");
                                                                }}
                                                                className={`enterprise-input h-10 font-black ${itemValidationError ? 'border-[var(--danger)]' : ''}`}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                                        <p className="text-[var(--ink-soft)]">
                                                            Vault Cost: <span className="text-[var(--ink)]">{formatCurrency(currentProduct?.cost_price || "0")}</span>
                                                        </p>
                                                        {parseFloat(currentPrice || "0") > 0 && parseFloat(currentProduct?.selling_price || "0") > parseFloat(currentPrice || "0") && (
                                                            <p className="text-[var(--success)] uppercase tracking-widest">
                                                                Savings Applied: {formatCurrency(parseFloat(currentProduct?.selling_price || "0") - parseFloat(currentPrice || "0"))}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {itemValidationError && (
                                                        <div className="flex items-center gap-2 text-[var(--danger)] bg-[var(--danger-thin)] px-4 py-2 rounded-xl border border-[var(--danger)]/10">
                                                            <AlertCircle size={14} />
                                                            <p className="text-xs font-black uppercase text-center flex-1">{itemValidationError}</p>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={handleAddItem}
                                                        className="w-full opengate-button-primary h-12 rounded-xl text-sm font-black shadow-xl shadow-[var(--accent-thin)] active:scale-95 transition-all"
                                                    >
                                                        Add to Invoice Manifest
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column - Manifest & Totals */}
                                <div className="space-y-8 flex flex-col">
                                    <div className="flex-1 space-y-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-black text-[var(--ink)] uppercase tracking-wider italic">Invoice Manifest</label>
                                                <span className="px-2 py-0.5 rounded-lg bg-[var(--bg-soft)] text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">
                                                    {items.length} SKUs Identified
                                                </span>
                                            </div>

                                            <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                                                {items.map((item, index) => (
                                                    <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-[var(--ink-thin)] group hover:border-[var(--accent)] transition-all animate-in fade-in slide-in-from-right-4 duration-300">
                                                        <div className="space-y-1">
                                                            <p className="font-black text-[var(--ink)] leading-tight">{item.product_name}</p>
                                                            <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--ink-soft)] uppercase tracking-tight">
                                                                <span>{item.quantity} Unit(s)</span>
                                                                <span className="w-1 h-1 rounded-full bg-[var(--ink-thin)]"></span>
                                                                <span>{formatCurrency(item.price)}/ea</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-black text-[var(--ink)]">{formatCurrency(item.total)}</span>
                                                            <button
                                                                onClick={() => handleRemoveItem(index)}
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--danger)] hover:bg-[var(--danger-thin)] transition-all"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {items.length === 0 && (
                                                    <div className="py-12 text-center border-2 border-dashed border-[var(--ink-thin)] rounded-3xl bg-[var(--bg)]/10">
                                                        <ShoppingCart size={32} className="mx-auto text-[var(--ink-thin)] mb-3" />
                                                        <p className="text-sm font-bold text-[var(--ink-soft)] italic">Manifest is currently empty</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Financial Summary */}
                                        <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--ink)] to-[#1e3a5f] text-white shadow-2xl relative overflow-hidden">
                                            <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-[var(--accent)] opacity-10 rounded-full blur-3xl"></div>
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-[var(--accent)]">Financial Protocol</h3>

                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center text-sm font-semibold opacity-80">
                                                    <span>Manifest Subtotal</span>
                                                    <span>{formatCurrency(calculateTotals().subtotal)}</span>
                                                </div>

                                                {selectedCustomerCredit > 0 && (
                                                    <div className="flex justify-between items-center text-sm font-bold text-[var(--success)]">
                                                        <span className="flex items-center gap-1"><Wallet size={14} /> Applied Credit Credit</span>
                                                        <span>-{formatCurrency(Math.min(selectedCustomerCredit, totals.total))}</span>
                                                    </div>
                                                )}

                                                <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Gross Valuation</p>
                                                        <p className="text-3xl font-black">{formatCurrency(totals.total)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Due After Credit</p>
                                                        <p className="text-xl font-black text-[var(--accent)]">{formatCurrency(dueAfterCredit)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Final Controls */}
                                    <div className="space-y-6 pt-6 border-t border-[var(--bg-soft)]">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Liquid Tender (Cash)</label>
                                                <div className="relative">
                                                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
                                                    <input
                                                        type="number"
                                                        placeholder="0.00"
                                                        value={amountPaid}
                                                        onChange={(e) => setAmountPaid(e.target.value)}
                                                        className="enterprise-input pl-10 h-10 font-black h-12"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Protocol Method</label>
                                                <select
                                                    value={paymentMethod}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    className="enterprise-input h-10 font-bold h-12"
                                                >
                                                    <option value="cash">Liquid Cash</option>
                                                    <option value="card">Card Terminal</option>
                                                    <option value="transfer">Bank Transfer</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Protocol Metadata (Notes)</label>
                                            <textarea
                                                rows={2}
                                                placeholder="Internal transaction notes..."
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                className="enterprise-input py-3 resize-none text-sm"
                                            />
                                        </div>

                                        <div className="flex gap-4 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowModal(false);
                                                    resetForm();
                                                }}
                                                className="flex-1 h-14 rounded-2xl border-2 border-[var(--ink-thin)] font-black text-[var(--ink)] hover:bg-[var(--bg)] transition-all"
                                            >
                                                Terminate Session
                                            </button>
                                            <button
                                                onClick={handleSubmit}
                                                disabled={!selectedCustomer || items.length === 0}
                                                className="flex-2 opengate-button-primary h-14 px-10 rounded-2xl font-black text-lg shadow-2xl shadow-[var(--accent-thin)] active:scale-95 disabled:opacity-30 disabled:grayscale transition-all"
                                                style={{ flex: 2 }}
                                            >
                                                Commit Transaction
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
