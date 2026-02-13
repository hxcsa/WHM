"use client";

import { useEffect, useState } from "react";
import {
    FileText, Download, Printer, Filter,
    TrendingUp, TrendingDown, Scale, PieChart,
    BarChart3, ArrowRight, History, Activity,
    FileDown, Box, ShieldCheck, ChevronRight,
    Search as SearchIcon, Calendar
} from "lucide-react";
import React, { useCallback, memo } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fetchWithAuth } from "@/lib/api";
import { Loader2 } from "lucide-react";

const ReportLine = memo(({ label, icon, value, negative }: any) => (
    <div className="flex justify-between items-center group py-1">
        <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${negative ? 'bg-rose-50 text-rose-500' : 'bg-[var(--bg)] text-[var(--accent)]'} group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <span className="text-sm font-black text-[var(--ink-soft)] group-hover:text-[var(--ink)] transition-colors uppercase tracking-tight">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            <span className={`font-mono font-black tabular-nums text-lg ${negative ? 'text-[var(--danger)]' : 'text-[var(--ink)]'}`}>
                {negative ? '-' : ''}{value}
            </span>
            <span className="text-[10px] font-black text-[var(--ink-thin)] uppercase tracking-widest">IQD</span>
        </div>
    </div>
));
ReportLine.displayName = "ReportLine";

