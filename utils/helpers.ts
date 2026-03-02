import React, { createContext, useState, useContext, ReactNode } from 'react';

// --- TRANSLATIONS ---
type Translations = { [key: string]: { pt: string; 'zh-CN': string; } };
export const translations: Translations = {
    // Sidebar
    dashboard: { pt: 'Dashboard', 'zh-CN': '仪表板' },
    logistics: { pt: 'Logistics', 'zh-CN': '物流' },
    deliveryPanel: { pt: 'Painel de Entregas', 'zh-CN': '交付面板' },
    calendar: { pt: 'Calendario', 'zh-CN': '日历' },
    fupReport: { pt: 'FUP Report', 'zh-CN': 'FUP报告' },
    team: { pt: 'Equipe', 'zh-CN': '团队' },
    admin: { pt: 'Admin', 'zh-CN': '管理' },


    // Page & Component Titles
    logisticsDashboard: { pt: 'Logistics Dashboard', 'zh-CN': '物流仪表板' },
    generalKpiOverview: { pt: 'Visão Geral dos KPIs', 'zh-CN': 'KPI总览' },
    logisticsEntries: { pt: 'Logistics Entries', 'zh-CN': '物流条目' },
    deliveryPanelTitle: { pt: 'Painel de Entregas', 'zh-CN': '交付面板' },
    fupReportTitle: { pt: 'FUP Report', 'zh-CN': 'FUP报告' },
    editTitle: { pt: 'Edit', 'zh-CN': '编辑' },
    newLogisticsEntry: { pt: 'New Logistics Entry', 'zh-CN': '新物流条目' },
    scheduleDelivery: { pt: 'Schedule Delivery', 'zh-CN': '安排交货' },

    // Dashboard "Topics"
    highRisk: { pt: 'ALTO RISCO', 'zh-CN': '高风险' },
    mediumRisk: { pt: 'MÉDIO RISCO', 'zh-CN': '中等风险' },
    lowRisk: { pt: 'BAIXO RISCO', 'zh-CN': '低风险' },
    safe: { pt: 'SEGURO', 'zh-CN': '安全' },
    delivered: { pt: 'ENTREGUE', 'zh-CN': '已交付' },
    containersByComexStatus: { pt: 'Containers by COMEX Status', 'zh-CN': 'COMEX状态集装箱' },
    totalContainersByVessel: { pt: 'Total de Containers por Navio', 'zh-CN': '各船集装箱总量' },
    cargoStatusDistribution: { pt: 'Distribuição de Status de Carga', 'zh-CN': '货物状态分布' },
    deadlineDistribution: { pt: 'Distribuição de Prazos', 'zh-CN': '截止日期分布' },

    // Logistics List "Topics" (Table Headers)
    cntr: { pt: 'CNTR', 'zh-CN': '集装箱' },
    bl: { pt: 'BL', 'zh-CN': '提单' },
    posap: { pt: 'PO SAP', 'zh-CN': 'PO SAP' },
    shipper: { pt: 'Shipper', 'zh-CN': '发货人' },
    vessel: { pt: 'Vessel', 'zh-CN': '船只' },
    carrier: { pt: 'Carrier', 'zh-CN': '承运人' },
    ata: { pt: 'ATA', 'zh-CN': '实际到达时间' },
    freetime: { pt: 'Free Time', 'zh-CN': '免费期' },
    deadlinecntr: { pt: 'Deadline CNTR', 'zh-CN': '集装箱截止日期' },
    estdelivery: { pt: 'Est. Delivery', 'zh-CN': '预计交货' },
    actualdelivery: { pt: 'Actual Delivery', 'zh-CN': '实际交货' },
    actualdepot: { pt: 'Actual Depot', 'zh-CN': '实际仓库' },
    status: { pt: 'Status', 'zh-CN': '地位' },
    warehousestatus: { pt: 'Warehouse Status', 'zh-CN': '仓库状态' },
    actions: { pt: 'Actions', 'zh-CN': '行动' },
};

// --- LANGUAGE CONTEXT ---
type Language = 'pt' | 'zh-CN';
interface LanguageContextType {
    language: Language;
    toggleLanguage: () => void;
    t: (key: string) => string;
}
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// FIX: Change children to be optional to fix cryptic TS error on line 15 in index.tsx.
export const LanguageProvider = ({ children }: { children?: ReactNode }) => {
    const [language, setLanguage] = useState<Language>('pt');
    const toggleLanguage = () => setLanguage(lang => lang === 'pt' ? 'zh-CN' : 'pt');
    const t = (key: string): string => translations[key]?.[language] || key;
    // FIX: Rewrote JSX to React.createElement to avoid parsing errors in a .ts file.
    return React.createElement(LanguageContext.Provider, { value: { language, toggleLanguage, t } }, children);
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
    return context;
};

