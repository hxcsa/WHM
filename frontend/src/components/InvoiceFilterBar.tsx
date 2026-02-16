import { Search, Filter, X } from "lucide-react";
import { useState } from "react";

interface InvoiceFilterBarProps {
    onFilterChange: (filters: any) => void;
}

export default function InvoiceFilterBar({ onFilterChange }: InvoiceFilterBarProps) {
    const [filters, setFilters] = useState({
        status: "",
        search: "",
        dateFrom: "",
        dateTo: ""
    });

    const handleChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const hasActiveFilters = filters.status || filters.search || filters.dateFrom || filters.dateTo;

    return (
        <div className="enterprise-card p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search invoices..."
                        className="w-full ps-10 pe-4 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm font-medium transition-all"
                        value={filters.search}
                        onChange={(e) => handleChange("search", e.target.value)}
                    />
                </div>

                {/* Status Filter */}
                <div className="w-full sm:w-auto sm:min-w-[160px]">
                    <div className="relative">
                        <Filter className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            className="w-full ps-10 pe-8 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl appearance-none text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all"
                            value={filters.status}
                            onChange={(e) => handleChange("status", e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="ISSUED">Issued</option>
                            <option value="PAID">Paid</option>
                            <option value="OVERDUE">Overdue</option>
                            <option value="VOIDED">Voided</option>
                        </select>
                    </div>
                </div>

                {/* Date Range - Hidden on mobile, visible on larger screens */}
                <div className="hidden sm:flex gap-2 items-center">
                    <input
                        type="date"
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={filters.dateFrom}
                        onChange={(e) => handleChange("dateFrom", e.target.value)}
                        title="From Date"
                    />
                    <span className="text-slate-300 font-bold">→</span>
                    <input
                        type="date"
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={filters.dateTo}
                        onChange={(e) => handleChange("dateTo", e.target.value)}
                        title="To Date"
                    />
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <button
                        onClick={() => {
                            const cleared = { status: "", search: "", dateFrom: "", dateTo: "" };
                            setFilters(cleared);
                            onFilterChange(cleared);
                        }}
                        className="p-2.5 sm:p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200 touch-target flex items-center justify-center"
                        title="Clear Filters"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Mobile Date Filters */}
            <div className="sm:hidden mt-3 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">From Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            value={filters.dateFrom}
                            onChange={(e) => handleChange("dateFrom", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">To Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            value={filters.dateTo}
                            onChange={(e) => handleChange("dateTo", e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
