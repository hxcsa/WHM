"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { fetchJsonWithAuth } from "@/lib/api";
import {
    Bell,
    Box,
    LayoutDashboard,
    LogOut,
    Menu,
    Package,
    Search,
    Settings,
    ShoppingCart,
    UserCog,
    Users,
    X,
    Home,
    Plus,
    Receipt,
} from "lucide-react";

type NavItem = {
    label: string;
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    permission?: string;
    children?: Array<{ label: string; href: string }>;
};

const NAV_ITEMS: NavItem[] = [
    { label: "Home", href: "/", icon: LayoutDashboard, permission: "dashboard" },
    {
        label: "Products",
        href: "/products",
        icon: Package,
        permission: "inventory",
        children: [
            { label: "Catalog", href: "/products" },
            { label: "Inbound", href: "/products/inbound" },
            { label: "Stock In / Out", href: "/products/stock" },
            { label: "Adjustments", href: "/products/adjustments" },
            { label: "Suppliers", href: "/products/suppliers" },
            { label: "Import", href: "/products/import" },
        ],
    },
    { label: "Customers", href: "/customers", icon: Users, permission: "sales" },
    { label: "Sales", href: "/sales", icon: ShoppingCart, permission: "sales" },
    { label: "Team", href: "/team", icon: UserCog, permission: "activity" },
    { label: "Settings", href: "/admin/settings", icon: Settings, permission: "activity" },
];

