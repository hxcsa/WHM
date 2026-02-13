"use client";

import { useEffect, useState, useCallback, memo } from "react";
import { Plus, Building2, DollarSign, TrendingDown, Calendar, AlertCircle, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchWithAuth } from "@/lib/api";

const SummaryCard = memo(({ label, value, icon, color }: any) => (
    <div className={`${color} text-white p-6 rounded-2xl flex items-center justify-between shadow-lg`}>
        <div>
            <p className="text-[10px] font-black opacity-70 uppercase tracking-widest">{label}</p>
            <h4 className="text-xl font-black tabular-nums">{value}</h4>
        </div>
        <div className="p-3 bg-white/10 rounded-xl">{icon}</div>
    </div>
));
SummaryCard.displayName = "SummaryCard";

const AssetRow = memo(({ asset, onDepreciate }: any) => (
    <tr className="hover:bg-slate-50/50 transition-colors">
        <td className="px-6 py-4 font-mono text-xs font-black text-slate-800">{asset.code}</td>
        <td className="px-6 py-4 font-bold text-slate-700">{asset.name}</td>
        <td className="px-6 py-4 text-slate-500 text-sm">{asset.category}</td>
        <td className="px-6 py-4 font-mono text-sm font-black text-right">{Number(asset.purchase_value).toLocaleString()}</td>
        <td className="px-6 py-4 font-mono text-sm font-black text-right text-amber-600">{Number(asset.accumulated_depreciation).toLocaleString()}</td>
        <td className="px-6 py-4 font-mono text-sm font-black text-right text-emerald-600">{Number(asset.current_value).toLocaleString()}</td>
        <td className="px-6 py-4 text-right">
            <button
                onClick={() => onDepreciate(asset.id)}
                className="text-[10px] font-black bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors"
            >
                <TrendingDown size={12} className="inline mr-1" /> Depreciate
            </button>
        </td>
    </tr>
));
AssetRow.displayName = "AssetRow";

const AssetForm = memo(({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        category: "Equipment",
        purchase_value: "",
        salvage_value: "0",
        useful_life_months: "60",
        location: "",
        notes: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/assets", {
                method: "POST",
                body: JSON.stringify({
                    ...formData,
                    purchase_value: Number(formData.purchase_value),
                    salvage_value: Number(formData.salvage_value),
                    useful_life_months: Number(formData.useful_life_months),
                    purchase_date: new Date().toISOString()
                })
            });
            if (res.ok) {
                onSuccess();
                onClose();
            }
        } catch (err) {
            alert("Error creating asset");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Building2 size={24} />
                        <h3 className="text-lg font-bold">Register Fixed Asset</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><AlertCircle size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase">Asset Name</label>
                        <input required className="form-input" placeholder="e.g., Toyota Hilux 2024" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase">Category</label>
                            <select className="form-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                <option value="Equipment">Equipment</option>
                                <option value="Vehicle">Vehicle</option>
                                <option value="Building">Building</option>
                                <option value="Furniture">Furniture</option>
                                <option value="Computer">Computer</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase">Location</label>
                            <input className="form-input" placeholder="e.g., Main Office" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase">Purchase Value</label>
                            <input required type="number" className="form-input" placeholder="50000000" value={formData.purchase_value} onChange={e => setFormData({ ...formData, purchase_value: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase">Salvage Value</label>
                            <input type="number" className="form-input" value={formData.salvage_value} onChange={e => setFormData({ ...formData, salvage_value: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase">Useful Life (Months)</label>
                            <input type="number" className="form-input" value={formData.useful_life_months} onChange={e => setFormData({ ...formData, useful_life_months: e.target.value })} />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black">
                        {loading ? "Saving..." : "Register Asset"}
                    </button>
                </form>
            </div>
        </div>
    );
});
AssetForm.displayName = "AssetForm";

export default function AssetsPage() {
    const [assets, setAssets] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const { t } = useLanguage();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [assetsRes, summaryRes] = await Promise.all([
                fetchWithAuth("/api/assets"),
                fetchWithAuth("/api/assets/summary")
            ]);
            const [assetsData, summaryData] = await Promise.all([assetsRes.json(), summaryRes.json()]);
            if (Array.isArray(assetsData)) setAssets(assetsData);
            setSummary(summaryData);
        } catch (e) {
            console.error("Assets fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const runDepreciation = useCallback(async (assetId: string) => {
        const period = new Date().toISOString().slice(0, 7); // e.g., "2026-02"
        await fetchWithAuth(`/api/assets/${assetId}/depreciate?period=${period}`, { method: "POST" });
        fetchData();
    }, [fetchData]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Fixed Assets / الأصول الثابتة</h1>
                    <p className="text-slate-500 text-sm font-medium">Depreciation & Asset Management</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 font-black text-sm"
                >
                    <Plus size={20} /> Register Asset / تسجيل أصل
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard
                    label="Total Purchase Value"
                    value={`${Number(summary?.total_purchase_value || 0).toLocaleString()} IQD`}
                    icon={<DollarSign />}
                    color="bg-blue-600"
                />
                <SummaryCard
                    label="Accumulated Depreciation"
                    value={`${Number(summary?.total_accumulated_depreciation || 0).toLocaleString()} IQD`}
                    icon={<TrendingDown />}
                    color="bg-amber-600"
                />
                <SummaryCard
                    label="Current Book Value"
                    value={`${Number(summary?.total_current_value || 0).toLocaleString()} IQD`}
                    icon={<Building2 />}
                    color="bg-emerald-600"
                />
                <SummaryCard
                    label="Active Assets"
                    value={summary?.asset_count?.toString() || "0"}
                    icon={<Check />}
                    color="bg-slate-800"
                />
            </div>

            {/* Asset List */}
            <div className="enterprise-card border-none shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Asset Register / سجل الأصول</h3>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400 font-bold">Loading...</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Code</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4 text-right">Purchase Value</th>
                                <th className="px-6 py-4 text-right">Acc. Depreciation</th>
                                <th className="px-6 py-4 text-right">Book Value</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {assets.map(asset => (
                                <AssetRow key={asset.id} asset={asset} onDepreciate={runDepreciation} />
                            ))}
                            {assets.length === 0 && (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">No fixed assets registered</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {showForm && <AssetForm onClose={() => setShowForm(false)} onSuccess={fetchData} />}
        </div>
    );
}

