"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import ProductSubTabs from "@/components/products/ProductSubTabs";
import { FileUp } from "lucide-react";

type ProductRow = {
    name: string;
    sku: string;
    cost_price: string;
    selling_price: string;
    min_stock_level: string;
    unit: string;
    pricing_type: string;
};

export default function ProductImportPage() {
    const [rows, setRows] = useState<ProductRow[]>([]);
    const [rawPaste, setRawPaste] = useState("");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const parseDelimited = (text: string, delimiter: string) => {
        const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (lines.length < 2) return [] as ProductRow[];

        const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
        const idx = {
            name: headers.indexOf("name"),
            sku: headers.indexOf("sku"),
            cost_price: headers.indexOf("cost_price"),
            selling_price: headers.indexOf("selling_price"),
            min_stock_level: headers.indexOf("min_stock_level"),
            unit: headers.indexOf("unit"),
            pricing_type: headers.indexOf("pricing_type"),
        };

        const data: ProductRow[] = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(delimiter).map((c) => c.trim());
            if (!cols[idx.name] || !cols[idx.sku]) continue;
            data.push({
                name: cols[idx.name] || "",
                sku: cols[idx.sku] || "",
                cost_price: cols[idx.cost_price] || "0",
                selling_price: cols[idx.selling_price] || "0",
                min_stock_level: cols[idx.min_stock_level] || "0",
                unit: cols[idx.unit] || "piece",
                pricing_type: cols[idx.pricing_type] || "fixed",
            });
        }
        return data;
    };

    const parsePaste = () => {
        const fromTab = parseDelimited(rawPaste, "\t");
        const parsed = fromTab.length > 0 ? fromTab : parseDelimited(rawPaste, ",");
        setRows(parsed);
        setMessage(parsed.length ? `Loaded ${parsed.length} rows.` : "No valid rows found.");
    };

    const parseCsvFile = async (file: File) => {
        const text = await file.text();
        const parsed = parseDelimited(text, ",");
        setRows(parsed);
        setMessage(parsed.length ? `Loaded ${parsed.length} rows from file.` : "No valid rows found in file.");
    };

    const submitImport = async () => {
        if (rows.length === 0) {
            setMessage("Load rows first.");
            return;
        }

        setSubmitting(true);
        setMessage("");
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/products/import", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ data: rows }),
            });

            const payload = await res.json();
            if (!res.ok) {
                setMessage(payload?.detail || "Import failed.");
                return;
            }

            setMessage(`Import complete: created ${payload.created}, errors ${payload.errors}.`);
            setRows([]);
            setRawPaste("");
        } catch {
            setMessage("Import failed.");
        } finally {
            setSubmitting(false);
        }
    };

    const downloadTemplate = () => {
        const csv = "name,sku,cost_price,selling_price,min_stock_level,unit,pricing_type\nSample Product,SKU-001,1000,1500,5,piece,fixed";
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "products_import_template.csv";
        a.click();
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#102642]">Products</h1>
                <p className="text-sm text-gray-500">Import new products from Excel/CSV</p>
            </div>

            <ProductSubTabs />

            <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-4">
                <h2 className="text-lg font-semibold text-[#102642] flex items-center gap-2">
                    <FileUp size={18} /> Import Products
                </h2>
                <p className="text-sm text-gray-500">
                    You can paste directly from Excel (copy cells) or upload a CSV exported from Excel.
                </p>

                <div className="flex flex-wrap gap-2">
                    <button onClick={downloadTemplate} className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
                        Download Template
                    </button>
                    <label className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 cursor-pointer">
                        Upload CSV
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void parseCsvFile(file);
                            }}
                        />
                    </label>
                </div>

                <textarea
                    value={rawPaste}
                    onChange={(e) => setRawPaste(e.target.value)}
                    placeholder="Paste from Excel here (with header row)..."
                    className="form-input min-h-40"
                />

                <div className="flex flex-wrap gap-2">
                    <button onClick={parsePaste} className="px-4 py-2 rounded-lg bg-[#102642] text-white text-sm">
                        Parse Data
                    </button>
                    <button
                        onClick={submitImport}
                        disabled={submitting || rows.length === 0}
                        className="px-4 py-2 rounded-lg bg-[#54C7E5] text-white text-sm disabled:opacity-50"
                    >
                        {submitting ? "Importing..." : "Import Products"}
                    </button>
                </div>

                {message && <p className="text-sm text-[#102642]">{message}</p>}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-[#102642]">Preview ({rows.length})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Name</th>
                                <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">SKU</th>
                                <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Cost</th>
                                <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Price</th>
                                <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Min Stock</th>
                                <th className="text-left text-xs uppercase text-gray-500 px-4 py-3">Unit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={`${r.sku}-${i}`} className="border-t border-gray-100">
                                    <td className="px-4 py-2 text-sm">{r.name}</td>
                                    <td className="px-4 py-2 text-sm">{r.sku}</td>
                                    <td className="px-4 py-2 text-sm">{r.cost_price}</td>
                                    <td className="px-4 py-2 text-sm">{r.selling_price}</td>
                                    <td className="px-4 py-2 text-sm">{r.min_stock_level}</td>
                                    <td className="px-4 py-2 text-sm">{r.unit}</td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">No rows loaded.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