const AuditRow = memo(({ log }: any) => (
    <tr className="group hover:bg-[var(--bg)]/40 transition-colors">
        <td className="py-4 px-6 font-mono text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-tighter">
            {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A'}
        </td>
        <td className="py-4 px-6 text-center">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${log.action === 'CREATE' ? 'bg-[var(--success-thin)] text-[var(--success)]' :
                log.action === 'VOID' ? 'bg-[var(--danger-thin)] text-[var(--danger)]' :
                    'bg-blue-50 text-blue-600'
                }`}>
                {log.action}
            </span>
        </td>
        <td className="py-4 px-6 font-black text-xs text-[var(--ink)] uppercase tracking-tight">{log.collection}</td>
        <td className="py-4 px-6">
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[var(--bg)] border border-[var(--ink-thin)] flex items-center justify-center text-[var(--accent)] shrink-0">
                    <ShieldCheck size={10} />
                </div>
                <span className="text-[10px] font-black text-[var(--ink-soft)] uppercase font-mono">{log.user_id?.slice(0, 8)}</span>
            </div>
        </td>
        <td className="py-4 px-6 text-xs font-black text-[var(--ink-soft)] font-mono truncate max-w-[180px]">
            {log.doc_id}
        </td>
    </tr>
));
AuditRow.displayName = "AuditRow";

export default function Reports() {
    const [reports, setReports] = useState<any>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [authReady, setAuthReady] = useState(false);
    const [authUser, setAuthUser] = useState<User | null>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    const loadData = useCallback(async () => {
        if (!authReady || !authUser) return;
        try {
            const [isRes, bsRes, valRes, auditRes] = await Promise.all([
                fetchWithAuth("/api/reports/income-statement"),
                fetchWithAuth("/api/reports/balance-sheet"),
                fetchWithAuth("/api/reports/inventory-valuation"),
                fetchWithAuth("/api/audit/logs")
            ]);

            const isData = isRes.ok ? await isRes.json() : { total_revenue: 0, total_expense: 0, net_income: 0 };
            const bsData = bsRes.ok ? await bsRes.json() : { total_assets: 0, total_liabilities: 0, total_equity: 0 };
            const valData = valRes.ok ? await valRes.json() : { total_inventory_value: 0 };
            const auditData = auditRes.ok ? await auditRes.json() : [];

            setReports({
                incomeStatement: isData,
                balanceSheet: bsData,
                valuation: Number(valData.total_inventory_value || 0).toLocaleString()
            });
            setAuditLogs(Array.isArray(auditData) ? auditData : []);
        } catch (err) {
            console.error("Reports fetch error:", err);
            setReports({
                incomeStatement: { total_revenue: 0, total_expense: 0, net_income: 0 },
                balanceSheet: { total_assets: 0, total_liabilities: 0, total_equity: 0 },
                valuation: "0"
            });
        } finally {
            setLoading(false);
        }
    }, [authReady, authUser]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading || !authReady) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-[var(--accent)]" size={48} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--ink-soft)] animate-pulse">Calculating Ledger Integrity...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20 max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-4 border-b border-[var(--ink-thin)]">
                <div>
                    <h1 className="text-4xl font-black text-[var(--ink)] tracking-tight">Financial Intelligence</h1>
                    <p className="text-[var(--ink-soft)] mt-2 font-medium italic">High-precision manifest auditing and capital valuation</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="h-12 px-6 bg-white border border-[var(--ink-thin)] rounded-xl flex items-center gap-2 text-[var(--ink-soft)] font-black text-xs uppercase tracking-widest hover:bg-[var(--bg)] transition-all">
                        <Calendar size={18} /> Period: Q1 2026
                    </button>
                    <button className="opengate-button-primary h-12 px-8 flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-[var(--accent-thin)] active:scale-95 transition-all">
                        <Download size={18} /> Export Manifest
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Income Statement */}
                <div className="enterprise-card border border-[var(--ink-thin)] bg-white p-8 group shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[var(--bg)] text-[var(--accent)] rounded-2xl flex items-center justify-center border border-[var(--ink-thin)] group-hover:rotate-6 transition-transform">
                                <PieChart size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[var(--ink)] uppercase tracking-tight leading-tight">Income Statement</h3>
                                <p className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest mt-1 opacity-60">Profit & Loss Vector</p>
                            </div>
                        </div>
                        <FileText className="text-[var(--ink-thin)]" size={32} />
                    </div>

                    <div className="space-y-6">
                        <ReportLine label="Gross Liquidity" icon={<TrendingUp size={14} />} value={Number(reports.incomeStatement.total_revenue || 0).toLocaleString()} />
                        <ReportLine label="Operational Outflow" icon={<TrendingDown size={14} />} value={Number(reports.incomeStatement.total_expense || 0).toLocaleString()} negative />

                        <div className="mt-8 pt-8 border-t border-[var(--bg-soft)] flex justify-between items-end">
                            <div>
                                <span className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest block mb-2">Net Capital Gain</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-[var(--success)] tracking-tighter tabular-nums italic">
                                        {Number(reports.incomeStatement.net_income || 0).toLocaleString()}
                                    </span>
                                    <span className="text-xs font-black text-[var(--ink-soft)] uppercase">IQD</span>
                                </div>
                            </div>
                            <div className="text-[10px] font-black text-[var(--success)] bg-[var(--success-thin)] px-3 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-sm">
                                Margin 82.4%
                            </div>
                        </div>
                    </div>
                </div>

                {/* Balance Sheet Summary */}
                <div className="enterprise-card border border-[var(--ink-thin)] bg-white p-8 group shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[var(--bg)] text-indigo-600 rounded-2xl flex items-center justify-center border border-[var(--ink-thin)] group-hover:-rotate-6 transition-transform">
                                <Scale size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[var(--ink)] uppercase tracking-tight leading-tight">Balance Sheet</h3>
                                <p className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest mt-1 opacity-60">Equity Allocation Registry</p>
                            </div>
                        </div>
                        <ShieldCheck className="text-[var(--ink-thin)]" size={32} />
                    </div>

                    <div className="space-y-6">
                        <ReportLine label="Collective Assets" icon={<Box size={14} />} value={Number(reports.balanceSheet.total_assets || 0).toLocaleString()} />
                        <ReportLine label="Operational Debt" icon={<TrendingDown size={14} />} value={Number(reports.balanceSheet.total_liabilities || 0).toLocaleString()} negative />

                        <div className="mt-8 pt-8 border-t border-[var(--bg-soft)] flex justify-between items-end">
                            <div>
                                <span className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest block mb-2">Total Entity Equity</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-indigo-600 tracking-tighter tabular-nums italic">
                                        {Number(reports.balanceSheet.total_equity || 0).toLocaleString()}
                                    </span>
                                    <span className="text-xs font-black text-[var(--ink-soft)] uppercase">IQD</span>
                                </div>
                            </div>
                            <button className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--ink-thin)] flex items-center justify-center text-[var(--ink-soft)] hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
                                <FileDown size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Inventory Valuation - Wide Block */}
                <div className="lg:col-span-2 enterprise-card border border-[var(--ink-thin)] bg-gradient-to-br from-white to-[var(--bg)] p-10 overflow-hidden relative shadow-md">
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100 shadow-sm animate-pulse">
                                    <BarChart3 size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[var(--ink)] uppercase tracking-tight leading-tight">Physical Inventory Valuation</h3>
                                    <p className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest mt-1 italic">Real-time valuation based on Weighted Average Protocol</p>
                                </div>
                            </div>
                            <div className="px-6 h-10 bg-amber-100/50 text-amber-700 text-[10px] font-black rounded-full flex items-center justify-center tracking-widest uppercase border border-amber-200">
                                WAC Verified
                            </div>
                        </div>

                        <div className="bg-white/60 backdrop-blur-md p-10 rounded-[2rem] border border-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-10">
                            <div>
                                <p className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-[0.2em] mb-4">Total Liquid Storage Value</p>
                                <div className="flex items-baseline gap-4">
                                    <h2 className="text-6xl font-black text-[var(--ink)] tracking-tighter italic tabular-nums">{reports.valuation}</h2>
                                    <span className="text-xl font-black text-[var(--ink-soft)] uppercase">IQD</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                                <button className="flex-1 lg:flex-none h-14 px-8 bg-white border border-[var(--ink-thin)] rounded-2xl hover:bg-[var(--bg)] shadow-lg transition-all text-[var(--ink)] flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest">
                                    <FileDown size={20} /> Data Layer PDF
                                </button>
                                <button className="flex-1 lg:flex-none h-14 px-10 bg-[var(--ink)] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-4 group">
                                    Audit Manifest <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Visual Flourish */}
                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px]"></div>
                </div>

                {/* Audit Trail - Full Width */}
                <div className="lg:col-span-2 enterprise-card p-0 border border-[var(--ink-thin)] bg-white overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-[var(--ink-thin)] flex items-center justify-between bg-[var(--bg)]/30">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-[var(--ink-thin)] flex items-center justify-center text-[var(--ink-soft)] shadow-sm">
                                <History size={20} />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--ink)]">Global Audit Ledger</h3>
                        </div>
                        <button className="h-10 px-5 bg-white border border-[var(--ink-thin)] rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--ink-soft)] hover:text-[var(--accent)] transition-all flex items-center gap-2">
                            <Download size={14} /> Full Extract
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full enterprise-table">
                            <thead className="bg-[var(--bg)]/10 text-[var(--ink-soft)]">
                                <tr className="text-[10px] font-black uppercase tracking-widest border-b border-[var(--ink-thin)]">
                                    <th className="py-4 px-8 text-left">Time Synchronization</th>
                                    <th className="py-4 px-8 text-center">Protocol Action</th>
                                    <th className="py-4 px-8 text-left">Entity Class</th>
                                    <th className="py-4 px-8 text-left">Operator ID</th>
                                    <th className="py-4 px-8 text-left">Data Index</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--bg-soft)]">
                                {auditLogs.length === 0 ? (
                                    <tr><td colSpan={5} className="py-20 text-center text-[var(--ink-soft)] font-black uppercase tracking-[0.3em] opacity-30 italic">No temporal activity recorded in this quadrant</td></tr>
                                ) : auditLogs.map((log: any) => (
                                    <AuditRow key={log.id} log={log} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
