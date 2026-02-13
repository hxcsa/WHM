"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { Plus, Users, UserPlus, Trash2, Calendar, Shield, User, Mail, Phone, Clock, AlertCircle, CheckCircle, ChevronRight, MoreVertical, X } from "lucide-react";

interface Employee {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    role: string;
    status: string;
}

interface Shift {
    id: string;
    employee_id: string;
    employee_name: string;
    date: string;
    start_time: string;
    end_time: string;
    notes: string;
}

const ROLES = [
    { id: 'admin', name: 'Admin', description: 'Full system access' },
    { id: 'sales', name: 'Sales', description: 'Create invoices, manage customers' },
    { id: 'warehouse', name: 'Warehouse', description: 'Manage stock, transfers' },
    { id: 'viewer', name: 'Viewer', description: 'View-only access' }
];

export default function TeamPage() {
    const [activeTab, setActiveTab] = useState<'employees' | 'shifts'>('employees');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [showShiftModal, setShowShiftModal] = useState(false);

    // Employee form
    const [employeeForm, setEmployeeForm] = useState({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        role: "viewer"
    });

    // Shift form
    const [shiftForm, setShiftForm] = useState({
        employee_id: "",
        date: "",
        start_time: "",
        end_time: "",
        notes: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();

            const [employeesRes, shiftsRes] = await Promise.all([
                fetch("/api/employees", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("/api/shifts", { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (employeesRes.ok) {
                const empData = await employeesRes.json();
                setEmployees(empData.employees || []);
            }
            if (shiftsRes.ok) setShifts(await shiftsRes.json());
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/employees", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...employeeForm,
                    allowed_tabs: ["dashboard"]
                })
            });

            if (res.ok) {
                setShowEmployeeModal(false);
                setEmployeeForm({
                    full_name: "",
                    email: "",
                    phone: "",
                    password: "",
                    role: "viewer"
                });
                fetchData();
            } else {
                alert("Failed to create employee");
            }
        } catch (error) {
            console.error("Error creating employee:", error);
        }
    };

    const handleCreateShift = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = await auth.currentUser?.getIdToken();
            const employee = employees.find(e => e.id === shiftForm.employee_id);

            const res = await fetch("/api/shifts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...shiftForm,
                    employee_name: employee?.full_name || ""
                })
            });

            if (res.ok) {
                setShowShiftModal(false);
                setShiftForm({
                    employee_id: "",
                    date: "",
                    start_time: "",
                    end_time: "",
                    notes: ""
                });
                fetchData();
            }
        } catch (error) {
            console.error("Error creating shift:", error);
        }
    };

    const handleDeleteEmployee = async (id: string) => {
        if (!confirm("Are you sure you want to delete this employee?")) return;

        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/employees/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) fetchData();
        } catch (error) {
            console.error("Error deleting employee:", error);
        }
    };

    const handleDeleteShift = async (id: string) => {
        if (!confirm("Delete this shift?")) return;

        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/shifts/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) fetchData();
        } catch (error) {
            console.error("Error deleting shift:", error);
        }
    };

    const getRoleStyles = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'sales': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'warehouse': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-[var(--ink)]">Personnel & Operations</h1>
                    <p className="text-[var(--ink-soft)] mt-1">Manage enterprise access and operational scheduling</p>
                </div>
                <div className="flex gap-3">
                    {activeTab === 'employees' ? (
                        <button
                            onClick={() => setShowEmployeeModal(true)}
                            className="opengate-button-primary flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg shadow-[var(--accent-thin)] active:scale-95 transition-all w-full sm:w-auto"
                        >
                            <UserPlus size={20} />
                            Provision Agent
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowShiftModal(true)}
                            className="opengate-button-primary flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg shadow-[var(--accent-thin)] active:scale-95 transition-all w-full sm:w-auto"
                        >
                            <Calendar size={20} />
                            Schedule Session
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1.5 bg-[var(--bg)] rounded-2xl w-fit border border-[var(--ink-thin)]">
                <button
                    onClick={() => setActiveTab('employees')}
                    className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'employees'
                        ? 'bg-white text-[var(--ink)] shadow-md'
                        : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                        }`}
                >
                    Registry ({employees.length})
                </button>
                <button
                    onClick={() => setActiveTab('shifts')}
                    className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'shifts'
                        ? 'bg-white text-[var(--ink)] shadow-md'
                        : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                        }`}
                >
                    Protocol ({shifts.length})
                </button>
            </div>

            {/* Content */}
            {activeTab === 'employees' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {employees.map((employee) => (
                        <div key={employee.id} className="enterprise-card group hover:scale-[1.02] transition-all p-0 overflow-hidden border border-[var(--ink-thin)]">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--bg)] to-[var(--bg-soft)] border-2 border-white shadow-inner flex items-center justify-center text-[var(--accent)] font-black text-xl overflow-hidden">
                                            {employee.full_name?.[0] || employee.email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                                                {employee.full_name || employee.email.split('@')[0]}
                                            </h3>
                                            <div className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-widest ${getRoleStyles(employee.role)}`}>
                                                {employee.role}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteEmployee(employee.id)}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--danger)] hover:bg-[var(--danger-thin)] transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm font-semibold text-[var(--ink-soft)]">
                                        <Mail size={16} className="text-[var(--accent)]" />
                                        <span className="truncate">{employee.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm font-semibold text-[var(--ink-soft)]">
                                        <Phone size={16} className="text-[var(--accent)]" />
                                        <span>{employee.phone || "No metadata"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-[var(--bg)]/50 border-t border-[var(--ink-thin)] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${employee.status === 'active' ? 'bg-[var(--success)] shadow-sm shadow-[var(--success)]' : 'bg-gray-400'}`}></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-soft)]">
                                        {employee.status} Agent
                                    </span>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-white border border-[var(--ink-thin)] flex items-center justify-center text-[var(--ink-soft)]">
                                    <Shield size={14} />
                                </div>
                            </div>
                        </div>
                    ))}

                    {employees.length === 0 && (
                        <div className="col-span-full py-20 bg-[var(--bg)]/30 rounded-3xl border-2 border-dashed border-[var(--ink-thin)] text-center">
                            <Users size={48} className="mx-auto text-[var(--ink-thin)] mb-4" />
                            <h3 className="text-xl font-black text-[var(--ink)]">Registry Void</h3>
                            <p className="text-[var(--ink-soft)] mt-1 font-medium">Provision new personnel to activate enterprise modules.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="enterprise-card border border-[var(--ink-thin)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full enterprise-table">
                            <thead>
                                <tr className="bg-[var(--bg)]/50 border-b border-[var(--ink-thin)]">
                                    <th className="text-left py-4 px-6 text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest">Protocol Date</th>
                                    <th className="text-left py-4 px-6 text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest">Active Agent</th>
                                    <th className="text-left py-4 px-6 text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest">Time Window</th>
                                    <th className="text-left py-4 px-6 text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest">Metadata</th>
                                    <th className="text-right py-4 px-6 text-xs font-black text-[var(--ink-soft)] uppercase tracking-widest">Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--bg-soft)]">
                                {shifts.map((shift) => (
                                    <tr key={shift.id} className="group hover:bg-[var(--bg)]/40 transition-colors">
                                        <td className="py-4 px-6 font-bold text-[var(--ink)]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--bg-soft)] flex items-center justify-center text-[var(--accent)]">
                                                    <Calendar size={14} />
                                                </div>
                                                {new Date(shift.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[var(--accent-thin)] flex items-center justify-center text-[var(--accent)] font-black text-[10px]">
                                                    {shift.employee_name?.[0] || "U"}
                                                </div>
                                                <span className="font-bold text-[var(--ink)]">{shift.employee_name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2 text-sm font-black text-[var(--ink-soft)] uppercase">
                                                <Clock size={14} className="text-[var(--accent)]" />
                                                {shift.start_time} - {shift.end_time}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 max-w-xs">
                                            <p className="text-sm font-semibold text-[var(--ink-soft)] truncate">
                                                {shift.notes || "No additional protocol recorded"}
                                            </p>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button
                                                onClick={() => handleDeleteShift(shift.id)}
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--danger)] hover:bg-[var(--danger-thin)] transition-all ml-auto"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {shifts.length === 0 && (
                        <div className="py-32 text-center bg-[var(--bg)]/10">
                            <Calendar size={48} className="mx-auto text-[var(--ink-thin)] mb-4" />
                            <h3 className="text-xl font-black text-[var(--ink)]">No Scheduled Protocols</h3>
                            <p className="text-[var(--ink-soft)] mt-1 font-medium">Coordinate agent sessions to track operational cycles.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Add Employee Modal */}
            {showEmployeeModal && (
                <div className="fixed inset-0 bg-[var(--ink)]/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in zoom-in duration-300">
                    <div className="enterprise-modal max-w-lg w-full shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-[var(--bg-soft)] flex items-center justify-between bg-white text-[var(--ink)]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[var(--accent-thin)] flex items-center justify-center text-[var(--accent)]">
                                    <UserPlus size={24} />
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">Provision Agent</h2>
                            </div>
                            <button onClick={() => setShowEmployeeModal(false)} className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--bg-soft)]">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEmployee} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Legal Name*</label>
                                    <input
                                        type="text"
                                        required
                                        value={employeeForm.full_name}
                                        onChange={(e) => setEmployeeForm({ ...employeeForm, full_name: e.target.value })}
                                        className="enterprise-input h-12"
                                        placeholder="Enter agent's full legal name"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Enterprise Email*</label>
                                        <input
                                            type="email"
                                            required
                                            value={employeeForm.email}
                                            onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                                            className="enterprise-input h-12"
                                            placeholder="agent@enterprise.com"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Access Key*</label>
                                        <input
                                            type="password"
                                            required
                                            value={employeeForm.password}
                                            onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                                            className="enterprise-input h-12"
                                            placeholder="Secure keyphrase"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Contact Metadata</label>
                                        <input
                                            type="tel"
                                            value={employeeForm.phone}
                                            onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                                            className="enterprise-input h-12"
                                            placeholder="+964 000 0000"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Authorization Tier*</label>
                                        <select
                                            value={employeeForm.role}
                                            onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                                            className="enterprise-input h-12 font-bold"
                                        >
                                            {ROLES.map(role => (
                                                <option key={role.id} value={role.id}>
                                                    {role.name} Protocol
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEmployeeModal(false)}
                                    className="flex-1 h-12 rounded-xl border-2 border-[var(--ink-thin)] font-black text-[var(--ink)] hover:bg-[var(--bg)] transition-all"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    className="flex-2 opengate-button-primary h-12 rounded-xl font-black shadow-lg shadow-[var(--accent-thin)] active:scale-95 transition-all text-sm"
                                    style={{ flex: 2 }}
                                >
                                    Activate Agent
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Shift Modal */}
            {showShiftModal && (
                <div className="fixed inset-0 bg-[var(--ink)]/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in zoom-in duration-300">
                    <div className="enterprise-modal max-w-md w-full shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-[var(--bg-soft)] flex items-center justify-between bg-white text-[var(--ink)]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[var(--accent-thin)] flex items-center justify-center text-[var(--accent)]">
                                    <Calendar size={24} />
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">Schedule Protocol</h2>
                            </div>
                            <button onClick={() => setShowShiftModal(false)} className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--bg-soft)]">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateShift} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Designated Agent*</label>
                                    <select
                                        required
                                        value={shiftForm.employee_id}
                                        onChange={(e) => setShiftForm({ ...shiftForm, employee_id: e.target.value })}
                                        className="enterprise-input h-12 font-bold"
                                    >
                                        <option value="">Select registry entry...</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.full_name || emp.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Target Date*</label>
                                    <input
                                        type="date"
                                        required
                                        value={shiftForm.date}
                                        onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                                        className="enterprise-input h-12"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Entry Time*</label>
                                        <input
                                            type="time"
                                            required
                                            value={shiftForm.start_time}
                                            onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                                            className="enterprise-input h-12"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Exit Time*</label>
                                        <input
                                            type="time"
                                            required
                                            value={shiftForm.end_time}
                                            onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                                            className="enterprise-input h-12"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest">Shift Protocol Metadata</label>
                                    <textarea
                                        rows={2}
                                        value={shiftForm.notes}
                                        onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                                        className="enterprise-input py-3 resize-none text-sm"
                                        placeholder="Specific operational instructions..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowShiftModal(false)}
                                    className="flex-1 h-12 rounded-xl border-2 border-[var(--ink-thin)] font-black text-[var(--ink)] hover:bg-[var(--bg)] transition-all"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    className="flex-2 opengate-button-primary h-12 rounded-xl font-black shadow-lg shadow-[var(--accent-thin)] active:scale-95 transition-all text-sm"
                                    style={{ flex: 2 }}
                                >
                                    Register Shift
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
