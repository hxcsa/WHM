"use client";

import { useEffect, useState } from "react";
import { X, Landmark, ShieldCheck, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchWithAuth } from "@/lib/api";

interface BalanceSheetViewProps {
    onClose: () => void;
}

export default function BalanceSheetView({ onClose }: BalanceSheetViewProps) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    useEffect(() => {
        fetchWithAuth("/api/reports/balance-sheet")
            .then(res => res.json())
            .then(d => {
                setStats(d);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const assets = Number(stats?.total_assets || 0);
    const liabilities = Number(stats?.total_liabilities || 0);
    const equity = Number(stats?.total_equity || 0);
    const isBalanced = stats?.balanced ?? true;
    const { locale } = useLanguage();

    const Section = ({ title, items, total, color }: any) => (
        <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-2">{title}</h4>
            <div className="space-y-2">
                {items?.map((item: any) => (
                    <div key={item.code} className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">
                            {item.code} - {locale === 'ar' ? item.name_ar : item.name_en}
                        </span>
                        <span className="font-bold tabular-nums text-slate-700">{Number(item.balance).toLocaleString()}</span>
                    </div>
                ))}
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-slate-800 pt-2">
                <span>Total</span>
                <span className={`font-black tabular-nums ${color}`}>{total.toLocaleString()} IQD</span>
            </div>
        </section>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden">
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <Landmark size={20} />
                        <div>
                            <h3 className="text-lg font-bold">{locale === 'ar' ? 'الميزانية العمومية' : 'Balance Sheet'}</h3>
                            <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Statement of Financial Position</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-auto p-8 bg-slate-50/30">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-slate-400 font-bold animate-pulse">{t("loading")}</div>
                    ) : (
                        <div className="space-y-8">
                            <div className={`p-4 rounded-xl flex items-center gap-4 border ${isBalanced ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                                {isBalanced ? <ShieldCheck className="text-emerald-500" /> : <AlertCircle className="text-rose-500" />}
                                <div className="text-xs font-bold">
                                    {isBalanced ? "Ledger is in balance. A = L + E" : "Accounting Imbalance detected. Please check journal entries."}
                                </div>
                            </div>

                            <Section
                                title={locale === 'ar' ? "الأصول" : "Assets"}
                                items={stats.assets}
                                total={assets}
                                color="text-emerald-600"
                            />
                            <Section
                                title={locale === 'ar' ? "الخصوم" : "Liabilities"}
                                items={stats.liabilities}
                                total={liabilities}
                                color="text-rose-600"
                            />
                            <Section
                                title={locale === 'ar' ? "حقوق الملكية" : "Equity"}
                                items={stats.equity}
                                total={equity}
                                color="text-blue-600"
                            />

                            <div className="pt-8 mt-8 border-t border-slate-200">
                                <div className="flex justify-between items-end p-6 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-900/20">
                                    <div>
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total L + E</p>
                                        <h4 className="text-3xl font-black tabular-nums">{(liabilities + equity).toLocaleString()}</h4>
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 mb-1">IQD</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
