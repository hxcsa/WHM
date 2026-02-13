"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Locale, Direction, translations } from "@/utils/translations";

interface LanguageContextType {
    locale: Locale;
    direction: Direction;
    t: (key: keyof typeof translations) => string;
    toggleLanguage: () => void;
    setLanguage: (lang: Locale) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [locale, setLocale] = useState<Locale>("en");
    const [direction, setDirection] = useState<Direction>("ltr");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load from localStorage if available
        const savedLocale = localStorage.getItem("app_locale") as Locale;
        if (savedLocale) {
            setLocale(savedLocale);
            setDirection(savedLocale === "ar" ? "rtl" : "ltr");
            document.documentElement.dir = savedLocale === "ar" ? "rtl" : "ltr";
            document.documentElement.lang = savedLocale;
        } else {
            document.documentElement.dir = "ltr";
            document.documentElement.lang = "en";
        }
        setMounted(true);
    }, []);

    const toggleLanguage = () => {
        const newLocale = locale === "ar" ? "en" : "ar";
        setLanguage(newLocale);
    };

    const setLanguage = (lang: Locale) => {
        setLocale(lang);
        setDirection(lang === "ar" ? "rtl" : "ltr");
        localStorage.setItem("app_locale", lang);

        // Update HTML dir attribute dynamically
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
        document.documentElement.lang = lang;
    };

    const t = (key: keyof typeof translations) => {
        return translations[key]?.[locale] || key;
    };

    return (
        <LanguageContext.Provider value={{ locale, direction, t, toggleLanguage, setLanguage }}>
            {!mounted ? (
                <div dir="ltr" className="min-h-screen bg-[#0f172a]">
                    {children}
                </div>
            ) : (
                <div dir={direction} className={locale === "ar" ? "font-cairo" : "font-sans"}>
                    {children}
                </div>
            )}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
