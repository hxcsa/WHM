"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import { Users, UserPlus, Shield, X, CheckSquare, Square, Save, Loader2 } from "lucide-react";

interface Employee {
    id: string;
    email: string;
    role: string;
    allowed_tabs?: string[];
}

const AVAILABLE_TABS = [
    { id: "dashboard", label: "Dashboard / الرئيسية" },
    { id: "schedule", label: "Schedule / الجدول" },
    { id: "inventory", label: "Inventory / المخزون" },
    { id: "sales", label: "Sales / المبيعات" },
    { id: "purchasing", label: "Purchasing / المشتريات" },
    { id: "assets", label: "Assets / الأصول" },
    { id: "reports", label: "Reports / التقارير" },
    { id: "activity", label: "Activity / النشاط" },
];

export default function UsersPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("accountant");
    const [selectedTabs, setSelectedTabs] = useState<string[]>(["dashboard"]);
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Permission Management Modal State
    const [editingUser, setEditingUser] = useState<Employee | null>(null);

    const fetchEmployees = async () => {
        const res = await fetchWithAuth("/api/employees");
        if (res.ok) {
            const data = await res.json();
            setEmployees(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const toggleTab = (tabId: string) => {
        setSelectedTabs(prev =>
            prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId]
        );
    };

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setIsSubmitting(true);

        try {
            const res = await fetchWithAuth("/api/employees", {
                method: "POST",
                body: JSON.stringify({
                    email,
                    password,
                    role,
                    allowed_tabs: selectedTabs
                })
            });

            if (res.ok) {
                setMessage("Employee added successfully!");
                setEmail("");
                setPassword("");
                setSelectedTabs(["dashboard"]);
                fetchEmployees();
            } else {
                const err = await res.json();
                setMessage(`Error: ${err.detail || "Failed to create account"}`);
            }
        } catch {
            setMessage("Error: Network or server error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateRole = async (uid: string, newRole: string) => {
        await fetchWithAuth(`/api/employees/${uid}`, {
            method: "PUT",
            body: JSON.stringify({ role: newRole }),
        });
        fetchEmployees();
    };

    const handleUpdatePermissions = async (uid: string, tabs: string[]) => {
        const res = await fetchWithAuth(`/api/employees/${uid}`, {
            method: "PUT",
            body: JSON.stringify({ allowed_tabs: tabs })
        });

        if (res.ok) {
            setEditingUser(null);
            fetchEmployees();
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (!confirm("Are you sure you want to delete this account? / هل أنت متأكد من حذف الحساب؟")) return;
        await fetchWithAuth(`/api/employees/${uid}`, {
            method: "DELETE"
        });
        fetchEmployees();
    };

    return (
        <div className="space-y-8" dir="rtl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Manage Employees / إدارة الموظفين</h1>
                    <p className="text-slate-500 font-medium">Add and manage user permissions</p>
                </div>
                <div className="bg-blue-600/10 p-3 rounded-2xl">
                    <Users className="text-blue-600" size={32} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Employee Form */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                        <UserPlus className="text-blue-600" size={20} />
                        <h2 className="font-bold text-slate-800">Add New Employee</h2>
                    </div>

                    <form onSubmit={handleAddEmployee} className="space-y-4 text-right">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black text-slate-400 px-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="employee@company.com"
                                dir="ltr"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black text-slate-400 px-1">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                placeholder="Min 6 characters"
                                dir="ltr"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black text-slate-400 px-1">Role / الصلاحية</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                            >
                                <option value="accountant">Accountant / محاسب</option>
                                <option value="storekeeper">Storekeeper / أمين مخزن</option>
                                <option value="viewer">Viewer / مشاهد</option>
                                <option value="admin">Admin / مدير</option>
                            </select>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <p className="text-[10px] uppercase font-black text-slate-400 mb-4 tracking-widest">Granular Permissions / صلاحيات دقيقة</p>
                            <div className="grid grid-cols-1 gap-2">
                                {AVAILABLE_TABS.map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => toggleTab(tab.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-bold ${selectedTabs.includes(tab.id)
                                            ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20"
                                            : "bg-slate-50 border-slate-100 text-slate-500 hover:border-blue-200"
                                            }`}
                                    >
                                        {selectedTabs.includes(tab.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                        <span className="flex-1 text-right">{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl text-xs font-bold text-center ${message.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 mt-6 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
                            Create Employee Account
                        </button>
                    </form>
                </div>

                {/* Employee List */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden h-fit">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-[10px] uppercase font-black text-slate-400">Employee</th>
                                <th className="p-4 text-[10px] uppercase font-black text-slate-400">Role</th>
                                <th className="p-4 text-[10px] uppercase font-black text-slate-400">Permissions</th>
                                <th className="p-4 text-[10px] uppercase font-black text-slate-400 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">No employees found</td></tr>
                            ) : employees.map((emp) => (
                                <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                                                {emp.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{emp.email}</p>
                                                <p className="text-[10px] text-slate-400 font-medium font-mono uppercase tracking-tighter">UID: {emp.id.slice(0, 8)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <select
                                            value={emp.role}
                                            onChange={(e) => handleUpdateRole(emp.id, e.target.value)}
                                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20 ${emp.role === 'admin' ? 'bg-purple-50 text-purple-700' :
                                                emp.role === 'accountant' ? 'bg-blue-50 text-blue-700' :
                                                    'bg-slate-50 text-slate-700'
                                                }`}
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="accountant">Accountant</option>
                                            <option value="storekeeper">Storekeeper</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1 max-w-[200px] justify-end">
                                            {emp.role === 'admin' ? (
                                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-800 text-white rounded uppercase">Full Access</span>
                                            ) : (emp.allowed_tabs && emp.allowed_tabs.length > 0) ? emp.allowed_tabs.map((tab: string) => (
                                                <span key={tab} className="text-[8px] font-black px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded uppercase">
                                                    {tab}
                                                </span>
                                            )) : <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded uppercase">Legacy</span>}
                                            {emp.role !== 'admin' && (
                                                <button
                                                    onClick={() => setEditingUser(emp)}
                                                    className="p-1 hover:bg-slate-100 rounded text-blue-600 transition-colors"
                                                    title="Edit Permissions"
                                                >
                                                    <Shield size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => handleDeleteUser(emp.id)}
                                            className="text-slate-300 hover:text-red-500 transition-colors p-2"
                                        >
                                            <X size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Permission Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 transform animate-in zoom-in duration-200">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                    <Shield size={24} />
                                </div>
                                <div className="text-right">
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Lock/Unlock Tabs</h3>
                                    <p className="text-xs text-slate-400 font-medium">{editingUser.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto px-1">
                            {AVAILABLE_TABS.map(tab => {
                                const isAllowed = (editingUser.allowed_tabs || []).includes(tab.id);
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            const current = editingUser.allowed_tabs || [];
                                            const next = current.includes(tab.id)
                                                ? current.filter((t: string) => t !== tab.id)
                                                : [...current, tab.id];
                                            setEditingUser({ ...editingUser, allowed_tabs: next });
                                        }}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all font-bold ${isAllowed
                                            ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/10"
                                            : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-white"
                                            }`}
                                    >
                                        {isAllowed ? <CheckSquare size={18} /> : <Square size={18} />}
                                        <span className="flex-1 text-right">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => handleUpdatePermissions(editingUser.id, editingUser.allowed_tabs || [])}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 mt-8 flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            Save Permissions / حفظ الصلاحيات
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
