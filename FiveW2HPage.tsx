import React, { useState, useMemo, useEffect } from 'react';
import { LogisticsEntry } from '../types';
import { parseDate, toDisplayDate, formatPoSap } from '../utils/helpers';
import { CheckCircleIcon, DeliveryTruckIcon, CalendarIcon, HourglassIcon, TimesCircleIcon, SearchIcon, ExportIcon, Loader2Icon } from './common/Icons';

declare var XLSX: any;

interface DeliveryPanelPageProps {
    entries: LogisticsEntry[];
    isLoading: boolean;
    onUpdateEntry: (entry: LogisticsEntry) => void;
    onUnscheduleEntry: (entry: LogisticsEntry) => void;
    onMonthChange: (startDate: string, endDate: string) => void;
}

const DeliveryPanelPage: React.FC<DeliveryPanelPageProps> = ({ entries, isLoading, onUpdateEntry, onUnscheduleEntry, onMonthChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [editingCarrier, setEditingCarrier] = useState<Record<string, string | undefined>>({});
    const [editingValue, setEditingValue] = useState<Record<string, string>>({});
    const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));

    useEffect(() => {
        const date = new Date(monthFilter + '-02T00:00:00'); // Use day 2 to avoid timezone issues
        const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        onMonthChange(start, end);
        setActiveTab(null);
        setActiveStatusFilter(null);
    }, [monthFilter, onMonthChange]);

    const filteredData = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        let filtered = entries;
        if (activeStatusFilter) filtered = filtered.filter(row => (row.status || 'PENDENTE').toUpperCase() === activeStatusFilter);
        if (query) filtered = filtered.filter(row => Object.values(row).some(value => String(value).toLowerCase().includes(query)));
        return filtered;
    }, [entries, searchTerm, activeStatusFilter]);

    const displayStats = useMemo(() => {
        const targetEntries = activeTab ? entries.filter(e => e.estimatedDeliveryDate === activeTab) : entries;

        const counts = {
            total: 0,
            delivered: 0,
            inTransit: 0,
            postponed: 0,
            canceled: 0,
            pending: 0,
        };
    
        targetEntries.forEach(d => {
            const status = (d.status || 'PENDENTE').toUpperCase();
            switch (status) {
                case 'ENTREGUE': counts.delivered++; break;
                case 'A CAMINHO': counts.inTransit++; break;
                case 'ADIADO': counts.postponed++; break;
                case 'CANCELADO': counts.canceled++; break;
                default: counts.pending++; break;
            }
        });
        
        counts.total = counts.delivered + counts.inTransit + counts.postponed + counts.canceled + counts.pending;
    
        return counts;
    }, [entries, activeTab]);
    
    const statusFilters = [
        { key: 'total', label: 'Total', value: displayStats.total, filter: null },
        { key: 'pending', label: 'Pendente', value: displayStats.pending, filter: 'PENDENTE' },
        { key: 'inTransit', label: 'A Caminho', value: displayStats.inTransit, filter: 'A CAMINHO' },
        { key: 'postponed', label: 'Adiado', value: displayStats.postponed, filter: 'ADIADO' },
        { key: 'delivered', label: 'Entregue', value: displayStats.delivered, filter: 'ENTREGUE' },
        { key: 'canceled', label: 'Cancelado', value: displayStats.canceled, filter: 'CANCELADO' }
    ];

    const groupedByDate = useMemo(() => {
        const grouped = filteredData.reduce((acc, row) => {
            const dateStr = row.estimatedDeliveryDate || 'Data não definida';
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(row);
            return acc;
        }, {} as Record<string, LogisticsEntry[]>);
        return Object.entries(grouped).sort(([dateA], [dateB]) => {
             const d1 = parseDate(dateA); const d2 = parseDate(dateB);
             return (d1 && d2) ? d1.getTime() - d2.getTime() : 0;
        });
    }, [filteredData]);

    const handleCardClick = (filter: string | null) => {
        if (filter === null) { // This is the 'Total' card
            setActiveTab(null); // Show month-wide stats
            setActiveStatusFilter(null); // Clear status filter
        } else {
            // Clicking a status card toggles the filter for the list below
            setActiveStatusFilter(prev => (prev === filter ? null : filter));
        }
    };

    const handleStatusUpdate = (entry: LogisticsEntry, newStatus: string) => onUpdateEntry({ ...entry, status: newStatus });
    const handleCarrierUpdate = (entry: LogisticsEntry) => { const newCarrierValue = editingCarrier[entry.id]; if (newCarrierValue !== undefined) onUpdateEntry({ ...entry, carrier: newCarrierValue }); delete editingCarrier[entry.id]; setEditingCarrier({...editingCarrier}); };
    const handleValueUpdate = (entry: LogisticsEntry) => { const newValueStr = editingValue[entry.id]; if (newValueStr !== undefined) { const newValue = newValueStr === '' ? undefined : parseFloat(newValueStr); onUpdateEntry({ ...entry, valuePerCntr: newValue }); } delete editingValue[entry.id]; setEditingValue({...editingValue}); };
    
    const handleRemoveFromSchedule = (entry: LogisticsEntry) => {
        if (window.confirm(`Are you sure you want to remove container ${entry.cntrsOriginal} from the schedule? This will affect all duplicate entries.`)) {
            onUnscheduleEntry(entry);
        }
    };

    const exportToExcel = () => {
        if (filteredData.length === 0) {
            alert('No data to export.');
            return;
        }

        const sortedData = [...filteredData].sort((a, b) => {
            const dateA = parseDate(a.estimatedDeliveryDate);
            const dateB = parseDate(b.estimatedDeliveryDate);
            if (dateA && dateB) {
                if(dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
            } else if (dateA) {
                return -1;
            } else if (dateB) {
                return 1;
            }
            return String(a.cntrsOriginal || '').localeCompare(String(b.cntrsOriginal || ''));
        });

        const dataToExport = sortedData.map(r => ({
            'Data Estimada': toDisplayDate(r.estimatedDeliveryDate),
            'Container': r.cntrsOriginal,
            'BL': r.bl,
            'PO SAP': r.poSap,
            'Vessel': r.arrivalVessel,
            'Tipo de Carga': r.typeOfCargo,
            'Lote': r.batch,
            'Transportadora': r.carrier,
            'Armazém': r.bondedWarehouse,
            'Local de Entrega': r.onSitePlaceOfDelivery,
            'Valor': r.valuePerCntr,
            'Status': r.status || 'PENDENTE'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        
        const colWidths = [
            { wch: 15 }, // Data Estimada
            { wch: 20 }, // Container
            { wch: 20 }, // BL
            { wch: 15 }, // PO SAP
            { wch: 20 }, // Vessel
            { wch: 20 }, // Tipo de Carga
            { wch: 10 }, // Lote
            { wch: 20 }, // Transportadora
            { wch: 20 }, // Armazém
            { wch: 25 }, // Local de Entrega
            { wch: 15 }, // Valor
            { wch: 15 }, // Status
        ];
        ws['!cols'] = colWidths;
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Painel de Entregas");
        XLSX.writeFile(wb, `painel_de_entregas_${monthFilter}.xlsx`);
    };

    return (
        <div className="space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Painel de Entregas</h1>
                <div className="flex items-center gap-2">
                     <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="p-2 border rounded-md text-sm" />
                    <div className="relative flex items-center"><div className="absolute left-3 text-gray-400"><SearchIcon /></div><input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="p-2 pl-10 border rounded-md text-sm w-64" /></div>
                    <button onClick={exportToExcel} className="flex items-center gap-2 p-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 text-sm"><ExportIcon /> Exportar Excel</button>
                </div>
            </header>
            
            <div className="space-y-2">
                 <h2 className="text-lg font-semibold text-gray-700">
                    {activeTab 
                        ? `Resumo do Dia: ${new Date(activeTab + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
                        : 'Resumo do Mês'
                    }
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                     {statusFilters.map((item) => {
                        const isActive = activeStatusFilter === item.filter;
                        const isTotalActive = activeTab === null && item.key === 'total';
                        return <button 
                            key={item.key} 
                            onClick={() => handleCardClick(item.filter)}
                            className={`p-4 rounded-lg shadow-sm text-left bg-white cursor-pointer ${(isActive && item.key !== 'total') || isTotalActive ? 'ring-2 ring-byd-blue' : 'hover:ring-2 hover:ring-gray-300'}`}>
                            <p className="text-sm text-gray-500">{item.label}</p>
                            <p className="text-3xl font-bold">{item.value}</p>
                        </button>
                    })}
                </div>
            </div>
            
            <div className="flex border-b overflow-x-auto">
                {groupedByDate.map(([dateStr, items], index) => {
                    const isTabSelected = activeTab === dateStr;
                    const isDefaultTab = !activeTab && index === 0 && groupedByDate.length > 0;
                    return (
                        <button key={dateStr} onClick={() => setActiveTab(dateStr)} className={`px-4 py-2 text-sm font-semibold whitespace-nowrap ${isTabSelected || isDefaultTab ? 'border-b-2 border-byd-blue text-byd-blue' : 'text-gray-500 hover:text-gray-700'}`}>{new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} <span className="ml-1 px-1.5 py-0.5 bg-gray-200 rounded-full text-xs">{items.length}</span></button>
                    )
                })}
            </div>

            {isLoading ? <div className="flex justify-center items-center p-8"><Loader2Icon /></div> :
            <div className="space-y-4">
                {groupedByDate.map(([dateStr, items], index) => {
                    const isTabActive = activeTab ? activeTab === dateStr : index === 0;
                    if (!isTabActive) return null;
                    return (<div key={dateStr} className="bg-white p-4 rounded-lg shadow-md animate-fade-in">
                        <h3 className="font-bold text-lg mb-2">{new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</h3>
                        <div className="overflow-x-auto"><table className="w-full text-sm">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50"><tr>{['Container', 'BL', 'PO SAP', 'Vessel', 'Type of Cargo', 'Lote', 'Transportadora', 'Armazém', 'Local de Entrega', 'Valor', 'Status', 'Ações'].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
                            <tbody className="divide-y">{items.map(item => (
                                <tr key={item.id}>
                                    <td className="px-4 py-2 font-medium">{item.cntrsOriginal}</td>
                                    <td className="px-4 py-2">{item.bl}</td>
                                    <td className="px-4 py-2" title={String(item.poSap || '')}>{formatPoSap(item.poSap)}</td>
                                    <td className="px-4 py-2">{item.arrivalVessel}</td>
                                    <td className="px-4 py-2">{item.typeOfCargo || 'N/A'}</td>
                                    <td className="px-4 py-2">{item.batch || 'N/A'}</td>
                                    <td className="px-4 py-2"><input type="text" value={editingCarrier[item.id] ?? item.carrier ?? ''} onChange={(e) => setEditingCarrier({ ...editingCarrier, [item.id]: e.target.value })} onBlur={() => handleCarrierUpdate(item)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} className="p-1 border rounded-md text-xs w-full"/></td>
                                    <td className="px-4 py-2">{item.bondedWarehouse}</td>
                                    <td className="px-4 py-2">{item.onSitePlaceOfDelivery || 'N/A'}</td>
                                    <td className="px-4 py-2"><input type="number" value={editingValue[item.id] ?? item.valuePerCntr ?? ''} onChange={(e) => setEditingValue({ ...editingValue, [item.id]: e.target.value })} onBlur={() => handleValueUpdate(item)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} className="p-1 border rounded-md text-xs w-full"/></td>
                                    <td className="px-4 py-2"><select value={item.status || 'PENDENTE'} onChange={(e) => handleStatusUpdate(item, e.target.value)} className="p-1 border rounded-md text-xs bg-white">{['PENDENTE', 'A CAMINHO', 'ADIADO', 'ENTREGUE', 'CANCELADO'].map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                                    <td className="px-4 py-2 text-center">
                                        <button onClick={() => handleRemoveFromSchedule(item)} className="p-1 text-red-500 hover:text-red-700" title="Remover do agendamento">
                                            <TimesCircleIcon />
                                        </button>
                                    </td>
                                </tr>))}
                            </tbody>
                        </table></div>
                    </div>)})}
            </div>}
        </div>
    );
};

export default DeliveryPanelPage;