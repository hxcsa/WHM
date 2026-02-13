import { Eye, Printer, Ban, CheckCircle } from "lucide-react";

interface InvoiceTableProps {
    invoices: any[];
    loading: boolean;
    onAction: (action: string, invoice: any) => void;
    role?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
        DRAFT: "bg-slate-100 text-slate-600",
        ISSUED: "bg-blue-100 text-blue-600",
        PAID: "bg-emerald-100 text-emerald-600",
        OVERDUE: "bg-rose-100 text-rose-600",
        VOIDED: "bg-gray-100 text-gray-400 line-through"
    };

    const labels: Record<string, string> = {
        DRAFT: "Draft / مسودة",
        ISSUED: "Issued / صادرة",
        PAID: "Paid / مدفوعة",
        OVERDUE: "Overdue / متأخرة",
        VOIDED: "Voided / ملغاة"
    };

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${colors[status] || "bg-slate-100"}`}>
            {labels[status] || status}
        </span>
    );
};

function formatDate(val: any): string {
    if (!val) return "-";
    // Handle Firestore timestamp objects
    if (val?.seconds || val?._seconds) {
        return new Date((val.seconds || val._seconds) * 1000).toLocaleDateString("en-GB");
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB");
}

function formatIQD(val: any): string {
    const n = Number(val || 0);
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Loading skeleton
function LoadingSkeleton() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100">
                <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
            </div>
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 px-6 py-4 border-b border-slate-50">
                    <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                </div>
            ))}
        </div>
    );
}

export default function InvoiceTable({ invoices, loading, onAction, role = "viewer" }: InvoiceTableProps) {
    const canModify = role === "admin" || role === "accountant";

    if (loading) {
        return <LoadingSkeleton />;
    }

    if (invoices.length === 0) {
        return (
            <div className="w-full bg-white rounded-xl shadow-sm border border-slate-100 p-16 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Eye size={28} className="text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold text-sm">No invoices found</p>
                <p className="text-slate-400 text-xs mt-1">Try adjusting your filters or create a new invoice</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-start">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th className="px-5 py-4 text-[10px] uppercase font-black text-slate-400 tracking-wider">Number</th>
                        <th className="px-5 py-4 text-[10px] uppercase font-black text-slate-400 tracking-wider">Customer / العميل</th>
                        <th className="px-5 py-4 text-[10px] uppercase font-black text-slate-400 tracking-wider">Issue Date</th>
                        <th className="px-5 py-4 text-[10px] uppercase font-black text-slate-400 tracking-wider">Due Date</th>
                        <th className="px-5 py-4 text-[10px] uppercase font-black text-slate-400 tracking-wider text-end">Total (IQD)</th>
                        <th className="px-5 py-4 text-[10px] uppercase font-black text-slate-400 tracking-wider text-end">Paid</th>
                        <th className="px-5 py-4 text-[10px] uppercase font-black text-slate-400 tracking-wider text-end">Remaining</th>
                        <th className="px-5 py-4 text-[10px] uppercase font-black text-slate-400 tracking-wider">Status</th>
                        <th className="px-5 py-4 text-[10px] uppercase font-black text-slate-400 tracking-wider">Created By</th>
                        <th className="px-5 py-4 text-[10px] uppercase font-black text-slate-400 tracking-wider text-end">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {invoices.map((invoice) => {
                        const remaining = Number(invoice.remaining_amount ?? (Number(invoice.total || 0) - Number(invoice.paid_amount || 0)));
                        return (
                            <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-5 py-4 font-mono text-[11px] font-black text-blue-600">
                                    {invoice.invoice_number}
                                </td>
                                <td className="px-5 py-4">
                                    <span className="font-bold text-slate-700 block text-sm">{invoice.customer_name}</span>
                                    {invoice.warehouse_name && (
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{invoice.warehouse_name}</span>
                                    )}
                                </td>
                                <td className="px-5 py-4 text-[11px] text-slate-500 font-bold">
                                    {formatDate(invoice.issue_date)}
                                </td>
                                <td className="px-5 py-4 text-[11px] text-slate-500 font-bold">
                                    {formatDate(invoice.due_date)}
                                </td>
                                <td className="px-5 py-4 text-end font-mono text-sm font-black text-slate-900">
                                    {formatIQD(invoice.total)}
                                </td>
                                <td className="px-5 py-4 text-end font-mono text-sm font-bold text-emerald-600">
                                    {formatIQD(invoice.paid_amount)}
                                </td>
                                <td className="px-5 py-4 text-end font-mono text-sm font-bold text-amber-600">
                                    {formatIQD(remaining)}
                                </td>
                                <td className="px-5 py-4">
                                    <StatusBadge status={invoice.status} />
                                </td>
                                <td className="px-5 py-4 text-[11px] text-slate-400 font-bold truncate max-w-[120px]" title={invoice.created_by || ""}>
                                    {invoice.created_by || "-"}
                                </td>
                                <td className="px-5 py-4 text-end">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onAction('view', invoice)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                            title="View Details"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            onClick={() => onAction('print', invoice)}
                                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                                            title="Print Invoice"
                                        >
                                            <Printer size={16} />
                                        </button>

                                        {canModify && invoice.status !== 'PAID' && invoice.status !== 'VOIDED' && (
                                            <button
                                                onClick={() => onAction('pay', invoice)}
                                                className="p-2 text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"
                                                title="Mark as Paid"
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                        )}

                                        {canModify && invoice.status !== 'VOIDED' && (
                                            <button
                                                onClick={() => onAction('void', invoice)}
                                                className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Void Invoice"
                                            >
                                                <Ban size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
