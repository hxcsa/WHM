"use client";

import { FileText, Plus } from "lucide-react";

export default function BillsPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Bills / فواتير الشراء</h1>
                    <p className="text-slate-500 text-sm font-medium">Manage vendor bills and accounts payable.</p>
                </div>
                <button disabled className="bg-slate-300 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-black text-sm uppercase tracking-wider cursor-not-allowed">
                    <Plus size={20} /> New Bill
                </button>
            </div>

            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-2">Bills & Payables</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">This module is under construction. You will be able to record bills from suppliers here.</p>
            </div>
        </div>
    );
}
