

import React, { useState, useMemo, useCallback } from 'react';
import { LogisticsEntry, User } from '../types';
import { parseDate } from '../utils/helpers';
import BarChart from './common/BarChart';
import ChartJS from './common/ChartJS';
import { 
    AlertTriangleIcon, HourglassIcon, CalendarCheckIcon, ShieldIcon, ArchiveBoxIcon,
    ExportIcon, FilterSolidIcon, ClearIcon
} from './common/Icons';

declare var XLSX: any;

interface DashboardPageProps {
    entries: LogisticsEntry[];
    currentUser: User | null;
    onNavigate: (view: string, filter?: { type: string; value: string; }) => void;
}

const RiskSummaryCard: React.FC<{
    title: string;
    subtitle: string;
    count: number;
    icon: React.ReactNode;
    colorClasses: { border: string; bg: string; text:string; };
    onClick: () => void;
}> = ({ title, subtitle, count, icon, colorClasses, onClick }) => (
    <div onClick={onClick} className={`bg-white rounded-lg shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:shadow-lg transition-all border-l-4 ${colorClasses.border}`}>
        <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg ${colorClasses.bg} ${colorClasses.text}`}>
            {icon}
        </div>
        <div className="flex-1">
            <p className="text-xs font-bold text-gray-500 uppercase">{title} <span className="font-normal text-gray-400">{subtitle}</span></p>
            <p className="text-3xl font-extrabold text-gray-800">{count}</p>
        </div>
    </div>
);


const DashboardPage: React.FC<DashboardPageProps> = ({ entries, onNavigate }) => {
    const [filters, setFilters] = useState({ vesselSearch: '', status: '', arrivalStart: '', arrivalEnd: '' });
    const [showFilters, setShowFilters] = useState(false);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const resetFilters = () => setFilters({ vesselSearch: '', status: '', arrivalStart: '', arrivalEnd: '' });

    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            const arrivalDate = parseDate(e.ata);
            return (String(e.arrivalVessel || '').toLowerCase().includes(filters.vesselSearch.toLowerCase())) &&
                   (filters.status === '' || e.statusComex === filters.status) &&
                   (filters.arrivalStart === '' || (arrivalDate && arrivalDate >= new Date(filters.arrivalStart + 'T00:00:00'))) &&
                   (filters.arrivalEnd === '' || (arrivalDate && arrivalDate <= new Date(filters.arrivalEnd + 'T23:59:59')));
        });
    }, [entries, filters]);
    
    const { riskCounts, comexStatusChartData } = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const riskCounts = { high: 0, medium: 0, low: 0, safe: 0, delivered: 0 };
        const isDelivered = (e: LogisticsEntry) => !!e.deliveryDateAtByd;

        entries.forEach(e => {
            if (isDelivered(e)) riskCounts.delivered++;
            else {
                const deadline = parseDate(e.deadlineReturnCntr);
                if (deadline) {
                    deadline.setHours(0, 0, 0, 0);
                    const diffDays = (deadline.getTime() - today.getTime()) / (1000 * 3600 * 24);
                    if (diffDays <= 7) riskCounts.high++;
                    else if (diffDays <= 15) riskCounts.medium++;
                    else if (diffDays <= 30) riskCounts.low++;
                    else riskCounts.safe++;
                } else riskCounts.safe++;
            }
        });
        
        const statusCounts: Record<string, number> = {};
        entries.forEach(e => {
            const status = e.statusComex || 'N/A';
            statusCounts[status] = (statusCounts[status] || 0) + (e.quantity || 1);
        });

        const labels = Object.keys(statusCounts).sort((a, b) => statusCounts[b] - statusCounts[a]);
        const data = labels.map(label => statusCounts[label]);
        const backgroundColors = labels.map(label => {
            if (label.includes('DELIVERED')) return '#2ecc71'; if (label.includes('TRANSIT')) return '#f39c12';
            if (label.includes('PORT')) return '#e67e22'; if (label.includes('CLEARED')) return '#3498db';
            if (label.includes('READY')) return '#1abc9c'; return '#95a5a6';
        });

        return { riskCounts, comexStatusChartData: { title: 'Containers by COMEX Status', labels, datasets: [{ label: 'Number of Containers', data, backgroundColor: backgroundColors }] }};
    }, [entries]);

    const kpiChartData = useMemo(() => {
        const vesselData: Record<string, number> = {};
        filteredEntries.forEach(e => {
            const key = String(e.arrivalVessel || 'N/A');
            vesselData[key] = (vesselData[key] || 0) + (e.quantity || 1);
        });
        const sortedVesselData = Object.entries(vesselData).sort((a,b) => b[1] - a[1]).slice(0, 15);
        const vesselBarChart = { labels: sortedVesselData.map(item => item[0]), datasets: [{ label: 'Total Containers', data: sortedVesselData.map(item => item[1]), backgroundColor: '#0033A0' }] };

        const statusCounts: Record<string, number> = {};
        filteredEntries.forEach(e => {
            const status = e.statusComex || 'N/A';
            statusCounts[status] = (statusCounts[status] || 0) + (e.quantity || 1);
        });
        
        const colors = ['#6366f1', '#a855f7', '#d946ef', '#f59e0b', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b'];
        const statusLabels = Object.keys(statusCounts);
        const statusPieChart = { labels: statusLabels, datasets: [{ data: Object.values(statusCounts), backgroundColor: statusLabels.map((_, i) => colors[i % colors.length]) }] };

        const today = new Date(); today.setHours(0,0,0,0);
        const deadlineGroups: Record<string, number> = { 'Atrasado (<0)': 0, '0-7 Dias': 0, '8-15 Dias': 0, '16-30 Dias': 0, '31+ Dias': 0, 'Entregue': 0 };
        filteredEntries.forEach(e => {
            const qty = e.quantity || 1;
            if (e.deliveryDateAtByd) { deadlineGroups['Entregue'] += qty; return; }
            const deadline = parseDate(e.deadlineReturnCntr);
            if (deadline) {
                deadline.setHours(0,0,0,0);
                const diff = (deadline.getTime() - today.getTime()) / (1000 * 3600 * 24);
                if (diff < 0) deadlineGroups['Atrasado (<0)'] += qty;
                else if (diff <= 7) deadlineGroups['0-7 Dias'] += qty;
                else if (diff <= 15) deadlineGroups['8-15 Dias'] += qty;
                else if (diff <= 30) deadlineGroups['16-30 Dias'] += qty;
                else deadlineGroups['31+ Dias'] += qty;
            } else deadlineGroups['31+ Dias'] += qty;
        });
        const deadlineBarChart = { labels: Object.keys(deadlineGroups), datasets: [{ label: 'Nº de Contêineres', data: Object.values(deadlineGroups), backgroundColor: ['#e74c3c', '#f39c12', '#f1c40f', '#27ae60', '#2ecc71', '#3498db'] }] };

        return { vesselBarChart, statusPieChart, deadlineBarChart };
    }, [filteredEntries]);

    const uniqueStatuses = useMemo(() => Array.from(new Set(entries.map(e => e.statusComex).filter(Boolean))).sort(), [entries]);

    const exportToExcel = useCallback(() => {
        if (filteredEntries.length === 0) return alert('No data to export.');
        const ws = XLSX.utils.json_to_sheet(filteredEntries);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        XLSX.writeFile(wb, 'dashboard_kpi_report.xlsx');
    }, [filteredEntries]);

    const riskColorClasses = {
        high: { border: 'border-red-500', bg: 'bg-red-100', text: 'text-red-600' },
        medium: { border: 'border-yellow-500', bg: 'bg-yellow-100', text: 'text-yellow-600' },
        low: { border: 'border-green-400', bg: 'bg-green-100', text: 'text-green-600' },
        safe: { border: 'border-green-600', bg: 'bg-green-100', text: 'text-green-700' },
        delivered: { border: 'border-gray-400', bg: 'bg-gray-100', text: 'text-gray-600' },
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-gray-800">Logistics Dashboard</h1>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                 <RiskSummaryCard title="ALTO RISCO" subtitle="(vence ≤ 7D)" count={riskCounts.high} icon={<AlertTriangleIcon />} colorClasses={riskColorClasses.high} onClick={() => onNavigate('logistics', { type: 'highRisk', value: 'yes' })} />
                 <RiskSummaryCard title="MÉDIO RISCO" subtitle="(atenção 8-15D)" count={riskCounts.medium} icon={<HourglassIcon />} colorClasses={riskColorClasses.medium} onClick={() => onNavigate('logistics', { type: 'mediumRisk', value: 'yes' })} />
                 <RiskSummaryCard title="BAIXO RISCO" subtitle="(16-30D)" count={riskCounts.low} icon={<CalendarCheckIcon />} colorClasses={riskColorClasses.low} onClick={() => onNavigate('logistics', { type: 'lowRisk', value: 'yes' })} />
                 <RiskSummaryCard title="SEGURO" subtitle="(> 30D)" count={riskCounts.safe} icon={<ShieldIcon />} colorClasses={riskColorClasses.safe} onClick={() => onNavigate('logistics', { type: 'safe', value: 'yes' })} />
                 <RiskSummaryCard title="ENTREGUE" subtitle="" count={riskCounts.delivered} icon={<ArchiveBoxIcon />} colorClasses={riskColorClasses.delivered} onClick={() => onNavigate('logistics', { type: 'delivered', value: 'yes' })} />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <BarChart data={comexStatusChartData} onBarClick={(status) => onNavigate('logistics', { type: 'statusComex', value: status })} />
            </div>

            <div className="space-y-4 pt-4">
                 <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-700">Visão Geral dos KPIs</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-semibold rounded-md hover:bg-gray-50 text-sm border shadow-sm"><FilterSolidIcon /> Filtros</button>
                        <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 text-sm shadow-sm"><ExportIcon /> Exportar</button>
                    </div>
                </div>

                {showFilters && (
                    <div className="bg-white p-4 rounded-lg shadow-md space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <input type="text" name="vesselSearch" value={filters.vesselSearch} onChange={handleFilterChange} placeholder="Pesquisar por Navio..." className="p-2 border rounded-md text-sm"/>
                            <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border rounded-md text-sm bg-white">
                                <option value="">Todos Status</option>
                                {uniqueStatuses.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <div className="flex items-center gap-2 md:col-span-2 lg:col-span-1">
                                <label className="text-sm text-gray-600 whitespace-nowrap">Data de Chegada:</label>
                                <input type="date" name="arrivalStart" value={filters.arrivalStart} onChange={handleFilterChange} className="p-2 border rounded-md text-sm w-full"/>
                                <span className="text-gray-500">-</span>
                                <input type="date" name="arrivalEnd" value={filters.arrivalEnd} onChange={handleFilterChange} className="p-2 border rounded-md text-sm w-full"/>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2"><button onClick={resetFilters} className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300 text-sm flex items-center gap-1"><ClearIcon /> Limpar</button></div>
                    </div>
                )}
            
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md h-[28rem]">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Total de Containers por Navio</h3>
                        <ChartJS type="horizontalBar" data={kpiChartData.vesselBarChart} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true } }, plugins: { legend: { display: false }, datalabels: { color: 'white', anchor: 'center', align: 'center', font: { weight: 'bold' } } } }} />
                    </div>
                    <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md h-[28rem]">
                         <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição de Status de Carga</h3>
                         <ChartJS type="doughnut" data={kpiChartData.statusPieChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { color: 'white', font: { weight: 'bold' }, formatter: (value: number) => value } } }} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md h-[28rem]">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição de Prazos</h3>
                    <ChartJS type="bar" data={kpiChartData.deadlineBarChart} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false }, datalabels: { color: '#333', anchor: 'end', align: 'top', font: { weight: 'bold' } } } }}/>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;