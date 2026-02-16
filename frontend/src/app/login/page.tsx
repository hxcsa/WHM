"use client";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [agree, setAgree] = useState(true);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agree) {
            setError("Please agree to the security protocols");
            return;
        }
        if (!isFirebaseConfigured) {
            setError("Firebase is not configured. Please add NEXT_PUBLIC_FIREBASE_API_KEY to environment variables and redeploy.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/");
        } catch (err: any) {
            console.error("Login Error:", err);
            setError(err.message || "Authentication failed: Invalid credentials provided");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen min-h-[100dvh] w-full flex flex-col lg:flex-row bg-[var(--bg)] font-body antialiased selection:bg-[var(--accent-thin)] selection:text-[var(--accent)]">
            {/* Left Side: Illustration layer - Hidden on mobile */}
            <div className="hidden lg:flex lg:w-[55%] bg-[#102642] relative items-center justify-center p-12 xl:p-20 overflow-hidden shadow-[20px_0_40px_rgba(0,0,0,0.1)]">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,#54C7E5_0%,transparent_50%),radial-gradient(circle_at_80%_70%,#54C7E5_0%,transparent_50%)]"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(30deg,#ffffff_12%,transparent_12.5%,transparent_87%,#ffffff_87.5%,#ffffff),linear-gradient(150deg,#ffffff_12%,transparent_12.5%,transparent_87%,#ffffff_87.5%,#ffffff)] bg-[length:100px_180px] opacity-10"></div>
                </div>

                <div className="relative z-10 w-full flex flex-col items-center">
                    <div className="w-full max-w-xl xl:max-w-2xl aspect-[4/3] relative rounded-2xl xl:rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md overflow-hidden animate-in fade-in zoom-in duration-1000">
                        <div className="absolute inset-0 login-grid-overlay"></div>

                        <div className="absolute -top-8 xl:-top-12 -left-8 xl:-left-10 h-32 xl:h-44 w-32 xl:w-44 rounded-full bg-cyan-300/25 blur-3xl login-orb-a"></div>
                        <div className="absolute -bottom-8 xl:-bottom-10 right-8 xl:right-10 h-40 xl:h-52 w-40 xl:w-52 rounded-full bg-sky-300/20 blur-3xl login-orb-b"></div>

                        <div className="absolute inset-0 p-6 xl:p-8 flex flex-col justify-between">
                            <div className="grid grid-cols-3 gap-2 xl:gap-3">
                                {Array.from({ length: 9 }).map((_, idx) => (
                                    <div key={idx} className="h-7 xl:h-9 rounded-xl border border-white/10 bg-white/5" />
                                ))}
                            </div>

                            <div className="rounded-xl xl:rounded-2xl border border-white/15 bg-slate-900/30 p-3 xl:p-4">
                                <p className="text-[9px] xl:text-[10px] uppercase tracking-widest text-white/60 font-black mb-2 xl:mb-3">Live Warehouse Flow</p>
                                <div className="flex items-end gap-1.5 xl:gap-2 h-16 xl:h-24">
                                    {[35, 58, 44, 70, 52, 80, 64, 48, 74, 57].map((height, idx) => (
                                        <div
                                            key={idx}
                                            className="flex-1 rounded-t-md bg-gradient-to-t from-cyan-400/70 to-blue-200/70 login-bar"
                                            style={{ height: `${height}%`, animationDelay: `${idx * 0.12}s` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 xl:mt-12 text-center space-y-3 xl:space-y-4 animate-in slide-in-from-bottom-8 duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-thin)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-[9px] xl:text-[10px] font-black uppercase tracking-widest">
                            <ShieldCheck size={10} className="xl:w-3 xl:h-3" />
                            Enterprise Node Security
                        </div>
                        <h2 className="text-2xl xl:text-4xl font-black text-white tracking-tighter">
                            Advanced Logistics Flux
                        </h2>
                        <p className="text-white/60 text-sm xl:text-lg max-w-sm xl:max-w-md mx-auto font-medium leading-relaxed px-4">
                            Synchronize your global supply chain with our high-integrity management platform.
                        </p>
                    </div>
                </div>

                <div className="absolute bottom-8 xl:bottom-12 left-8 xl:left-12 flex items-center gap-3">
                    <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-lg xl:rounded-xl bg-[var(--accent)] flex items-center justify-center text-[#102642] shadow-xl">
                        <ShieldCheck size={18} className="xl:w-6 xl:h-6" />
                    </div>
                    <span className="text-base xl:text-xl font-black text-white tracking-tight uppercase">OpenGate <span className="text-[var(--accent)]">Intelligence</span></span>
                </div>
            </div>

            {/* Right Side: Login session gateway */}
            <div className="w-full lg:w-[45%] flex flex-col justify-center px-5 sm:px-8 lg:px-16 xl:px-24 py-8 lg:py-0 bg-white relative z-10">
                {/* Mobile Header - Only visible on small screens */}
                <div className="lg:hidden mb-8 text-center">
                    <div className="w-14 h-14 mx-auto rounded-xl bg-[#102642] flex items-center justify-center text-[var(--accent)] shadow-xl mb-4">
                        <ShieldCheck size={28} />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-[var(--ink)] uppercase">
                        OpenGate
                    </h1>
                    <p className="text-[var(--accent)] text-sm font-bold">Intelligence Systems</p>
                </div>

                <div className="max-w-md w-full mx-auto">
                    {/* Header protocol */}
                    <div className="mb-8 lg:mb-12 space-y-3 lg:space-y-4">
                        <div className="hidden lg:flex w-10 h-10 xl:w-12 xl:h-12 rounded-xl bg-[var(--bg)] items-center justify-center text-[var(--ink-soft)] border border-[var(--ink-thin)]">
                            <Lock size={18} className="xl:w-5 xl:h-5" />
                        </div>
                        <div className="space-y-1 lg:space-y-2">
                            <h1 className="text-2xl lg:text-4xl font-black tracking-tight text-[var(--ink)] uppercase text-center lg:text-left">
                                Initialize <br className="hidden lg:block" /><span className="text-[var(--accent)]">Session</span>
                            </h1>
                            <p className="text-[var(--ink-soft)] text-sm lg:text-base font-medium text-center lg:text-left">
                                Provide credentials to access the enterprise manifest.
                            </p>
                        </div>
                    </div>

                    {/* Authorization Form */}
                    <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-8">
                        {/* Email entry */}
                        <div className="space-y-1.5 lg:space-y-2 group">
                            <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-wider flex items-center gap-2 group-focus-within:text-[var(--accent)] transition-colors">
                                <Mail size={12} />
                                Agent Identifier (E-mail)
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="enterprise-input h-12 lg:h-14 font-semibold focus:ring-[var(--accent-thin)] focus:border-[var(--accent)] text-base lg:text-base"
                                placeholder="agent@opengate.intel"
                                autoComplete="email"
                            />
                        </div>

                        {/* Password entry */}
                        <div className="space-y-1.5 lg:space-y-2 group">
                            <label className="text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-wider flex items-center gap-2 group-focus-within:text-[var(--accent)] transition-colors">
                                <Lock size={12} />
                                Security Keyphrase
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="enterprise-input h-12 lg:h-14 font-semibold tracking-wider focus:ring-[var(--accent-thin)] focus:border-[var(--accent)] text-base lg:text-base"
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                        </div>

                        {/* Protocol Agreement */}
                        <div className="flex items-center gap-3 group cursor-pointer touch-target" onClick={() => setAgree(!agree)}>
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${agree ? 'bg-[var(--accent)] border-[var(--accent)] shadow-lg shadow-[var(--accent-thin)]' : 'border-[var(--ink-thin)] group-hover:border-[var(--accent-thin)]'}`}>
                                {agree && <ShieldCheck size={12} className="text-white" />}
                            </div>
                            <span className="text-[var(--ink-soft)] text-xs font-bold select-none group-hover:text-[var(--ink)] transition-colors">
                                I confirm compliance with enterprise security protocols and terms.
                            </span>
                        </div>

                        {/* Status Feedback */}
                        {error && (
                            <div className="flex items-start gap-3 text-[var(--danger)] bg-[var(--danger-thin)] p-3 lg:p-4 rounded-xl border border-[var(--danger)]/10 animate-in shake duration-300">
                                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                                    <Lock size={14} className="lg:w-4 lg:h-4" />
                                </div>
                                <p className="text-[10px] lg:text-[11px] font-black uppercase tracking-wider leading-tight pt-1">{error}</p>
                            </div>
                        )}

                        {/* Execution Trigger */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full opengate-button-primary h-12 lg:h-14 rounded-xl lg:rounded-2xl font-black shadow-xl shadow-[var(--accent-thin)] active:scale-95 transition-all flex items-center justify-center gap-2 lg:gap-3 text-base lg:text-lg uppercase tracking-tight group touch-target"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={22} />
                            ) : (
                                <>
                                    Establish Link
                                    <ArrowRight size={18} className="lg:w-5 lg:h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Meta Controls */}
                    <div className="mt-10 lg:mt-16 pt-6 lg:pt-8 border-t border-[var(--bg)] flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="text-[9px] lg:text-[10px] font-black text-[var(--ink-soft)] uppercase tracking-widest text-center sm:text-left">
                            © 2026 OpenGate Intelligence Systems
                        </div>
                        <button
                            type="button"
                            className="text-[9px] lg:text-[10px] font-black text-[var(--accent)] uppercase tracking-widest hover:underline"
                        >
                            Protocol Retrieval
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
