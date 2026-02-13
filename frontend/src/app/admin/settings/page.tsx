"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Building, MapPin, Phone, Mail, Globe, FileText, Landmark, X, ChevronRight, Info, AlertTriangle } from "lucide-react";
import WarehousesTab from "@/components/warehouse/WarehousesTab";
import { auth } from "@/lib/firebase";

export default function SettingsPage() {
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [profile, setProfile] = useState({
        company_name: "Warehouse Pro",
        description: "",
        location: "",
        phone: "",
        email: "",
        website: "",
        invoice_note: "",
        payment_details: "",
    });

    useEffect(() => {
        void loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/company/profile", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            setProfile((prev) => ({ ...prev, ...data }));
        } catch {
            // ignore load issues
        }
    };

    const saveProfile = async () => {
        setSaving(true);
        setMessage("");
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/company/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(profile),
            });
            if (!res.ok) {
                const raw = await res.text();
                setMessage(raw || "Failed to save protocol.");
                return;
            }
            setMessage("Registry updated successfully.");
            setTimeout(() => setMessage(""), 3000);
        } catch {
            setMessage("Failed to save protocol.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-2 border-b border-[var(--ink-thin)]">
                <div>
                    <h1 className="text-3xl font-black text-[var(--ink)] tracking-tight">System Configuration</h1>
                    <p className="text-[var(--ink-soft)] mt-1 font-medium italic">Configure global enterprise parameters and node allocation</p>
                </div>
                <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="opengate-button-primary flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-black shadow-lg shadow-[var(--accent-thin)] active:scale-95 transition-all text-sm"
                >
                    {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div> : <Save size={18} />}
                    {saving ? "Updating..." : "Persist Changes"}
                </button>
            </div>

            {message && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                        <Info size={16} />
                    </div>
                    <p className="text-sm font-black text-emerald-700 uppercase tracking-widest">{message}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="enterprise-card p-8 border border-[var(--ink-thin)] shadow-sm space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-[var(--bg)] text-[var(--accent)] rounded-2xl flex items-center justify-center border border-[var(--ink-thin)]">
                                    <Building size={24} />
                                </div>
                                <h3 className="text-xl font-black text-[var(--ink)] uppercase tracking-tight">Enterprise Identity</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Legal Entity Name</label>
                                    <input
                                        className="enterprise-input h-12"
                                        placeholder="Company Name"
                                        value={profile.company_name}
                                        onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Global HQ Location</label>
                                    <input
                                        className="enterprise-input h-12"
                                        placeholder="Location"
                                        value={profile.location}
                                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Primary Contact Protocol</label>
                                    <input
                                        className="enterprise-input h-12"
                                        placeholder="Phone"
                                        value={profile.phone}
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Registry Email Address</label>
                                    <input
                                        className="enterprise-input h-12"
                                        placeholder="Email"
                                        value={profile.email}
                                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Digital Domain (URL)</label>
                                    <input
                                        className="enterprise-input h-12"
                                        placeholder="Website"
                                        value={profile.website}
                                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Enterprise Brief</label>
                                    <textarea
                                        className="enterprise-input py-4 min-h-[100px] resize-none"
                                        placeholder="Company Description"
                                        value={profile.description}
                                        onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-[var(--ink-thin)]">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-[var(--bg)] text-[var(--accent)] rounded-2xl flex items-center justify-center border border-[var(--ink-thin)]">
                                    <FileText size={24} />
                                </div>
                                <h3 className="text-xl font-black text-[var(--ink)] uppercase tracking-tight">Billing & Invoicing</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Standard Invoice Footer Note</label>
                                    <textarea
                                        className="enterprise-input py-4 min-h-[100px] resize-none"
                                        placeholder="Invoice Note"
                                        value={profile.invoice_note}
                                        onChange={(e) => setProfile({ ...profile, invoice_note: e.target.value })}
                                    />
                                    <p className="text-[10px] text-[var(--ink-soft)] font-bold italic mt-1">This text will appear at the base of every generated invoice manifest.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Settlement Instructions (Bank Details)</label>
                                    <textarea
                                        className="enterprise-input py-4 min-h-[120px] font-mono text-xs leading-relaxed"
                                        placeholder="Payment Details (IBAN / Account # / Swift Codes)"
                                        value={profile.payment_details}
                                        onChange={(e) => setProfile({ ...profile, payment_details: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="enterprise-card p-8 border border-[var(--ink-thin)]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-[var(--ink)] uppercase tracking-tight">Operational Node Allocation</h3>
                                <p className="text-[var(--ink-soft)] text-xs font-bold mt-1 uppercase tracking-widest">Manage physical warehouse distribution</p>
                            </div>
                        </div>
                        <WarehousesTab />
                    </div>
                </div>

                {/* Sidebar Preview */}
                <div className="space-y-8">
                    <div className="enterprise-card p-0 border border-[var(--ink-thin)] overflow-hidden sticky top-8">
                        <div className="bg-[var(--ink)] p-8 text-white relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/20 rounded-full blur-[40px] -mr-16 -mt-16"></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">Identity Preview</p>
                            <h4 className="text-2xl font-black tracking-tight leading-tight">{profile.company_name || "Enterprise Pro"}</h4>
                            <p className="text-white/60 text-xs font-bold mt-2 uppercase tracking-widest">{profile.website || "opengate.network"}</p>
                        </div>

                        <div className="p-8 space-y-6 bg-white">
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg)] flex items-center justify-center text-[var(--accent)] shrink-0">
                                        <MapPin size={14} />
                                    </div>
                                    <p className="text-sm font-bold text-[var(--ink-soft)] leading-snug">{profile.location || "Earth (Federated Node)"}</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg)] flex items-center justify-center text-[var(--accent)] shrink-0">
                                        <Phone size={14} />
                                    </div>
                                    <p className="text-sm font-bold text-[var(--ink-soft)]">{profile.phone || "+000 000 0000"}</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg)] flex items-center justify-center text-[var(--accent)] shrink-0">
                                        <Mail size={14} />
                                    </div>
                                    <p className="text-sm font-bold text-[var(--ink-soft)] truncate">{profile.email || "protocol@opengate.io"}</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-[var(--bg-soft)]">
                                <p className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest mb-3">Enterprise Mission</p>
                                <p className="text-sm text-[var(--ink)] font-medium leading-relaxed italic">
                                    {profile.description || "The mission objective for this company profile has not yet been defined in the central registry."}
                                </p>
                            </div>

                            <div className="pt-6 border-t border-[var(--bg-soft)]">
                                <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--ink-thin)]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Landmark size={14} className="text-indigo-600" />
                                        <span className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Settlement Data</span>
                                    </div>
                                    <p className="text-[10px] font-mono text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
                                        {profile.payment_details || "Awaiting settlement protocol..."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-4 bg-[var(--bg)]/50 border-t border-[var(--ink-thin)] flex items-center justify-between">
                            <span className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Protocol Version</span>
                            <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">OG-04</span>
                        </div>
                    </div>

                    <div className="enterprise-card p-6 border border-amber-100 bg-amber-50">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Security Protocol</h4>
                                <p className="text-xs text-amber-800 font-medium mt-1 leading-relaxed">
                                    Updates to these settings will affect all generated invoices and customer manifests. Ensure all metadata is accurate.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
