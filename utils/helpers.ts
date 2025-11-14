

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