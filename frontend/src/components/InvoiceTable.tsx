import { Eye } from "lucide-react";

interface InvoiceTableProps {
    invoices: any[];
    loading: boolean;
    onAction: (action: string, invoice: any) => void;
    role?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'VOIDED') {
        return (
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500 line-through decoration-2">
                VOIDED
            </span>
        );
    }

    const colors: Record<string, string> = {
        DRAFT: "bg-slate-100 text-slate-600",
        ISSUED: "bg-blue-100 text-blue-600",
        PAID: "bg-emerald-100 text-emerald-600",
        OVERDUE: "bg-rose-100 text-rose-600",
    };

    const labels: Record<string, string> = {
        DRAFT: "Draft",
        ISSUED: "Issued",
        PAID: "Paid",
        OVERDUE: "Overdue",
        VOIDED: "Voided"
    };

    return (
        <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${colors[status] || "bg-slate-100"}`}>
            {labels[status] || status}
        </span>
    );
};

function formatDate(val: any): string {
    if (!val) return "-";
    if (val?.seconds || val?._seconds) {
        return new Date((val.seconds || val._seconds) * 1000).toLocaleDateString("en-GB", {
            day: '2-digit',
            month: 'short',
            year: '2-digit'
        });
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB", {
        day: '2-digit',
        month: 'short',
        year: '2-digit'
    });
}

function formatIQD(val: any): string {
    const n = Number(val || 0);
    if (n >= 1000000) {
        return (n / 1000000).toFixed(1) + 'M';
    }
    if (n >= 1000) {
        return (n / 1000).toFixed(0) + 'k';
    }
    return n.toLocaleString();
}

function formatIQDFull(val: any): string {
    const n = Number(val || 0);
    return n.toLocaleString();
}

// Loading skeleton
function LoadingSkeleton() {
    return (
        <div className="enterprise-card overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100">
                <div className="h-4 w-32 sm:w-48 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="overflow-x-auto">
                <div className="min-w-[800px] p-4 space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex gap-4">
                            <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                            <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
                            <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
                            <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
                            <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                            <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
                            <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
                            <div className="h-4 w-14 bg-slate-100 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function InvoiceTable({ invoices, loading, onAction, role = "viewer" }: InvoiceTableProps) {
    if (loading) {
        return <LoadingSkeleton />;
    }

    if (invoices.length === 0) {
        return (
            <div className="enterprise-card p-8 sm:p-16 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Eye size={24} className="text-slate-300 sm:w-7 sm:h-7" />
                </div>
                <p className="text-slate-500 font-bold text-sm">No invoices found</p>
                <p className="text-slate-400 text-xs mt-1">Try adjusting your filters or create a new invoice</p>
            </div>
        );
    }

    return (
        <div className="enterprise-card overflow-hidden">
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full min-w-[900px] sm:min-w-0 text-start">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-3 sm:px-5 py-3 sm:py-4 text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider whitespace-nowrap">Number</th>
                            <th className="px-3 sm:px-5 py-3 sm:py-4 text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider">Customer</th>
                            <th className="px-3 sm:px-5 py-3 sm:py-4 text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider whitespace-nowrap">Issue Date</th>
                            <th className="px-3 sm:px-5 py-3 sm:py-4 text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider whitespace-nowrap hidden sm:table-cell">Due Date</th>
                            <th className="px-3 sm:px-5 py-3 sm:py-4 text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider text-end whitespace-nowrap">Total</th>
                            <th className="px-3 sm:px-5 py-3 sm:py-4 text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider text-end whitespace-nowrap hidden sm:table-cell">Paid</th>
                            <th className="px-3 sm:px-5 py-3 sm:py-4 text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider text-end whitespace-nowrap">Remaining</th>
                            <th className="px-3 sm:px-5 py-3 sm:py-4 text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider">Status</th>
                            <th className="px-3 sm:px-5 py-3 sm:py-4 text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider hidden md:table-cell">Created By</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {invoices.map((invoice) => {
                            const total = Number(invoice.total_amount || 0);
                            const paid = Number(invoice.amount_paid || 0);
                            const remaining = total - paid;

                            return (
                                <tr
                                    key={invoice.id}
                                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                    onClick={() => onAction('view', invoice)}
                                >
                                    <td className="px-3 sm:px-5 py-3 sm:py-4 font-mono text-[10px] sm:text-[11px] font-black text-blue-600 whitespace-nowrap">
                                        {invoice.invoice_number}
                                    </td>
                                    <td className="px-3 sm:px-5 py-3 sm:py-4">
                                        <span className="font-bold text-slate-700 block text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{invoice.customer_name}</span>
                                        {invoice.warehouse_name && (
                                            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">{invoice.warehouse_name}</span>
                                        )}
                                    </td>
                                    <td className="px-3 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-[11px] text-slate-500 font-bold whitespace-nowrap">
                                        {formatDate(invoice.issue_date)}
                                    </td>
                                    <td className="px-3 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-[11px] text-slate-500 font-bold whitespace-nowrap hidden sm:table-cell">
                                        {formatDate(invoice.due_date)}
                                    </td>
                                    <td className="px-3 sm:px-5 py-3 sm:py-4 text-end font-mono text-xs sm:text-sm font-black text-slate-900 whitespace-nowrap" title={`${formatIQDFull(total)} IQD`}>
                                        {formatIQD(total)}
                                    </td>
                                    <td className="px-3 sm:px-5 py-3 sm:py-4 text-end font-mono text-xs sm:text-sm font-bold text-emerald-600 whitespace-nowrap hidden sm:table-cell" title={`${formatIQDFull(paid)} IQD`}>
                                        {formatIQD(paid)}
                                    </td>
                                    <td className="px-3 sm:px-5 py-3 sm:py-4 text-end font-mono text-xs sm:text-sm font-bold text-amber-600 whitespace-nowrap" title={`${formatIQDFull(remaining)} IQD`}>
                                        {formatIQD(remaining)}
                                    </td>
                                    <td className="px-3 sm:px-5 py-3 sm:py-4">
                                        <div className="flex flex-col sm:flex-row gap-1">
                                            <StatusBadge status={invoice.status} />
                                            {invoice.payment_status && invoice.payment_status !== 'paid' && invoice.payment_status !== 'unpaid' && (
                                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px] sm:text-[9px] font-bold uppercase whitespace-nowrap">{invoice.payment_status}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-[11px] text-slate-400 font-bold truncate max-w-[80px] sm:max-w-[120px] hidden md:table-cell" title={invoice.created_by || ""}>
                                        {invoice.created_by || "-"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
