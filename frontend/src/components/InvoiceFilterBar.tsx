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
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by invoice # or customer name / بحث..."
                        className="w-full ps-10 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm font-medium transition-all"
                        value={filters.search}
                        onChange={(e) => handleChange("search", e.target.value)}
                    />
                </div>

                {/* Status Filter */}
                <div className="w-full md:w-56">
                    <div className="relative">
                        <Filter className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            className="w-full ps-10 pe-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all"
                            value={filters.status}
                            onChange={(e) => handleChange("status", e.target.value)}
                        >
                            <option value="">All Statuses / جميع الحالات</option>
                            <option value="DRAFT">Draft / مسودة</option>
                            <option value="ISSUED">Issued / صادرة</option>
                            <option value="PAID">Paid / مدفوعة</option>
                            <option value="OVERDUE">Overdue / متأخرة</option>
                            <option value="VOIDED">Voided / ملغاة</option>
                        </select>
                    </div>
                </div>

                {/* Date Range */}
                <div className="flex gap-2 items-center">
                    <input
                        type="date"
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={filters.dateFrom}
                        onChange={(e) => handleChange("dateFrom", e.target.value)}
                        title="From Date / من تاريخ"
                    />
                    <span className="text-slate-300 font-bold">→</span>
                    <input
                        type="date"
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={filters.dateTo}
                        onChange={(e) => handleChange("dateTo", e.target.value)}
                        title="To Date / إلى تاريخ"
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
                        className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200"
                        title="Clear Filters / مسح"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}
