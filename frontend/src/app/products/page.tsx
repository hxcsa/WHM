"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { Plus, Search, Download, AlertCircle, Edit2, Trash2, Package, CheckCircle, X, ArrowDownCircle } from "lucide-react";
import ProductSubTabs from "@/components/products/ProductSubTabs";

interface Product {
    id: string;
    name: string;
    sku: string;
    cost_price: string;
    selling_price: string;
    current_qty: string;
    min_stock_level: string;
    pricing_type: string;
    unit: string;
}

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error';
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showLowStock, setShowLowStock] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        cost_price: "",
        selling_price: "",
        min_stock_level: "",
        pricing_type: "fixed",
        unit: "piece"
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [inboundQty, setInboundQty] = useState("");
    const [inboundNotes, setInboundNotes] = useState("");
    const [inboundSubmitting, setInboundSubmitting] = useState(false);

    const hasPriceBelowCost =
        !!formData.cost_price &&
        !!formData.selling_price &&
        parseFloat(formData.selling_price) < parseFloat(formData.cost_price);

    useEffect(() => {
        fetchProducts();
    }, []);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const fetchProducts = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/products", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setProducts(await res.json());
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Product name is required";
        }
        if (!formData.sku.trim()) {
            newErrors.sku = "SKU is required";
        }
        if (!formData.cost_price || parseFloat(formData.cost_price) <= 0) {
            newErrors.cost_price = "Valid cost price is required";
        }
        if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) {
            newErrors.selling_price = "Valid selling price is required";
        }
        if (
            formData.cost_price &&
            formData.selling_price &&
            parseFloat(formData.selling_price) < parseFloat(formData.cost_price)
        ) {
            newErrors.selling_price = "Selling price cannot be lower than cost price";
        }

        if (!editingProduct && formData.sku.trim()) {
            const existingProduct = products.find(p =>
                p.sku.toLowerCase() === formData.sku.toLowerCase()
            );
            if (existingProduct) {
                newErrors.sku = "SKU already exists";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const isFormValid = () => {
        return formData.name.trim() &&
            formData.sku.trim() &&
            formData.cost_price &&
            formData.selling_price &&
            !hasPriceBelowCost;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        if (submitting) return;

        setSubmitting(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
            const method = editingProduct ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                showToast(editingProduct ? "Product updated successfully!" : "Product created successfully!");
                setShowModal(false);
                setEditingProduct(null);
                setFormData({
                    name: "",
                    sku: "",
                    cost_price: "",
                    selling_price: "",
                    min_stock_level: "",
                    pricing_type: "fixed",
                    unit: "piece"
                });
                setErrors({});
                fetchProducts();
            } else {
                const raw = await res.text();
                let detail = "Failed to save product";
                try {
                    const errorData = JSON.parse(raw);
                    detail = errorData.detail || detail;
                } catch {
                    if (raw) detail = raw;
                }
                showToast(detail, "error");
            }
        } catch (error) {
            console.error("Error saving product:", error);
            showToast("An error occurred while saving", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this product?")) return;

        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/products/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                showToast("Product deleted successfully!");
                fetchProducts();
            } else {
                showToast("Failed to delete product", "error");
            }
        } catch (error) {
            console.error("Error deleting product:", error);
            showToast("An error occurred while deleting", "error");
        }
    };

    const handleQuickInbound = async () => {
        if (!editingProduct) return;

        const qty = parseFloat(inboundQty);
        if (!qty || qty <= 0) {
            showToast("Inbound quantity must be greater than 0", "error");
            return;
        }

        setInboundSubmitting(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const params = new URLSearchParams({
                quantity: String(qty),
                reason: "purchase",
                notes: inboundNotes || "Quick inbound from catalog",
            });

            const res = await fetch(`/api/products/${editingProduct.id}/adjust-stock?${params.toString()}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                showToast("Inbound added successfully!");
                setInboundQty("");
                setInboundNotes("");
                fetchProducts();
            } else {
                const raw = await res.text();
                showToast(raw || "Failed to add inbound", "error");
            }
        } catch (error) {
            console.error("Error adding inbound:", error);
            showToast("Failed to add inbound", "error");
        } finally {
            setInboundSubmitting(false);
        }
    };

    const handleExport = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/products/export", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const csv = convertToCSV(data);
                downloadCSV(csv, "products.csv");
                showToast("Products exported successfully!");
            }
        } catch (error) {
            console.error("Error exporting products:", error);
            showToast("Failed to export products", "error");
        }
    };

    const convertToCSV = (data: Record<string, unknown>[]) => {
        if (data.length === 0) return "";
        const headers = Object.keys(data[0]);
        const rows = data.map(obj => headers.map(h => `"${String(obj[h] ?? "")}"`).join(","));
        return [headers.join(","), ...rows].join("\n");
    };

    const downloadCSV = (csv: string, filename: string) => {
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLowStock = !showLowStock ||
            (parseFloat(product.current_qty) <= parseFloat(product.min_stock_level) &&
                parseFloat(product.min_stock_level) > 0);
        return matchesSearch && matchesLowStock;
    });

    const formatCurrency = (amount: string) => {
        return new Intl.NumberFormat('en-IQ', {
            style: 'currency',
            currency: 'IQD',
            minimumFractionDigits: 0
        }).format(parseFloat(amount));
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-700"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toast Notifications */}
            <div className="fixed right-4 top-4 z-50 space-y-2">
                {toasts.map(toast => (
                    <div key={toast.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white transition-all ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}>
                        {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        <span className="text-sm font-medium">{toast.message}</span>
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="enterprise-card rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-4 sm:p-6 text-white text-left">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] text-slate-300">Materials & Stock</p>
                        <h1 className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-white">Product Catalog</h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-200">Central database for all items, variants, and base pricing.</p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border border-white/20 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white transition hover:bg-white/10"
                        >
                            <Download size={14} />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        <button
                            onClick={() => {
                                setEditingProduct(null);
                                setFormData({
                                    name: "",
                                    sku: "",
                                    cost_price: "",
                                    selling_price: "",
                                    min_stock_level: "",
                                    pricing_type: "fixed",
                                    unit: "piece"
                                });
                                setErrors({});
                                setInboundQty("");
                                setInboundNotes("");
                                setShowModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50"
                        >
                            <Plus size={14} />
                            Add Product
                        </button>
                    </div>
                </div>
            </div>

            <ProductSubTabs />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-2 rounded-xl border border-slate-200 bg-white text-sm focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                    />
                </div>
                <button
                    onClick={() => setShowLowStock(!showLowStock)}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 sm:py-2 text-sm font-medium transition ${showLowStock ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <AlertCircle size={14} />
                    <span className="hidden sm:inline">Low Stock Risk</span>
                    <span className="sm:hidden">Low Stock</span>
                </button>
            </div>

            {/* Products Table */}
            <div className="enterprise-card overflow-hidden bg-white">
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                    <table className="enterprise-table w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs">Product</th>
                                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs">SKU</th>
                                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs">Stock</th>
                                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs">Cost</th>
                                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs">Price</th>
                                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs hidden sm:table-cell">Type</th>
                                <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredProducts.map((product) => {
                                const qty = parseFloat(product.current_qty);
                                const minStock = parseFloat(product.min_stock_level);
                                const isLowStock = minStock > 0 && qty <= minStock;

                                return (
                                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                                            <div className="flex items-center gap-2 sm:gap-3 text-left">
                                                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 flex-shrink-0">
                                                    <Package size={16} className="sm:w-5 sm:h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{product.name}</p>
                                                    <p className="text-[10px] sm:text-xs text-slate-400 capitalize">{product.unit || 'piece'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                                            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-slate-600">{product.sku}</code>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <span className={`text-xs sm:text-sm font-black ${isLowStock ? 'text-rose-600' : 'text-slate-700'
                                                    }`}>
                                                    {qty}
                                                </span>
                                                {isLowStock && <AlertCircle size={12} className="text-rose-500 sm:w-4 sm:h-4" />}
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-slate-500 text-left">
                                            {formatCurrency(product.cost_price)}
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-slate-900 text-left">
                                            {formatCurrency(product.selling_price)}
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-left hidden sm:table-cell">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${product.pricing_type === 'fixed'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-purple-100 text-purple-700'
                                                }`}>
                                                {product.pricing_type}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingProduct(product);
                                                        setFormData({
                                                            name: product.name,
                                                            sku: product.sku,
                                                            cost_price: product.cost_price,
                                                            selling_price: product.selling_price,
                                                            min_stock_level: product.min_stock_level,
                                                            pricing_type: product.pricing_type,
                                                            unit: product.unit
                                                        });
                                                        setErrors({});
                                                        setInboundQty("");
                                                        setInboundNotes("");
                                                        setShowModal(true);
                                                    }}
                                                    className="inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition touch-target"
                                                    aria-label="Edit product"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition touch-target"
                                                    aria-label="Delete product"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                            <Package size={24} className="sm:w-8 sm:h-8" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">No products discovered</p>
                        <p className="mt-1 text-xs text-slate-500">Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 sm:p-4 backdrop-blur-sm">
                    <div className="enterprise-card w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white shadow-2xl rounded-t-2xl sm:rounded-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-6 sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                                    {editingProduct ? "Revise Product" : "New Inventory Item"}
                                </h2>
                                <p className="text-[10px] sm:text-xs text-slate-400">Configure specifications and pricing.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition touch-target">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-left">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Product Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => {
                                            setFormData({ ...formData, name: e.target.value });
                                            if (errors.name) setErrors({ ...errors, name: '' });
                                        }}
                                        className={`mt-1.5 w-full p-3 sm:p-2.5 text-sm ${errors.name ? 'border-rose-300' : ''}`}
                                        placeholder="Enter product name"
                                    />
                                    {errors.name && <p className="mt-1 text-xs font-medium text-rose-500">{errors.name}</p>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">SKU Code *</label>
                                        <input
                                            type="text"
                                            value={formData.sku}
                                            onChange={(e) => {
                                                setFormData({ ...formData, sku: e.target.value });
                                                if (errors.sku) setErrors({ ...errors, sku: '' });
                                            }}
                                            disabled={!!editingProduct}
                                            className={`mt-1.5 w-full p-3 sm:p-2.5 text-sm ${editingProduct ? 'bg-slate-50 text-slate-500' : ''} ${errors.sku ? 'border-rose-300' : ''}`}
                                            placeholder="Enter SKU"
                                        />
                                        {errors.sku && <p className="mt-1 text-xs font-medium text-rose-500">{errors.sku}</p>}
                                    </div>
                                    <div>
                                        <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Unit of Measure</label>
                                        <select
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                            className="mt-1.5 w-full p-3 sm:p-2.5 text-sm"
                                        >
                                            <option value="piece">Piece</option>
                                            <option value="kg">KG</option>
                                            <option value="box">Box</option>
                                            <option value="liter">Liter</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Cost Price (IQD) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.cost_price}
                                            onChange={(e) => {
                                                setFormData({ ...formData, cost_price: e.target.value });
                                                if (errors.cost_price) setErrors({ ...errors, cost_price: '' });
                                            }}
                                            className={`mt-1.5 w-full p-3 sm:p-2.5 text-sm ${errors.cost_price ? 'border-rose-300' : ''}`}
                                            placeholder="0.00"
                                        />
                                        {errors.cost_price && <p className="mt-1 text-xs font-medium text-rose-500">{errors.cost_price}</p>}
                                    </div>
                                    <div>
                                        <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Sale Price (IQD) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.selling_price}
                                            onChange={(e) => {
                                                setFormData({ ...formData, selling_price: e.target.value });
                                                if (errors.selling_price) setErrors({ ...errors, selling_price: '' });
                                            }}
                                            className={`mt-1.5 w-full p-3 sm:p-2.5 text-sm ${(errors.selling_price || hasPriceBelowCost) ? 'border-rose-300' : ''}`}
                                            placeholder="0.00"
                                        />
                                        {(errors.selling_price || hasPriceBelowCost) && (
                                            <p className="mt-1 text-xs font-medium text-rose-500">{errors.selling_price || "Margin risk: Sale price < Cost."}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Minimum Stock Level</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.min_stock_level}
                                            onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                                            className="mt-1.5 w-full p-3 sm:p-2.5 text-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Pricing Logic</label>
                                        <select
                                            value={formData.pricing_type}
                                            onChange={(e) => setFormData({ ...formData, pricing_type: e.target.value })}
                                            className="mt-1.5 w-full p-3 sm:p-2.5 text-sm"
                                        >
                                            <option value="fixed">Fixed Official Price</option>
                                            <option value="negotiable">Open for Negotiation</option>
                                        </select>
                                    </div>
                                </div>

                                {editingProduct && (
                                    <div className="rounded-xl sm:rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 sm:p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <ArrowDownCircle size={14} className="text-emerald-600" />
                                            <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800">Quick Stock Inbound</h3>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-medium text-emerald-700">
                                            <span>Current Availability:</span>
                                            <span>{editingProduct.current_qty} {editingProduct.unit}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={inboundQty}
                                                onChange={(e) => setInboundQty(e.target.value)}
                                                placeholder="Add qty..."
                                                className="flex-1 bg-white p-2 sm:p-2 text-sm border-emerald-100 placeholder:text-emerald-300"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleQuickInbound}
                                                disabled={inboundSubmitting}
                                                className="rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 px-4"
                                            >
                                                {inboundSubmitting ? "..." : "Add"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2 pb-safe">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 rounded-xl border border-slate-200 py-3 sm:py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!isFormValid() || submitting}
                                    className="flex-1 rounded-xl bg-slate-900 py-3 sm:py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-40"
                                >
                                    {submitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                                            Saving...
                                        </span>
                                    ) : (
                                        editingProduct ? "Save Changes" : "Create Product"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
