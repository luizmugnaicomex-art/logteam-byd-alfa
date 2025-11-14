

import React, { useState, useMemo, useEffect } from 'react';
import { LogisticsEntry } from '../types';
import { parseDate, formatCurrency, formatPoSap } from '../utils/helpers';
// Fix: Replaced missing icons with available ones and removed unused BoxOpenIcon.
import { CheckCircleIcon, DeliveryTruckIcon, CalendarIcon, HourglassIcon, TimesCircleIcon, SearchIcon, ExportIcon } from './common/Icons';

declare var XLSX: any;
declare var jspdf: any;

interface DeliveryPanelPageProps {
    entries: LogisticsEntry[];
    onUpdateEntry: (entry: LogisticsEntry) => void;
}

const DeliveryPanelPage: React.FC<DeliveryPanelPageProps> = ({ entries, onUpdateEntry }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [editingCarrier, setEditingCarrier] = useState<Record<string, string | undefined>>({});
    const [editingValue, setEditingValue] = useState<Record<string, string>>({});
    const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM format

    useEffect(() => {
        setActiveTab(null); // Reset active tab when filters change to show the first available day
    }, [monthFilter, activeStatusFilter, searchTerm]);

    const deliveryData = useMemo(() => {
        return entries.filter(e => e.estimatedDeliveryDate);
    }, [entries]);

    const filteredData = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        let filtered = deliveryData.filter(row => 
            !monthFilter || (row.estimatedDeliveryDate && row.estimatedDeliveryDate.startsWith(monthFilter))
        );

        if (activeStatusFilter) {
            filtered = filtered.filter(row => (row.status || 'PENDENTE').toUpperCase() === activeStatusFilter);
        }

        if (query) {
            filtered = filtered.filter(row =>
                Object.values(row).some(value => String(value).toLowerCase().includes(query))
            );
        }
        return filtered;
    }, [deliveryData, searchTerm, activeStatusFilter, monthFilter]);

    const stats = useMemo(() => {
        const total = deliveryData.length;
        const delivered = deliveryData.filter(d => (d.status || '').toUpperCase() === 'ENTREGUE').length;
        const inTransit = deliveryData.filter(d => (d.status || '').toUpperCase() === 'A CAMINHO').length;
        const postponed = deliveryData.filter(d => (d.status || '').toUpperCase() === 'ADIADO').length;
        const canceled = deliveryData.filter(d => (d.status || '').toUpperCase() === 'CANCELADO').length;
        const pending = total - delivered - inTransit - postponed - canceled;
        return { total, delivered, inTransit, postponed, canceled, pending };
    }, [deliveryData]);

    const groupedByDate = useMemo(() => {
        const grouped = filteredData.reduce((acc, row) => {
            const dateStr = row.estimatedDeliveryDate || 'Data não definida';
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(row);
            return acc;
        }, {} as Record<string, LogisticsEntry[]>);
        return Object.entries(grouped).sort(([dateA], [dateB]) => {
             const d1 = parseDate(dateA);
             const d2 = parseDate(dateB);
             if (d1 && d2) return d1.getTime() - d2.getTime();
             return 0;
        });
    }, [filteredData]);

    const handleStatusUpdate = (entry: LogisticsEntry, newStatus: string) => {
        onUpdateEntry({ ...entry, status: newStatus });
    };

    const handleCarrierUpdate = (entry: LogisticsEntry) => {
        const newCarrierValue = editingCarrier[entry.id];
        if (newCarrierValue !== undefined && newCarrierValue !== (entry.carrier ?? '')) {
            onUpdateEntry({ ...entry, carrier: newCarrierValue });
        }
        const newEditingState = { ...editingCarrier };
        delete newEditingState[entry.id];
        setEditingCarrier(newEditingState);
    };

    const handleValueUpdate = (entry: LogisticsEntry) => {
        const newValueStr = editingValue[entry.id];
        if (newValueStr !== undefined) {
            const newValue = newValueStr === '' ? undefined : parseFloat(newValueStr);
            if (newValue !== (entry.valuePerCntr ?? undefined)) {
                onUpdateEntry({ ...entry, valuePerCntr: newValue });
            }
        }
        const newEditingState = { ...editingValue };
        delete newEditingState[entry.id];
        setEditingValue(newEditingState);
    };


    const StatusPill: React.FC<{ status: string }> = ({ status }) => {
        const upperStatus = (status || 'PENDENTE').toUpperCase();
        // Fix: Replaced missing icons with available ones.
        const details = {
            'ENTREGUE': { icon: <CheckCircleIcon />, pill: 'bg-green-100 text-green-700' },
            'A CAMINHO': { icon: <DeliveryTruckIcon />, pill: 'bg-yellow-100 text-yellow-700' },
            'ADIADO': { icon: <CalendarIcon />, pill: 'bg-blue-100 text-blue-700' },
            'CANCELADO': { icon: <TimesCircleIcon />, pill: 'bg-red-100 text-red-700' },
            'PENDENTE': { icon: <HourglassIcon />, pill: 'bg-slate-200 text-slate-700' },
        }[upperStatus] || { icon: <HourglassIcon />, pill: 'bg-slate-200 text-slate-700' };

        return <span className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${details.pill}`}>
            <div className="w-3 h-3">{details.icon}</div> <span>{upperStatus}</span>
        </span>;
    };
    
    const exportToExcel = () => {
        const dataToExport = deliveryData.map(row => ({
            'Container': row.cntrsOriginal,
            'BL': row.bl,
            'PO SAP': row.poSap,
            'Lote': row.batch,
            'Valor': row.valuePerCntr,
            'Transportadora': row.carrier,
            'Placa': row.tmsDespatchNo,
            'Armazém': row.bondedWarehouse,
            'Local de Entrega': row.onSitePlaceOfDelivery,
            'Data Estimada': row.estimatedDeliveryDate,
            'Status': row.status,
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Painel_de_Entregas");
        XLSX.writeFile(wb, "painel_de_entregas.xlsx");
    };


    return (
        <div className="space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Painel de Entregas</h1>
                <div className="flex items-center gap-2">
                     <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="p-2 border rounded-md text-sm" />
                    <div className="relative flex items-center">
                        <div className="absolute left-3 text-gray-400"><SearchIcon /></div>
                        <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="p-2 pl-10 border rounded-md text-sm w-64" />
                    </div>
                    <button onClick={exportToExcel} className="flex items-center gap-2 p-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 text-sm"><ExportIcon /> Exportar Excel</button>
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(stats).map(([key, value]) => {
                    const statusKey = key === 'inTransit' ? 'A CAMINHO' : key.toUpperCase();
                    const isActive = activeStatusFilter === statusKey;
                    return <button key={key} onClick={() => setActiveStatusFilter(isActive ? null : statusKey)} className={`p-4 rounded-lg shadow-sm text-left bg-white ${isActive ? 'ring-2 ring-byd-blue' : ''}`}><p className="text-sm text-gray-500 capitalize">{key}</p><p className="text-3xl font-bold">{value}</p></button>
                })}
            </div>
            
            <div className="flex border-b overflow-x-auto">
                {groupedByDate.map(([dateStr, items]) => (
                    <button key={dateStr} onClick={() => setActiveTab(dateStr)} className={`px-4 py-2 text-sm font-semibold whitespace-nowrap ${activeTab === dateStr || (!activeTab && groupedByDate.length > 0 && groupedByDate[0][0] === dateStr) ? 'border-b-2 border-byd-blue text-byd-blue' : 'text-gray-500'}`}>
                        {new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} <span className="ml-1 px-1.5 py-0.5 bg-gray-200 rounded-full text-xs">{items.length}</span>
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {groupedByDate.map(([dateStr, items], index) => {
                    const isTabActive = activeTab ? activeTab === dateStr : index === 0;
                    if (!isTabActive) return null;
                    
                    return (<div key={dateStr} className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="font-bold text-lg mb-2">{new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50"><tr>
                                    {['Container', 'BL', 'PO SAP', 'Lote', 'Transportadora', 'Armazém', 'Local de Entrega', 'Valor', 'Status'].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}
                                </tr></thead>
                                <tbody className="divide-y">
                                    {items.map(item => {
                                        return (
                                        <tr key={item.id}>
                                            <td className="px-4 py-2 font-medium">{item.cntrsOriginal}</td>
                                            <td className="px-4 py-2">{item.bl}</td>
                                            <td className="px-4 py-2" title={String(item.poSap || '')}>{formatPoSap(item.poSap)}</td>
                                            <td className="px-4 py-2">{item.batch || 'N/A'}</td>
                                            <td className="px-4 py-2">
                                                 <input
                                                    type="text"
                                                    value={editingCarrier[item.id] ?? item.carrier ?? ''}
                                                    onChange={(e) => setEditingCarrier({
                                                        ...editingCarrier,
                                                        [item.id]: e.target.value
                                                    })}
                                                    onBlur={() => handleCarrierUpdate(item)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            (e.target as HTMLInputElement).blur();
                                                        } else if (e.key === 'Escape') {
                                                            const newEditingState = { ...editingCarrier };
                                                            delete newEditingState[item.id];
                                                            setEditingCarrier(newEditingState);
                                                            (e.target as HTMLInputElement).blur();
                                                        }
                                                    }}
                                                    placeholder="N/A"
                                                    className="p-1 border rounded-md text-xs w-full bg-white hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-byd-blue"
                                                />
                                            </td>
                                            <td className="px-4 py-2">{item.bondedWarehouse}</td>
                                            <td className="px-4 py-2">{item.onSitePlaceOfDelivery || 'N/A'}</td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    value={editingValue[item.id] ?? item.valuePerCntr ?? ''}
                                                    onChange={(e) => setEditingValue({
                                                        ...editingValue,
                                                        [item.id]: e.target.value
                                                    })}
                                                    onBlur={() => handleValueUpdate(item)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            (e.target as HTMLInputElement).blur();
                                                        } else if (e.key === 'Escape') {
                                                            const newEditingState = { ...editingValue };
                                                            delete newEditingState[item.id];
                                                            setEditingValue(newEditingState);
                                                            (e.target as HTMLInputElement).blur();
                                                        }
                                                    }}
                                                    placeholder="-"
                                                    className="p-1 border rounded-md text-xs w-full bg-white hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-byd-blue"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <select value={item.status || 'PENDENTE'} onChange={(e) => handleStatusUpdate(item, e.target.value)} className="p-1 border rounded-md text-xs bg-white">
                                                    {['PENDENTE', 'A CAMINHO', 'ADIADO', 'ENTREGUE', 'CANCELADO'].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>)
                })}
            </div>

        </div>
    );
};

export default DeliveryPanelPage;