"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { Plus, ArrowLeftRight, Package, Clock, CheckCircle, Truck, X } from "lucide-react";

const COLORS = {
    primary: "#102642",
    accent: "#54C7E5",
    background: "#F4F4F4",
    card: "#FFFFFF",
    text: "#334155",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444"
};

interface Transfer {
    id: string;
    transfer_number: string;
    from_warehouse: string;
    to_warehouse: string;
    items: TransferItem[];
    status: 'pending' | 'in_transit' | 'received' | 'cancelled';
    created_at: string;
}

interface TransferItem {
    product_id: string;
    product_name: string;
    quantity: number;
}

interface Product {
    id: string;
    name: string;
    current_qty: string;
}

const WAREHOUSES = [
    { id: 'main_warehouse', name: 'Main Warehouse' },
    { id: 'showroom', name: 'Showroom' },
    { id: 'secondary', name: 'Secondary Warehouse' }
];

export default function TransfersPage() {
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    // Form state
    const [fromWarehouse, setFromWarehouse] = useState("");
    const [toWarehouse, setToWarehouse] = useState("");
    const [items, setItems] = useState<TransferItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            
            const [transfersRes, productsRes] = await Promise.all([
                fetch("/api/transfers", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } })
            ]);
            
            if (transfersRes.ok) setTransfers(await transfersRes.json());
            if (productsRes.ok) setProducts(await productsRes.json());
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        if (!selectedProduct || quantity <= 0) return;
        
        const availableQty = parseFloat(selectedProduct.current_qty);
        if (quantity > availableQty) {
            alert(`Only ${availableQty} available in stock`);
            return;
        }
        
        setItems([...items, {
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
            quantity: quantity
        }]);
        
        setSelectedProduct(null);
        setQuantity(1);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromWarehouse || !toWarehouse || items.length === 0) return;
        
        if (fromWarehouse === toWarehouse) {
            alert("From and To warehouses cannot be the same");
            return;
        }
        
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/transfers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    transfer_number: `TRF-${Date.now()}`,
                    from_warehouse: fromWarehouse,
                    to_warehouse: toWarehouse,
                    items: items
                })
            });
            
            if (res.ok) {
                setShowModal(false);
                resetForm();
                fetchData();
            }
        } catch (error) {
            console.error("Error creating transfer:", error);
        }
    };

    const handleUpdateStatus = async (transferId: string, newStatus: string) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/transfers/${transferId}/status?status=${newStatus}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error("Error updating transfer:", error);
        }
    };

    const resetForm = () => {
        setFromWarehouse("");
        setToWarehouse("");
        setItems([]);
        setSelectedProduct(null);
        setQuantity(1);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
            case 'in_transit': return { bg: 'bg-blue-100', text: 'text-blue-700' };
            case 'received': return { bg: 'bg-green-100', text: 'text-green-700' };
            case 'cancelled': return { bg: 'bg-red-100', text: 'text-red-700' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-700' };
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock size={16} />;
            case 'in_transit': return <Truck size={16} />;
            case 'received': return <CheckCircle size={16} />;
            default: return <X size={16} />;
        }
    };

    const getNextStatus = (currentStatus: string) => {
        switch (currentStatus) {
            case 'pending': return 'in_transit';
            case 'in_transit': return 'received';
            default: return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: COLORS.accent }}></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: COLORS.primary }}>Transfers</h1>
                    <p className="text-sm text-gray-500">Manage stock transfers between locations</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: COLORS.accent }}
                >
                    <Plus size={18} />
                    New Transfer
                </button>
            </div>

            {/* Transfers List */}
            <div className="space-y-4">
                {transfers.map((transfer) => {
                    const statusStyle = getStatusColor(transfer.status);
                    const nextStatus = getNextStatus(transfer.status);
                    
                    return (
                        <div key={transfer.id} className="rounded-xl shadow-sm p-6" style={{ backgroundColor: COLORS.card }}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-semibold" style={{ color: COLORS.primary }}>
                                            #{transfer.transfer_number}
                                        </h3>
                                        <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                            {getStatusIcon(transfer.status)}
                                            {transfer.status}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                        <span className="font-medium">{WAREHOUSES.find(w => w.id === transfer.from_warehouse)?.name || transfer.from_warehouse}</span>
                                        <ArrowLeftRight size={16} style={{ color: COLORS.accent }} />
                                        <span className="font-medium">{WAREHOUSES.find(w => w.id === transfer.to_warehouse)?.name || transfer.to_warehouse}</span>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2">
                                        {transfer.items.map((item, idx) => (
                                            <span key={idx} className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: COLORS.background }}>
                                                {item.product_name} × {item.quantity}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                
                                {nextStatus && (
                                    <div className="flex gap-2">
                                        {transfer.status === 'pending' && (
                                            <button
                                                onClick={() => handleUpdateStatus(transfer.id, 'in_transit')}
                                                className="px-4 py-2 rounded-lg text-white text-sm transition-colors"
                                                style={{ backgroundColor: COLORS.warning }}
                                            >
                                                Mark In Transit
                                            </button>
                                        )}
                                        {transfer.status === 'in_transit' && (
                                            <button
                                                onClick={() => handleUpdateStatus(transfer.id, 'received')}
                                                className="px-4 py-2 rounded-lg text-white text-sm transition-colors"
                                                style={{ backgroundColor: COLORS.success }}
                                            >
                                                Mark Received
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {transfers.length === 0 && (
                    <div className="text-center py-12 rounded-xl" style={{ backgroundColor: COLORS.card }}>
                        <ArrowLeftRight size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No transfers yet</p>
                    </div>
                )}
            </div>

            {/* Create Transfer Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" style={{ backgroundColor: COLORS.card }}>
                        <div className="p-6 border-b" style={{ borderColor: '#e5e7eb' }}>
                            <h2 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                                Create New Transfer
                            </h2>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
                            <div className="space-y-6">
                                {/* Warehouse Selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">From Warehouse</label>
                                        <select
                                            value={fromWarehouse}
                                            onChange={(e) => setFromWarehouse(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                                            style={{ borderColor: '#e5e7eb' }}
                                            required
                                        >
                                            <option value="">Select...</option>
                                            {WAREHOUSES.map(w => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">To Warehouse</label>
                                        <select
                                            value={toWarehouse}
                                            onChange={(e) => setToWarehouse(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                                            style={{ borderColor: '#e5e7eb' }}
                                            required
                                        >
                                            <option value="">Select...</option>
                                            {WAREHOUSES.map(w => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Add Items */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Add Items</label>
                                    <div className="flex gap-3">
                                        <select
                                            value={selectedProduct?.id || ""}
                                            onChange={(e) => {
                                                const product = products.find(p => p.id === e.target.value);
                                                setSelectedProduct(product || null);
                                            }}
                                            className="flex-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                                            style={{ borderColor: '#e5e7eb' }}
                                        >
                                            <option value="">Select product...</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} (Stock: {p.current_qty})
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            value={quantity}
                                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                            className="w-24 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                                            style={{ borderColor: '#e5e7eb' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddItem}
                                            disabled={!selectedProduct}
                                            className="px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                                            style={{ backgroundColor: COLORS.accent }}
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>

                                {/* Items List */}
                                {items.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Items</label>
                                        <div className="space-y-2">
                                            {items.map((item, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 rounded-lg border" style={{ backgroundColor: COLORS.background, borderColor: '#e5e7eb' }}>
                                                    <div className="flex items-center gap-3">
                                                        <Package size={18} style={{ color: COLORS.accent }} />
                                                        <span className="font-medium">{item.product_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(index)}
                                                            className="p-1 rounded hover:bg-red-100 text-red-500"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex gap-3 pt-6 mt-6 border-t" style={{ borderColor: '#e5e7eb' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                                    style={{ borderColor: '#e5e7eb' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={items.length === 0}
                                    className="flex-1 px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                                    style={{ backgroundColor: COLORS.accent }}
                                >
                                    Create Transfer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
