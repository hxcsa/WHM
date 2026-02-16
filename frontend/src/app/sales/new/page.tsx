"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronDown, Plus, Save, Search, Send, Trash2, X } from "lucide-react";

import { auth } from "@/lib/firebase";
import { fetchWithAuth } from "@/lib/api";

type Customer = {
    id: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    phone?: string;
};

type Product = {
    id: string;
    name?: string;
    sku?: string;
    selling_price?: string | number;
    current_wac?: string | number;
    current_qty?: string | number;
    cost_price?: string | number;
};

type LineItem = {
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
    discount: number;
    available_stock?: number;
    cost_price?: number;
};

const EMPTY_LINE: LineItem = {
    product_id: "",
    product_name: "",
    quantity: 1,
    price: 0,
    discount: 0,
};

function toNumber(value: string | number | undefined): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatIQD(value: number): string {
    return `${Math.round(value).toLocaleString()} IQD`;
}

export default function NewInvoicePage() {
    const router = useRouter();

    const [authReady, setAuthReady] = useState(false);
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [role, setRole] = useState("viewer");

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [customerSearch, setCustomerSearch] = useState("");
    const [showCustomerMenu, setShowCustomerMenu] = useState(false);
    const [productSearches, setProductSearches] = useState<string[]>([""]);
    const [openProductMenuRow, setOpenProductMenuRow] = useState<number | null>(null);

    const [form, setForm] = useState({
        customer_id: "",
        customer_name: "",
        notes: "",
        amount_paid: 0,
        due_date: "",
    });
    const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE }]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setAuthUser(user);
            setAuthReady(true);
            if (user) {
                try {
                    const tokenResult = await user.getIdTokenResult();
                    if (tokenResult.claims.role) setRole(String(tokenResult.claims.role));
                } catch {
                    setRole("viewer");
                }
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!authReady || !authUser) return;

        const load = async () => {
            try {
                const [customerRes, productRes] = await Promise.all([
                    fetchWithAuth("/api/customers?page_size=500"),
                    fetchWithAuth("/api/items"),
                ]);

                if (customerRes.ok) {
                    const payload = await customerRes.json();
                    setCustomers(payload.customers || payload || []);
                }
                if (productRes.ok) {
                    const payload = await productRes.json();
                    setProducts(Array.isArray(payload) ? payload : payload.items || []);
                }
            } finally {
                setLoadingData(false);
            }
        };

        load();
    }, [authReady, authUser]);

    const canIssue = role === "admin" || role === "accountant";

    const filteredCustomers = useMemo(() => {
        const term = customerSearch.toLowerCase().trim();
        if (!term) return customers;
        return customers.filter((customer) => {
            const name = `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.toLowerCase();
            return (
                name.includes(term)
                || (customer.company_name ?? "").toLowerCase().includes(term)
                || String(customer.phone ?? "").includes(term)
            );
        });
    }, [customerSearch, customers]);

    const filteredProducts = (row: number): Product[] => {
        const term = (productSearches[row] || "").toLowerCase().trim();
        if (!term) return products;
        return products.filter((product) => (
            (product.name ?? "").toLowerCase().includes(term)
            || (product.sku ?? "").toLowerCase().includes(term)
        ));
    };

    const subtotal = useMemo(
        () => lines.reduce((sum, line) => sum + line.quantity * line.price, 0),
        [lines],
    );
    const discount = useMemo(
        () => lines.reduce((sum, line) => sum + line.discount, 0),
        [lines],
    );
    const total = subtotal - discount;

    const addLine = () => {
        setLines((prev) => [...prev, { ...EMPTY_LINE }]);
        setProductSearches((prev) => [...prev, ""]);
    };

    const removeLine = (index: number) => {
        if (lines.length === 1) return;
        setLines((prev) => prev.filter((_, i) => i !== index));
        setProductSearches((prev) => prev.filter((_, i) => i !== index));
    };

    const updateLine = (index: number, key: keyof LineItem, value: string | number) => {
        setLines((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [key]: value };
            return next;
        });
    };

    const selectProduct = (index: number, product: Product) => {
        const price = toNumber(product.selling_price) || toNumber(product.current_wac);
        const cost_price = toNumber(product.cost_price) || toNumber(product.current_wac);
        const available_stock = toNumber(product.current_qty);

        setLines((prev) => {
            const next = [...prev];
            next[index] = {
                ...next[index],
                product_id: product.id,
                product_name: product.name ?? "",
                price,
                cost_price,
                available_stock,
            };
            return next;
        });
        setProductSearches((prev) => {
            const next = [...prev];
            next[index] = product.name ?? "";
            return next;
        });
        setOpenProductMenuRow(null);
    };

    const handleSave = async (status: "draft" | "issued") => {
        setError(null);
        if (!form.customer_id) return setError("Customer is required.");

        const validLines = lines.filter((line) => line.product_id);
        if (!validLines.length) return setError("At least one product line is required.");
        if (validLines.some((line) => line.quantity <= 0)) return setError("Quantity must be greater than 0.");

        setSaving(true);
        try {
            const payload = {
                customer_id: form.customer_id,
                customer_name: form.customer_name,
                items: validLines.map((line) => ({
                    product_id: line.product_id,
                    product_name: line.product_name,
                    quantity: line.quantity,
                    price: line.price,
                    total: line.quantity * line.price - line.discount,
                })),
                subtotal,
                discount,
                total_amount: total,
                amount_paid: form.amount_paid,
                due_date: form.due_date,
                notes: form.notes,
                status,
            };

            const res = await fetchWithAuth("/api/sales/invoices", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.detail || "Failed to create invoice.");
            }

            router.push("/sales");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unexpected error.";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    if (!authReady || loadingData) {
        return <div className="surface-card p-8 text-sm font-semibold text-slate-500">Loading invoice form...</div>;
    }

    return (
        <div className="mx-auto max-w-3xl py-6">
            <div className="enterprise-modal overflow-hidden">
                <div className="flex items-start justify-between border-b border-[var(--bg-soft)] p-6 sm:p-8">
                    <div>
                        <h1 className="text-2xl font-black text-[var(--ink)]">New Invoice</h1>
                        <p className="mt-1 text-sm font-medium text-[var(--ink-soft)]">Simple invoice creation without extra delivery fields.</p>
                    </div>
                    <button
                        onClick={() => router.push("/sales")}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--ink-soft)] hover:bg-[var(--bg-soft)]"
                    >
                        <X size={22} />
                    </button>
                </div>

                <div className="space-y-5 p-6 sm:p-8">
                    {error ? (
                        <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-thin)] px-3 py-2 text-sm font-semibold text-[var(--danger)]">
                            <span className="inline-flex items-center gap-2"><AlertCircle size={15} />{error}</span>
                        </div>
                    ) : null}

                    <div className="relative">
                        <label className="mb-1 block text-sm font-bold text-[var(--ink)]">Customer *</label>
                        <div className="relative">
                            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
                            <input
                                type="text"
                                value={customerSearch || form.customer_name}
                                onChange={(e) => {
                                    setCustomerSearch(e.target.value);
                                    setShowCustomerMenu(true);
                                    setForm((prev) => ({ ...prev, customer_id: "", customer_name: "" }));
                                }}
                                onFocus={() => setShowCustomerMenu(true)}
                                placeholder="Search customer"
                                className="enterprise-input pl-10"
                            />
                        </div>
                        {showCustomerMenu && filteredCustomers.length > 0 ? (
                            <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-[var(--ink-thin)] bg-white p-1 shadow-xl">
                                {filteredCustomers.slice(0, 8).map((customer) => {
                                    const name = `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || customer.company_name || "Customer";
                                    return (
                                        <button
                                            key={customer.id}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                setForm((prev) => ({ ...prev, customer_id: customer.id, customer_name: name }));
                                                setCustomerSearch("");
                                                setShowCustomerMenu(false);
                                            }}
                                            className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--bg-soft)]"
                                        >
                                            <p className="text-sm font-semibold text-[var(--ink)]">{name}</p>
                                            <p className="text-xs text-[var(--ink-soft)]">{customer.phone || customer.company_name || ""}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-black uppercase tracking-wider text-[var(--ink-soft)]">Items</h2>
                            <button onClick={addLine} className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:brightness-110">
                                <Plus size={14} /> Add item
                            </button>
                        </div>

                        {lines.map((line, index) => {
                            const lineTotal = line.quantity * line.price - line.discount;
                            return (
                                <div key={`line-${index}`} className="grid gap-2 rounded-xl border border-[var(--ink-thin)] bg-[var(--bg)] p-3 md:grid-cols-12">
                                    <div className="relative md:col-span-5">
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Product</label>
                                        <div className="relative">
                                            <input
                                                value={productSearches[index] || ""}
                                                onChange={(e) => {
                                                    setProductSearches((prev) => {
                                                        const next = [...prev];
                                                        next[index] = e.target.value;
                                                        return next;
                                                    });
                                                    setOpenProductMenuRow(index);
                                                }}
                                                onFocus={() => setOpenProductMenuRow(index)}
                                                onBlur={() => {
                                                    window.setTimeout(() => {
                                                        setOpenProductMenuRow((prev) => (prev === index ? null : prev));
                                                    }, 120);
                                                }}
                                                className="enterprise-input pr-10"
                                                placeholder="Search SKU or name"
                                            />
                                            <button
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => setOpenProductMenuRow((prev) => (prev === index ? null : index))}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--ink-soft)] hover:bg-[var(--bg-soft)]"
                                            >
                                                <ChevronDown size={16} />
                                            </button>
                                        </div>
                                        {openProductMenuRow === index ? (
                                            <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-[var(--ink-thin)] bg-white p-1 shadow-xl">
                                                {filteredProducts(index).length > 0 ? (
                                                    filteredProducts(index).slice(0, 8).map((product) => (
                                                        <button
                                                            key={product.id}
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => selectProduct(index, product)}
                                                            className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--bg-soft)]"
                                                        >
                                                            <p className="text-sm font-semibold text-[var(--ink)]">{product.name}</p>
                                                            <p className="text-xs text-[var(--ink-soft)]">{product.sku || "No SKU"}</p>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-3 text-xs font-semibold text-[var(--ink-soft)]">No matching products</div>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Qty</label>
                                        <input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(index, "quantity", Number(e.target.value))} className="enterprise-input" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Price</label>
                                        <input type="number" min={0} value={line.price} onChange={(e) => updateLine(index, "price", Number(e.target.value))} className="enterprise-input" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                                            Discount
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={line.discount}
                                            onChange={(e) => updateLine(index, "discount", Number(e.target.value))}
                                            className="enterprise-input"
                                        />
                                    </div>
                                    <div className="md:col-span-12">
                                        {line.product_id && (
                                            <div className="flex flex-wrap items-center gap-4 pt-1">
                                                {line.available_stock !== undefined && (
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${line.quantity > line.available_stock ? "text-[var(--danger)]" : "text-[var(--ink-soft)]"}`}>
                                                        Stock: {line.available_stock} {line.quantity > line.available_stock && "(Insufficient)"}
                                                    </span>
                                                )}
                                                {line.cost_price !== undefined && line.price < line.cost_price && (
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--danger)]">
                                                        Price below cost ({formatIQD(line.cost_price)})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-end justify-between md:col-span-1 md:flex-col md:justify-end">
                                        <p className="text-xs font-bold text-[var(--ink)]">{formatIQD(lineTotal)}</p>
                                        <button onClick={() => removeLine(index)} disabled={lines.length === 1} className="rounded-md p-1.5 text-[var(--danger)] hover:bg-[var(--danger-thin)] disabled:opacity-40">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-bold text-[var(--ink)]">Amount Paid (IQD)</label>
                            <input
                                type="number"
                                min={0}
                                value={form.amount_paid}
                                onChange={(e) => setForm((prev) => ({ ...prev, amount_paid: Number(e.target.value) }))}
                                className="enterprise-input"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-bold text-[var(--ink)]">Due Date</label>
                            <input
                                type="date"
                                value={form.due_date}
                                onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                                className="enterprise-input"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-bold text-[var(--ink)]">Notes</label>
                        <textarea
                            rows={3}
                            value={form.notes}
                            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                            className="enterprise-input resize-none"
                            placeholder="Optional notes"
                        />
                    </div>

                    <div className="rounded-2xl border-2 border-[var(--ink-thin)] bg-slate-50 p-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm font-medium">
                                <span className="text-[var(--ink-soft)]">Subtotal</span>
                                <span className="text-[var(--ink)]">{formatIQD(subtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm font-medium">
                                <span className="text-[var(--ink-soft)]">Total Discount</span>
                                <span className="text-[var(--danger)]">-{formatIQD(discount)}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-base font-black text-[var(--ink)]">Total Amount</span>
                                    <span className="text-2xl font-black text-[var(--ink)]">{formatIQD(total)}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-sm font-bold text-[var(--ink-soft)]">Remaining Balance</span>
                                <span className="text-lg font-bold text-[var(--danger)]">
                                    {formatIQD(Math.max(0, total - form.amount_paid))}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-soft)]">Payment Status:</span>
                            {form.amount_paid >= total && total > 0 ? (
                                <span className="rounded-full bg-[var(--success-thin)] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[var(--success)]">Full Payment</span>
                            ) : form.amount_paid > 0 ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-600">Partial Payment</span>
                            ) : (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-500">Unpaid</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                        <button
                            onClick={() => router.push("/sales")}
                            className="rounded-xl border-2 border-[var(--ink-thin)] px-4 py-2 text-sm font-bold text-[var(--ink)] hover:bg-[var(--bg-soft)]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handleSave("draft")}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                        >
                            <Save size={14} /> {saving ? "Saving..." : "Save Draft"}
                        </button>
                        {canIssue ? (
                            <button
                                onClick={() => handleSave("issued")}
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-black text-white hover:brightness-110 disabled:opacity-50"
                            >
                                <Send size={14} /> {saving ? "Saving..." : "Issue"}
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
