"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Users, Megaphone, Plus, MapPin, X, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { fetchWithAuth } from "@/lib/api";

const SHIFTS = ["08:00-16:00", "16:00-00:00", "00:00-08:00", "08:00-18:00"];

export default function SchedulePage() {
    const [shifts, setShifts] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState("viewer");
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [showAnnounceModal, setShowAnnounceModal] = useState(false);
    const [form, setForm] = useState({ employee: "", role: "", shift: "", area: "" });
    const [annForm, setAnnForm] = useState({ title: "", content: "" });

    useEffect(() => {
        const load = async () => {
            try {
                if (!auth.currentUser) return; // Keep this check or let fetchWithAuth handle it

                const idResult = await auth.currentUser?.getIdTokenResult();
                const userRole = (idResult?.claims.role as string) || "viewer";
                setRole(userRole);

                const [shiftsRes, annRes] = await Promise.all([
                    fetchWithAuth("/api/scheduling/shifts"),
                    fetchWithAuth("/api/scheduling/announcements")
                ]);

                if (shiftsRes.ok) setShifts(await shiftsRes.json());
                if (annRes.ok) setAnnouncements(await annRes.json());

                if (userRole === "admin") {
                    const [usersRes, whRes] = await Promise.all([
                        fetchWithAuth("/api/users"),
                        fetchWithAuth("/api/warehouses")
                    ]);
                    if (usersRes.ok) setUsers(await usersRes.json());
                    if (whRes.ok) setWarehouses(await whRes.json());
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const addShift = async () => {
        const res = await fetchWithAuth("/api/scheduling/shifts", {
            method: "POST",
            body: JSON.stringify(form)
        });
        if (res.ok) {
            const data = await res.json();
            setShifts([...shifts, data]);
            setShowShiftModal(false);
            setForm({ employee: "", role: "", shift: "", area: "" });
        }
    };

    const addAnnouncement = async () => {
        const res = await fetchWithAuth("/api/scheduling/announcements", {
            method: "POST",
            body: JSON.stringify(annForm)
        });
        if (res.ok) {
            const data = await res.json();
            setAnnouncements([data, ...announcements]);
            setShowAnnounceModal(false);
            setAnnForm({ title: "", content: "" });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Schedule Hub / مركز الجدول</h1>
                    <p className="text-slate-500 text-sm font-medium">Employee shifts and store announcements</p>
                </div>
                {role === "admin" && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowShiftModal(true)}
                            className="bg-primary text-white px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-black text-sm"
                        >
                            <Plus size={18} /> Assign Shift
                        </button>
                        <button
                            onClick={() => setShowAnnounceModal(true)}
                            className="bg-slate-800 text-white px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-slate-700 transition-all shadow-lg font-black text-sm"
                        >
                            <Megaphone size={18} /> Broadcast
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Active Shifts" value={shifts.length} icon={<Users size={18} />} color="bg-blue-600" />
                <StatCard label="Announcements" value={announcements.length} icon={<Megaphone size={18} />} color="bg-amber-500" />
                <StatCard label="Locations" value={warehouses.length + 1} icon={<MapPin size={18} />} color="bg-indigo-500" />
                <StatCard label="Today" value={new Date().toLocaleDateString('en', { weekday: 'short', day: 'numeric' })} icon={<Calendar size={18} />} color="bg-slate-800" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Shifts Table */}
                <div className="lg:col-span-2 enterprise-card border-none shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <Users size={18} className="text-slate-400" />
                        <h2 className="font-black text-slate-800 uppercase text-sm tracking-wide">Deployment Roster / قائمة التوظيف</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <tr>
                                    <th className="px-4 py-3">Employee / الموظف</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Location</th>
                                    <th className="px-4 py-3 text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {shifts.length === 0 ? (
                                    <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400 font-bold">No shifts assigned yet</td></tr>
                                ) : shifts.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600 text-xs">
                                                    {s.employee?.[0]}
                                                </div>
                                                <span className="font-bold text-slate-800">{s.employee}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase">{s.role}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{s.area}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="font-mono text-sm font-bold text-slate-800">{s.shift}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Announcements */}
                <div className="enterprise-card border-none shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <Megaphone size={18} className="text-slate-400" />
                        <h2 className="font-black text-slate-800 uppercase text-sm tracking-wide">Broadcast / البث</h2>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {announcements.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 font-bold text-sm">No announcements</div>
                        ) : announcements.map((a) => (
                            <div key={a.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                                <h3 className="font-black text-slate-800 text-sm">{a.title}</h3>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Shift Modal */}
            {showShiftModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in duration-200">
                        <div className="p-6 bg-slate-800 text-white flex justify-between items-center rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-lg"><Users size={20} /></div>
                                <h3 className="text-lg font-bold">Assign Shift</h3>
                            </div>
                            <button onClick={() => setShowShiftModal(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Employee</label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    value={form.employee}
                                    onChange={e => {
                                        const u = users.find((u: any) => u.email === e.target.value);
                                        setForm({ ...form, employee: e.target.value, role: u?.role || "" });
                                    }}
                                >
                                    <option value="">Select employee...</option>
                                    {users.map(u => <option key={u.id} value={u.email}>{u.email} ({u.role})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</label>
                                    <select
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        value={form.area}
                                        onChange={e => setForm({ ...form, area: e.target.value })}
                                    >
                                        <option value="">Select...</option>
                                        <option value="Main Office">Main Office</option>
                                        {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</label>
                                    <select
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        value={form.shift}
                                        onChange={e => setForm({ ...form, shift: e.target.value })}
                                    >
                                        <option value="">Select...</option>
                                        {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 flex gap-3 rounded-b-2xl">
                            <button onClick={() => setShowShiftModal(false)} className="flex-1 px-4 py-3 text-slate-600 font-bold text-sm">Cancel</button>
                            <button
                                onClick={addShift}
                                disabled={!form.employee || !form.area || !form.shift}
                                className="flex-1 bg-primary text-white px-4 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Announce Modal */}
            {showAnnounceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in duration-200">
                        <div className="p-6 bg-slate-800 text-white flex justify-between items-center rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-lg"><Megaphone size={20} /></div>
                                <h3 className="text-lg font-bold">New Broadcast</h3>
                            </div>
                            <button onClick={() => setShowAnnounceModal(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Title</label>
                                <input
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    value={annForm.title}
                                    onChange={e => setAnnForm({ ...annForm, title: e.target.value })}
                                    placeholder="Announcement title..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Message</label>
                                <textarea
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    value={annForm.content}
                                    onChange={e => setAnnForm({ ...annForm, content: e.target.value })}
                                    placeholder="Type your message..."
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 flex gap-3 rounded-b-2xl">
                            <button onClick={() => setShowAnnounceModal(false)} className="flex-1 px-4 py-3 text-slate-600 font-bold text-sm">Cancel</button>
                            <button
                                onClick={addAnnouncement}
                                disabled={!annForm.title}
                                className="flex-1 bg-slate-800 text-white px-4 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                            >
                                Broadcast
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon, color }: any) {
    return (
        <div className={`${color} text-white p-4 rounded-xl flex items-center justify-between`}>
            <div>
                <div className="text-xl font-black">{value}</div>
                <div className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{label}</div>
            </div>
            <div className="p-2 bg-white/10 rounded-lg">{icon}</div>
        </div>
    );
}
