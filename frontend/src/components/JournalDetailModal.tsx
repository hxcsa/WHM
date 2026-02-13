"use client";

import { X, Calendar, FileText, Hash, CreditCard } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface JournalDetailModalProps {
    journal: any;
    onClose: () => void;
}

export default function JournalDetailModal({ journal, onClose }: JournalDetailModalProps) {
    const { t, locale } = useLanguage();

    if (!journal) return null;

    const totalDebit = journal.lines?.reduce((sum: number, line: any) => sum + Number(line.debit || 0), 0) || 0;
    const totalCredit = journal.lines?.reduce((sum: number, line: any) => sum + Number(line.credit || 0), 0) || 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 bg-slate-900 text-white flex justify-between items-start shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <FileText size={24} className="text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">{journal.number}</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Journal Entry Details</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Info Bar */}
                <div className="bg-slate-50 border-b border-slate-100 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Date</p>
                            <p className="font-bold text-slate-700">
                                {new Date(journal.date).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400">
                            <Hash size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Reference</p>
                            <p className="font-bold text-slate-700">{journal.number}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Total Amount</p>
                            <p className="font-black text-xl text-slate-800">
                                {totalDebit.toLocaleString()} <span className="text-xs text-slate-400 font-bold">IQD</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Description */}
                {journal.description && (
                    <div className="px-6 py-4 border-b border-slate-100 shrink-0">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Description</p>
                        <p className="text-slate-600 font-medium italic">"{journal.description}"</p>
                    </div>
                )}

                {/* Lines Table */}
                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">#</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest w-1/3">Account</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Memo</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Debit</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Credit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {journal.lines?.map((line: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{idx + 1}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-700 text-sm">{line.account_id}</div>
                                        {/* Ideally we'd map this ID to a name if we had the map available */}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500 italic max-w-xs truncate">
                                        {line.memo || "-"}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                                        {Number(line.debit) > 0 ? Number(line.debit).toLocaleString() : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-rose-600">
                                        {Number(line.credit) > 0 ? Number(line.credit).toLocaleString() : "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200 font-black text-sm">
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-right text-slate-500 uppercase tracking-widest text-xs">Totals</td>
                                <td className="px-6 py-4 text-right text-emerald-700 border-t-2 border-emerald-200">{totalDebit.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right text-rose-700 border-t-2 border-rose-200">{totalCredit.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                    <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${journal.status === 'POSTED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                journal.status === 'DRAFT' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                    'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                            {journal.status}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all text-sm shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
