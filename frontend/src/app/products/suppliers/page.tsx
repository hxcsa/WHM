"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import ProductSubTabs from "@/components/products/ProductSubTabs";
import { Plus, Truck } from "lucide-react";

interface Supplier {
    id: string;
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
}

export default function ProductSuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [form, setForm] = useState({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
    });

    useEffect(() => {
        void loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/suppliers", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = res.ok ? await res.json() : [];
            setSuppliers(Array.isArray(payload) ? payload : []);
        } catch {
            setSuppliers([]);
        } finally {
            setLoading(false);
        }
    };

    const createSupplier = async () => {
        if (!form.name.trim()) {
            setMessage("Supplier name is required.");
            return;
        }

        setSaving(true);
        setMessage("");
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/suppliers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const raw = await res.text();
                setMessage(raw || "Could not create supplier.");
                return;
            }

            setForm({ name: "", contact_person: "", phone: "", email: "", address: "" });
            setMessage("Supplier added.");
            await loadSuppliers();
        } catch {
            setMessage("Could not create supplier.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#102642]">Products</h1>
                <p className="text-sm text-gray-500">Manage suppliers for inbound stock</p>
            </div>

            <ProductSubTabs />

            <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-4">
                <h2 className="text-lg font-semibold text-[#102642] flex items-center gap-2">
                    <Plus size={18} /> Add Supplier
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input className="form-input" placeholder="Supplier name*" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <input className="form-input" placeholder="Contact person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
                    <input className="form-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    <input className="form-input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    <input className="form-input md:col-span-2" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>

                <button
                    onClick={createSupplier}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-[#54C7E5] text-white font-medium disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save Supplier"}
                </button>
                {message && <p className="text-sm text-[#102642]">{message}</p>}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-[#102642]">Suppliers</h2>
                </div>
                {loading ? (
                    <div className="p-6 text-sm text-gray-500">Loading...</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {suppliers.map((s) => (
                            <div key={s.id} className="p-4 flex items-start gap-3">
                                <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                                    <Truck size={16} />
                                </div>
                                <div className="text-sm">
                                    <p className="font-semibold text-[#102642]">{s.name}</p>
                                    <p className="text-gray-500">{s.contact_person || "-"} | {s.phone || "-"}</p>
                                </div>
                            </div>
                        ))}
                        {suppliers.length === 0 && <div className="p-6 text-sm text-gray-500">No suppliers yet.</div>}
                    </div>
                )}
            </div>
        </div>
    );
}