type UserProfile = {
    role?: string;
    allowed_tabs?: string[];
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState("viewer");
    const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
    const [authLoading, setAuthLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!authLoading && !user && pathname !== "/login") {
            router.push("/login");
        }
    }, [authLoading, pathname, router, user]);

    useEffect(() => {
        let cancelled = false;

        async function loadProfile() {
            if (!user) {
                setUserRole("viewer");
                setAllowedTabs([]);
                return;
            }

            try {
                const me = await fetchJsonWithAuth<UserProfile>("/api/me");
                if (cancelled) return;
                setUserRole(me.role || "viewer");
                setAllowedTabs(Array.isArray(me.allowed_tabs) ? me.allowed_tabs : []);
            } catch {
                if (cancelled) return;
                setUserRole("viewer");
                setAllowedTabs([]);
            }
        }

        loadProfile();
        return () => {
            cancelled = true;
        };
    }, [user]);

    const visibleNavItems = useMemo(() => NAV_ITEMS.filter((item) => {
        if (userRole === "admin") return true;
        if (!item.permission) return true;
        if (allowedTabs.length === 0) return item.permission === "dashboard";
        return allowedTabs.includes(item.permission);
    }), [allowedTabs, userRole]);

    useEffect(() => {
        if (!user) return;

        const routesToPrefetch = new Set<string>();
        for (const item of visibleNavItems) {
            routesToPrefetch.add(item.href);
            if (item.children?.length) {
                for (const child of item.children) {
                    routesToPrefetch.add(child.href);
                }
            }
        }

        routesToPrefetch.forEach((href) => {
            router.prefetch(href);
        });
    }, [router, user, visibleNavItems]);

    if (authLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[var(--bg)]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
                    <p className="text-sm font-semibold text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user && pathname !== "/login") {
        return null;
    }

    // Special case for login page - no layout elements
    if (pathname === "/login") {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-[var(--bg)]">
            <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur">
                <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-4 px-4 sm:px-6">
                    <Link href="/" className="flex shrink-0 items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ink)] text-white">
                            <Box size={16} />
                        </div>
                        <span className="text-xl font-semibold tracking-tight text-slate-800">opengate</span>
                    </Link>

                    <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
                        {visibleNavItems.map((item) => {
                            const isActive = item.href === "/"
                                ? pathname === "/"
                                : pathname === item.href || pathname.startsWith(item.href + "/");
                            const Icon = item.icon;

                            if (item.children?.length) {
                                return (
                                    <div key={item.href} className="group relative">
                                        <Link
                                            href={item.href}
                                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${isActive
                                                ? "bg-blue-500 text-white shadow-sm"
                                                : "text-slate-700 hover:bg-blue-50 hover:text-slate-900"
                                                }`}
                                        >
                                            <Icon size={14} />
                                            {item.label}
                                        </Link>
                                        <div className="pointer-events-none invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-2 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100">
                                            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                                {item.children.map((child) => {
                                                    const childActive = child.href === "/products"
                                                        ? pathname === "/products"
                                                        : pathname === child.href || pathname.startsWith(child.href + "/");
                                                    return (
                                                        <Link
                                                            key={child.href}
                                                            href={child.href}
                                                            className={`mb-1 block rounded-lg px-3 py-2 text-sm last:mb-0 ${childActive
                                                                ? "bg-blue-500 font-semibold text-white"
                                                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                                }`}
                                                        >
                                                            {child.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${isActive
                                        ? "bg-blue-500 text-white shadow-sm"
                                        : "text-slate-700 hover:bg-blue-50 hover:text-slate-900"
                                        }`}
                                >
                                    <Icon size={14} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <button className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 sm:inline-flex">
                            <Search size={16} />
                        </button>
                        <button className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 sm:inline-flex">
                            <Bell size={16} />
                        </button>
                        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 sm:flex">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                                {user?.email?.[0]?.toUpperCase() ?? "U"}
                            </div>
                            <span className="max-w-28 truncate text-sm font-medium text-slate-600">
                                {user?.email?.split("@")[0]}
                            </span>
                            <button onClick={() => signOut(auth)} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                                <LogOut size={14} />
                            </button>
                        </div>
                        <button
                            onClick={() => setMobileMenuOpen((prev) => !prev)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden"
                        >
                            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation Drawer */}
                <div className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${mobileMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Drawer */}
                    <div className={`absolute right-0 top-0 h-full w-[80%] max-w-[300px] bg-white shadow-2xl transition-transform duration-300 flex flex-col ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <span className="font-bold text-lg text-slate-800 tracking-tight">Menu</span>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            {visibleNavItems.map((item) => {
                                const isActive = item.href === "/"
                                    ? pathname === "/"
                                    : pathname === item.href || pathname.startsWith(item.href + "/");
                                return (
                                    <div key={item.href} className="space-y-1">
                                        <Link
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-all ${isActive
                                                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                }`}
                                        >
                                            <item.icon size={20} />
                                            {item.label}
                                        </Link>

                                        {item.children?.length ? (
                                            <div className="pl-12 space-y-1 mt-1 mb-2 border-l-2 border-slate-100 ml-4">
                                                {item.children.map((child) => {
                                                    const childActive = child.href === "/products"
                                                        ? pathname === "/products"
                                                        : pathname === child.href || pathname.startsWith(child.href + "/");
                                                    return (
                                                        <Link
                                                            key={child.href}
                                                            href={child.href}
                                                            onClick={() => setMobileMenuOpen(false)}
                                                            className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${childActive
                                                                ? "text-blue-600 bg-blue-50"
                                                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                                                }`}
                                                        >
                                                            {child.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3 px-2 mb-4">
                                <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                    {user?.email?.[0]?.toUpperCase() ?? "U"}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-bold text-slate-800 truncate">{user?.email}</p>
                                    <p className="text-xs text-slate-500">View Profile</p>
                                </div>
                            </div>
                            <button
                                onClick={() => signOut(auth)}
                                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-rose-600 transition-colors"
                            >
                                <LogOut size={16} />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-[1440px] px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 pb-24 lg:pb-8">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-2 lg:hidden safe-area-inset-bottom">
                <div className="flex items-center justify-around">
                    <Link
                        href="/"
                        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${pathname === '/' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}
                    >
                        <Home size={20} strokeWidth={pathname === '/' ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Home</span>
                    </Link>
                    <Link
                        href="/products"
                        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${pathname.startsWith('/products') ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}
                    >
                        <Package size={20} strokeWidth={pathname.startsWith('/products') ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Products</span>
                    </Link>
                    <Link
                        href="/sales"
                        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${pathname.startsWith('/sales') ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}
                    >
                        <Receipt size={20} strokeWidth={pathname.startsWith('/sales') ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Sales</span>
                    </Link>
                    <Link
                        href="/customers"
                        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${pathname.startsWith('/customers') ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}
                    >
                        <Users size={20} strokeWidth={pathname.startsWith('/customers') ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Customers</span>
                    </Link>
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${mobileMenuOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}
                    >
                        <Menu size={20} />
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                </div>
            </nav>

            {/* Mobile FAB for Quick Actions */}
            <button
                onClick={() => router.push('/sales/new')}
                className="fab-mobile bg-blue-600 text-white hover:bg-blue-700 lg:hidden"
                aria-label="Create new sale"
            >
                <Plus size={24} />
            </button>
        </div>
    );
}
