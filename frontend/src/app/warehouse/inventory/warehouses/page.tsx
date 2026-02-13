"use client";

import WarehousesTab from "@/components/warehouse/WarehousesTab";

export default function WarehousesInventoryPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Warehouse Management / إدارة المخازن</h1>
                    <p className="text-slate-500 text-sm font-medium">Add, edit, and disable warehouses.</p>
                </div>
            </div>

            <div className="mt-6">
                <WarehousesTab />
            </div>
        </div>
    );
}