export const removeUndefinedFields = (obj: any): any => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach(key => {
        if (newObj[key] === undefined) {
            delete newObj[key];
        }
    });
    return newObj;
};

export const getComexStatusPillClass = (status: string | undefined | null): string => {
    if (!status) return 'bg-gray-200 text-gray-800';
    const s = status.toUpperCase();
    if (s.includes('DELIVERED') || s.includes('ENTREGUE')) return 'bg-green-100 text-green-800';
    if (s.includes('CLEARED') || s.includes('LIBERADO')) return 'bg-blue-100 text-blue-800';
    if (s.includes('TRANSIT') || s.includes('PROGRESS')) return 'bg-yellow-100 text-yellow-800';
    if (s.includes('PORT') || s.includes('AT THE PORT')) return 'bg-orange-100 text-orange-800';
    if (s.includes('READY') || s.includes('CARGO READY')) return 'bg-teal-100 text-teal-800';
    if (s.includes('DI REGISTERED')) return 'bg-indigo-100 text-indigo-800';
    if (s.includes('REVIEW')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-200 text-gray-800';
};

export const getWarehouseStatusPillClass = (status: string | undefined | null): string => {
    if (!status) return 'bg-gray-200 text-gray-800';
    const s = status.toUpperCase();
    if (s.includes('PENDENTE') || s.includes('UNLOADED')) return 'bg-orange-100 text-orange-800';
    if (s.includes('LOADED')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-200 text-gray-800';
};

// Fix: Add missing get5W2HStatusPillClass function.
export const get5W2HStatusPillClass = (status: string | undefined | null): string => {
    if (!status) return 'bg-gray-200 text-gray-800';
    const s = status.toUpperCase();
    if (s.includes('COMPLETED') || s.includes('RESOLVED')) return 'bg-green-100 text-green-800';
    if (s.includes('IN PROGRESS')) return 'bg-blue-100 text-blue-800';
    if (s.includes('OPEN')) return 'bg-yellow-100 text-yellow-800';
    if (s.includes('REJECTED')) return 'bg-red-100 text-red-800';
    return 'bg-gray-200 text-gray-800';
};

export const formatPoSap = (poSap: string | number | undefined | null): string => {
    const po = poSap ? String(poSap) : '';
    return po.length > 6 ? `...${po.slice(-6)}` : po;
};

export const formatCurrency = (value: number | undefined | null, currency?: string | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
        return '-';
    }
    const validCurrency = currency || 'BRL';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: validCurrency });
};

export const formatNumber = (value: number | undefined | null, options?: Intl.NumberFormatOptions): string => {
    if (value === undefined || value === null || isNaN(value)) {
        return '-';
    }
    return value.toLocaleString('en-US', options);
};

export const toDisplayDate = (isoDate: string | undefined | null): string => {
    if (!isoDate) return '';
    const datePart = isoDate.split('T')[0].split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
        const [y, m, d] = parts;
        if ((y === '1900' && m === '01' && d === '00') || (y === '1899' && m === '12' && d === '31')) {
            return '';
        }
        return `${d}/${m}/${y}`;
    }
    return isoDate;
};

export const fromDisplayDate = (displayDate: string): string => {
    const parts = displayDate.split('/');
    if (parts.length !== 3) return displayDate; // return original if not in expected format
    const [d, m, y] = parts;
    if (!d || !m || !y || y.length !== 4) return displayDate;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

export const parseDate = (dateStr: string | undefined | null): Date | null => {
    if (!dateStr) return null;
    const datePart = dateStr.split('T')[0].split(' ')[0];

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(datePart)) {
        const [d, m, y] = datePart.split('/');
        const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        return !isNaN(date.getTime()) ? date : null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        const date = new Date(datePart + 'T00:00:00');
        return !isNaN(date.getTime()) ? date : null;
    }
    return null;
};

export const calculateDateDiffInDays = (d1: string | undefined | null, d2: string | undefined | null): number | null => {
    if (!d1 || !d2) return null;
    const date1 = parseDate(d1);
    const date2 = parseDate(d2);
    if (!date1 || !date2) return null;
    
    const differenceInTime = date1.getTime() - date2.getTime();
    const differenceInDays = differenceInTime / (1000 * 3600 * 24);
    
    return differenceInDays;
};