"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { ArrowLeft, Save, Loader2, Wallet, Receipt } from "lucide-react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function RecordExpensePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
    const [assetAccounts, setAssetAccounts] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        expense_account_id: "",
        payment_account_id: "",
        amount: "",
        description: "",
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const init = async () => {
            try {
                const [expRes, assetRes] = await Promise.all([
                    fetchWithAuth("/api/accounting/accounts?type=EXPENSE"),
                    fetchWithAuth("/api/accounting/accounts?type=ASSET")
                ]);

                if (expRes.ok) {
                    const data = await expRes.json();
                    let list = data.accounts || (Array.isArray(data) ? data : []);
                    // Filter out COGS if needed, or keep them.
                    // Usually users want "Rent", "Salaries", "Utilities".
                    // COGS (51) are usually automated, but maybe manual adjustment needed.
                    // Let's keep all expenses.
                    setExpenseAccounts(list);
                }

                if (assetRes.ok) {
                    const data = await assetRes.json();
                    let list = data.accounts || (Array.isArray(data) ? data : []);
                    // Filter for Cash/Bank (usually 18xx or similar, or just name check/type check)
                    // In Iraqi COA: 123 is Cash & Bank
                    const cashAccounts = list.filter((a: any) => a.code.startsWith("123") || a.code.startsWith("101") || a.name_en.toLowerCase().includes("cash") || a.name_en.toLowerCase().includes("bank"));
                    setAssetAccounts(cashAccounts.length > 0 ? cashAccounts : list);
                }

            } catch (e) {
                console.error("Init Error", e);
            } finally {
                setInitializing(false);
            }
        };

        const unsub = onAuthStateChanged(auth, (u) => {
            if (u) init();
        });
        return () => unsub();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                date: formData.date,
                description: formData.description || "Expense Record",
                lines: [
                    {
                        account_id: formData.expense_account_id,
                        debit: Number(formData.amount),
                        credit: 0,
                        description: formData.description
                    },
                    {
                        account_id: formData.payment_account_id,
                        debit: 0,
                        credit: Number(formData.amount),
                        description: "Payment for Expense"
                    }
                ]
            };

            const res = await fetchWithAuth("/api/accounting/journal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                router.push("/lite/accounting"); // Go back to dashboard
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail || "Failed to record expense"}`);
            }
        } catch (err) {
            console.error(err);
            alert("Connection Error");
        } finally {
            setLoading(false);
        }
    };

    if (initializing) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <Link href="/lite/accounting" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Record Expense</h1>
                    <p className="text-slate-500 text-sm">Log a payment for business expenses.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">

                <div>
                    <label className="block text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                        <Receipt size={16} className="text-rose-500" />
                        Expense Type
                    </label>
                    <select
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
                        value={formData.expense_account_id}
                        onChange={e => setFormData({ ...formData, expense_account_id: e.target.value })}
                    >
                        <option value="">Select Expense Account...</option>
                        {expenseAccounts.map(a => (
                            <option key={a.id} value={a.id}>{a.name_en} ({a.code})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                        <Wallet size={16} className="text-emerald-500" />
                        Paid From
                    </label>
                    <select
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                        value={formData.payment_account_id}
                        onChange={e => setFormData({ ...formData, payment_account_id: e.target.value })}
                    >
                        <option value="">Select Payment Account...</option>
                        {assetAccounts.map(a => (
                            <option key={a.id} value={a.id}>{a.name_en} ({a.code})</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Amount</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            placeholder="0.00"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-lg"
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                        <input
                            type="date"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                    <textarea
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        placeholder="e.g. Office Rent for March"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white rounded-xl py-4 font-bold text-lg shadow-xl shadow-slate-500/30 hover:bg-slate-800 hover:shadow-slate-600/40 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            Save Expense
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
