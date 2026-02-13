export type Locale = "en" | "ar";
export type Direction = "ltr" | "rtl";

interface Translation {
    [key: string]: {
        en: string;
        ar: string;
    };
}

export const translations = {
    // --- Common ---
    appName: { en: "OpenGate ERP", ar: "OpenGate ERP" },
    loading: { en: "Loading...", ar: "جاري التحميل..." },

    // --- Login Page ---
    welcomeBack: { en: "Welcome Back", ar: "مرحباً بعودتك" },
    createAccount: { en: "Create Account", ar: "إنشاء حساب" },
    signInToAccess: { en: "Sign in to access your dashboard", ar: "سجّل الدخول للوصول إلى لوحة التحكم" },
    joinNetwork: { en: "Join the enterprise network", ar: "انضم إلى شبكة المؤسسات" },
    emailLabel: { en: "EMAIL ADDRESS", ar: "البريد الإلكتروني" },
    passwordLabel: { en: "PASSWORD", ar: "كلمة المرور" },
    signInBtn: { en: "Sign In", ar: "تسجيل الدخول" },
    getStartedBtn: { en: "Get Started", ar: "ابدأ الآن" },
    dontHaveAccount: { en: "Don't have an account?", ar: "ليس لديك حساب؟" },
    alreadyHaveAccount: { en: "Already have an account?", ar: "لديك حساب بالفعل؟" },
    signUpLink: { en: "Sign Up", ar: "إنشاء حساب" },
    signInLink: { en: "Sign In", ar: "تسجيل الدخول" },
    copyright: { en: "OpenGate ERP © 2026", ar: "OpenGate ERP © 2026" },

    // --- Sidebar ---
    dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
    inventory: { en: "Inventory", ar: "المخزن" },
    accounting: { en: "Accounting", ar: "المحاسبة" },
    reports: { en: "Reports", ar: "التقارير" },
    activity: { en: "Activity Log", ar: "سجل النشاط" },
    employees: { en: "Employees", ar: "الموظفين" },
    mainMenu: { en: "MAIN MENU", ar: "القائمة الرئيسية" },
    logout: { en: "Logout", ar: "تسجيل الخروج" },
    system: { en: "System", ar: "النظام" },
    access: { en: "Access", ar: "صلاحية" },

    // --- Dashboard ---
    salesThisMonth: { en: "Sales (This Month)", ar: "مبيعات (هذا الشهر)" },
    totalRevenue: { en: "Total Revenue", ar: "إجمالي الإيرادات" },
    activeOrders: { en: "Active Orders", ar: "الطلبات النشطة" },
    lowStockItems: { en: "Low Stock Items", ar: "مواد منخفضة الكمية" },
    quickActions: { en: "Quick Actions", ar: "إجراءات سريعة" },
    newSale: { en: "New Sale", ar: "بيع جديد" },
    addStock: { en: "Add Stock", ar: "إضافة مخزون" },
    recordExpense: { en: "Record Expense", ar: "تسجيل مصروف" },
    repairAdmin: { en: "Repair Admin Role", ar: "إصلاح صلاحيات المدير" },
    recentTransactions: { en: "Recent Transactions", ar: "المعاملات الأخيرة" },
    viewAll: { en: "View All", ar: "عرض الكل" },

    // --- New Functional Views ---
    journalEntries: { en: "Journal Entries", ar: "قيود اليومية" },
    postedJournals: { en: "Posted Journal Entries", ar: "القيود المرحلة" },
    trialBalanceReport: { en: "Trial Balance Report", ar: "تقارير ميزان المراجعة" },
    accountCode: { en: "Code", ar: "الكود" },
    accountName: { en: "Account", ar: "الحساب" },
    type: { en: "Type", ar: "النوع" },
    debit: { en: "Debit", ar: "مدين" },
    credit: { en: "Credit", ar: "دائن" },
    balance: { en: "Balance", ar: "الرصيد" },
    inventoryAnalytics: { en: "Inventory Analytics", ar: "تحليلات المخزون" },
    stockValueTrend: { en: "Stock Value Trend", ar: "اتجاه قيمة المخزون" },
    totalStockValue: { en: "Total Stock Value", ar: "إجمالي قيمة المخزون" },
    itemsCount: { en: "Items Count", ar: "عدد المواد" },
    reconciliationWizard: { en: "Reconciliation Wizard", ar: "معالج المطابقة" },
};

export const getTranslation = (key: keyof typeof translations, locale: Locale) => {
    return translations[key]?.[locale] || key;
};
