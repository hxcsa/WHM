"use client";

import { useEffect, useState } from "react";
import { Plus, Truck, Check, Clock, FileText, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import React, { useCallback, memo } from "react";
import { fetchWithAuth } from "@/lib/api";
import { useRouter } from "next/navigation";

const StatusBadge = memo(({ status }: { status: string }) => {
    const colors: Record<string, string> = {
        DRAFT: "bg-slate-100 text-slate-600",
        APPROVED: "bg-emerald-100 text-emerald-600",
        RECEIVED: "bg-blue-100 text-blue-600",
        PAID: "bg-purple-100 text-purple-600"
    };
    return (
        <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${colors[status] || "bg-slate-100 text-slate-600"}`}>
            {status}
        </span>
    );
});
StatusBadge.displayName = "StatusBadge";

const StatCard = memo(({ label, value, icon, color }: any) => (
    <div className={`${color} text-white p-6 rounded-2xl flex items-center justify-between shadow-lg hover:scale-[1.02] transition-transform`}>
        <div>
            <p className="text-[10px] font-black opacity-70 uppercase tracking-widest">{label}</p>
            <h4 className="text-2xl font-black">{value}</h4>
        </div>
        <div className="p-3 bg-white/10 rounded-xl">{icon}</div>
    </div>
));
StatCard.displayName = "StatCard";

const PurchaseOrderRow = memo(({ po, onApprove }: any) => (
    <tr className="hover:bg-slate-50/50 transition-colors">
        <td className="px-6 py-4 font-mono text-xs font-black text-indigo-600">{po.number}</td>
        <td className="px-6 py-4 font-bold text-slate-700">{po.supplier_name}</td>
        <td className="px-6 py-4 font-mono text-sm font-black">{Number(po.total).toLocaleString()} {po.currency}</td>
        <td className="px-6 py-4">
            <StatusBadge status={po.status} />
        </td>
        <td className="px-6 py-4 text-end">
            <div className="flex justify-end gap-2 items-center">
                <button
                    onClick={() => window.open(`/api/purchasing/invoice/${po.id}`, '_blank')}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Download Order"
                >
                    <FileText size={18} />
                </button>
                {po.status === "DRAFT" && (
                    <button
                        onClick={() => onApprove(po.id)}
                        className="text-[10px] font-black bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors active:scale-95"
                    >
                        <Check size={12} className="inline me-1" /> Approve
                    </button>
                )}
            </div>
        </td>
    </tr>
));
PurchaseOrderRow.displayName = "PurchaseOrderRow";

export default function PurchasingPage() {
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();
    const router = useRouter();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/purchase-orders");
            const data = await res.json();
            if (Array.isArray(data)) setPurchaseOrders(data);
        } catch (e) {
            console.error("PO fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const approvePO = useCallback(async (poId: string) => {
        if (!confirm("Are you sure you want to approve this order?")) return;
        await fetchWithAuth(`/api/purchase-orders/${poId}/approve`, { method: "POST" });
        fetchData();
    }, [fetchData]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 font-heading">Purchasing / المشتريات</h1>
                    <p className="text-sm text-slate-500 font-medium">Manage Purchase Orders & Supplier Relations</p>
                </div>
                <button
                    onClick={() => router.push("/purchasing/orders/new")}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 font-black text-sm"
                >
                    <Plus size={20} /> New Purchase Order / طلب شراء جديد
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Total POs" value={purchaseOrders.length.toString()} icon={<FileText />} color="bg-blue-500" />
                <StatCard label="Pending Approval" value={purchaseOrders.filter(p => p.status === "DRAFT").length.toString()} icon={<Clock />} color="bg-amber-500" />
                <StatCard label="Approved" value={purchaseOrders.filter(p => p.status === "APPROVED").length.toString()} icon={<Check />} color="bg-emerald-500" />
                <StatCard label="Received" value={purchaseOrders.filter(p => p.status === "RECEIVED").length.toString()} icon={<Truck />} color="bg-slate-800" />
            </div>

            {/* Table */}
            <div className="enterprise-card border-none shadow-sm overflow-hidden bg-white rounded-2xl">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input placeholder="Search POs..." className="w-full ps-10 pe-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400 font-bold">Loading...</div>
                ) : (
                    <table className="w-full text-start">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-6 py-4">PO Number</th>
                                <th className="px-6 py-4">Supplier</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {purchaseOrders.map(po => (
                                <PurchaseOrderRow key={po.id} po={po} onApprove={approvePO} />
                            ))}
                            {purchaseOrders.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">No purchase orders yet</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

