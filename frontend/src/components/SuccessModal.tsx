"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

interface SuccessModalProps {
    title: string;
    message: string;
    onClose: () => void;
    autoCloseMs?: number;
}

export default function SuccessModal({ title, message, onClose, autoCloseMs = 3000 }: SuccessModalProps) {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const step = 50;
        const totalSteps = autoCloseMs / step;
        const decrement = 100 / totalSteps;

        const interval = setInterval(() => {
            setProgress((prev) => {
                const newVal = prev - decrement;
                return newVal > 0 ? newVal : 0;
            });
        }, step);

        const timeout = setTimeout(() => {
            onClose();
        }, autoCloseMs);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [autoCloseMs, onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
                {/* Success Animation */}
                <div className="p-12 flex flex-col items-center text-center bg-gradient-to-b from-emerald-50 to-white">
                    <div className="relative">
                        {/* Outer ring animation */}
                        <div className="w-24 h-24 rounded-full border-4 border-emerald-100 flex items-center justify-center animate-pulse">
                            <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-in zoom-in duration-500">
                                <CheckCircle2 className="text-white animate-in zoom-in duration-500 delay-200" size={48} strokeWidth={2.5} />
                            </div>
                        </div>
                        {/* Ripple effect */}
                        <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-emerald-400 animate-ping opacity-20" />
                    </div>

                    <h3 className="mt-8 text-2xl font-black text-slate-800">{title}</h3>
                    <p className="mt-2 text-sm text-slate-500 font-medium">{message}</p>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-slate-100">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-50 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                    >
                        Continue / متابعة
                    </button>
                </div>
            </div>
        </div>
    );
}
