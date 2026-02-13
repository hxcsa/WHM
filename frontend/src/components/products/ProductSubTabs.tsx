"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
    { label: "Catalog", href: "/products" },
    { label: "Inbound", href: "/products/inbound" },
    { label: "Stock In/Out", href: "/products/stock" },
    { label: "Adjustments", href: "/products/adjustments" },
    { label: "Suppliers", href: "/products/suppliers" },
    { label: "Import", href: "/products/import" },
];

export default function ProductSubTabs() {
    const pathname = usePathname();

    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
            {TABS.map((tab) => {
                const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`px-4 py-2 text-sm rounded-md transition-colors ${
                            active ? "bg-[#102642] text-white" : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </div>
    );
}
