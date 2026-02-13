"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Filter, Box, History, Thermometer } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { Loader2 } from "lucide-react";
import ProductForm from "./ProductForm";

export default function ProductsTab() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/warehouse/products");
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (err) {
            console.error("Failed to fetch products:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm))
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                    />
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-gradient-to-r from-primary to-accent text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-primary/25 transition-all font-bold text-sm"
                >
                    <Plus size={20} /> Add Product / إضافة منتج
                </button>
            </div>

            {showAddModal && (
                <ProductForm onClose={() => setShowAddModal(false)} onSuccess={fetchProducts} />
            )}

            <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Product / المنتج</th>
                                <th className="px-6 py-4">SKU / Code</th>
                                <th className="px-6 py-4">Stock / المخزون</th>
                                <th className="px-6 py-4 text-emerald-600">Cost / التكلفة</th>
                                <th className="px-6 py-4 text-blue-600">Price / البيع</th>
                                <th className="px-6 py-4">Expiry / الانتهاء</th>
                                <th className="px-6 py-4 text-right">Added / الإضافة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="animate-spin text-primary" size={32} />
                                            <span className="font-bold text-xs uppercase tracking-widest">Loading Inventory...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">No products found matching your search.</td>
                                </tr>
                            ) : filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-700 group-hover:text-primary transition-colors">{product.name}</div>
                                        {product.barcode && <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1"><Box size={10} /> {product.barcode}</div>}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{product.sku}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${(product.initial_quantity || 0) > 0
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-rose-100 text-rose-700'
                                            }`}>
                                            {product.initial_quantity || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm font-bold text-slate-600">
                                        ${Number(product.cost_price || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm font-bold text-primary">
                                        ${Number(product.selling_price || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                        {product.expiry_date ? (
                                            <div className="flex items-center gap-1">
                                                <Thermometer size={14} className="text-orange-400" />
                                                <span>{new Date(product.expiry_date).toLocaleDateString()}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right text-xs text-slate-400 font-medium">
                                        {product.created_at ? new Date(product.created_at).toLocaleDateString() : "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
