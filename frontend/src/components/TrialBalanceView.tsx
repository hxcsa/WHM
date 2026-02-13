"use client";

import { useEffect, useState } from "react";
import { X, PieChart, Download, ArrowDownUp } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TrialBalanceView() {
    const [tb, setTb] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { t, locale } = useLanguage();

    const fetchTB = () => {
        setLoading(true);
        fetchWithAuth("/api/reports/trial-balance")
            .then(res => res.json())
            .then(d => {
                setTb(d);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchTB();
    }, []);

    const data = tb?.rows || [];
    const totals = {
        debit: Number(tb?.total_debit || 0),
        credit: Number(tb?.total_credit || 0),
    };
    const difference = totals.debit - totals.credit;
    const isBalanced = Math.abs(difference) < 0.01;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header / Toolbar */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${isBalanced ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                    <span className="text-sm font-bold text-slate-600">
                        {isBalanced ? "Ledger Balanced" : `Unbalanced: ${difference.toLocaleString()} IQD`}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchTB}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Refresh Data"
                    >
                        <ArrowDownUp size={18} />
                    </button>
                    <button
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Export PDF"
                    >
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="overflow-auto max-h-[70vh]">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                        <ArrowDownUp className="animate-spin text-slate-300" size={32} />
                        <p className="text-xs font-semibold uppercase tracking-wider">Loading Ledger...</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("accountCode")}</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("accountName")}</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right hidden md:table-cell">{t("type")}</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">{t("debit")}</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">{t("credit")}</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">{t("balance")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {data.map((row: any) => (
                                <tr key={row.account_id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-3 text-sm text-slate-500 font-mono group-hover:text-indigo-600 transition-colors">
                                        {row.code}
                                    </td>
                                    <td className="px-6 py-3 text-sm font-medium text-slate-700">
                                        {row.name}
                                    </td>
                                    <td className="px-6 py-3 text-right text-xs text-slate-400 uppercase tracking-wider hidden md:table-cell">
                                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-500">
                                            {row.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono text-sm text-slate-600">
                                        {Number(row.debit) > 0 ? Number(row.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono text-sm text-slate-600">
                                        {Number(row.credit) > 0 ? Number(row.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td className={`px-6 py-3 text-right font-mono text-sm font-semibold tabular-nums ${Number(row.net_balance) < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                                        {Number(row.net_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200 sticky bottom-0 z-10 font-semibold text-sm">
                            <tr>
                                <td colSpan={3} className="px-6 py-3 uppercase tracking-wider text-xs text-slate-500">Total</td>
                                <td className="px-6 py-3 text-right text-slate-700">{totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="px-6 py-3 text-right text-slate-700">{totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className={`px-6 py-3 text-right ${difference === 0 ? 'text-slate-700' : 'text-rose-600'}`}>
                                    {difference === 0 ? "0.00" : difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>
        </div>
    );
}
