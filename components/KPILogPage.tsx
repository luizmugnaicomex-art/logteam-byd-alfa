import React, { useState, useMemo, useCallback } from 'react';
import { LogisticsEntry } from '../types';
import { parseDate } from '../utils/helpers';
import ChartJS from './common/ChartJS';
// Fix: Removed unused ColumnsIcon import.
import { UploadIcon, ExportIcon, FilterSolidIcon, ClearIcon, LogisticsIcon, DocumentTextIcon, BuildingOfficeIcon, DeliveryTruckIcon } from './common/Icons';

declare var XLSX: any;

interface KPILogPageProps {
    entries: LogisticsEntry[];
    onUploadClick: () => void;
}

type AnalysisView = 'vessel' | 'po' | 'warehouse';

const KPILogPage: React.FC<KPILogPageProps> = ({ entries, onUploadClick }) => {
    const [filters, setFilters] = useState({
        poSearch: '', vesselSearch: '', status: '',
        arrivalStart: '', arrivalEnd: ''
    });
    const [analysisView, setAnalysisView] = useState<AnalysisView>('vessel');
    const [showFilters, setShowFilters] = useState(false);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({ poSearch: '', vesselSearch: '', status: '', arrivalStart: '', arrivalEnd: '' });
    };
    
    const uniqueStatuses = useMemo(() => {
        const statusSet = new Set<string>();
        entries.forEach(e => { if(e.statusComex) statusSet.add(e.statusComex); });
        return Array.from(statusSet).sort((a,b) => String(a).localeCompare(String(b)));
    }, [entries]);

    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            const arrivalDate = parseDate(e.ata);
            
            return (String(e.poSap || '').toLowerCase().includes(filters.poSearch.toLowerCase())) &&
                   (String(e.arrivalVessel || '').toLowerCase().includes(filters.vesselSearch.toLowerCase())) &&
                   (filters.status === '' || e.statusComex === filters.status) &&
                   (filters.arrivalStart === '' || (arrivalDate && arrivalDate >= new Date(filters.arrivalStart + 'T00:00:00'))) &&
                   (filters.arrivalEnd === '' || (arrivalDate && arrivalDate <= new Date(filters.arrivalEnd + 'T23:59:59')));
        });
    }, [entries, filters]);

    const chartData = useMemo(() => {
        const groupKeyMap: Record<AnalysisView, keyof LogisticsEntry> = { vessel: 'arrivalVessel', po: 'poSap', warehouse: 'bondedWarehouse' };
        const groupKey = groupKeyMap[analysisView];
        const groupedData: Record<string, number> = {};
        filteredEntries.forEach(e => {
            const keyVal = e[groupKey];
            const key = (typeof keyVal === 'string' || typeof keyVal === 'number') ? String(keyVal) : 'N/A';
            groupedData[key] = (groupedData[key] || 0) + (e.quantity || 1);
        });
        const sortedGroupedData = Object.entries(groupedData).sort((a,b) => b[1] - a[1]).slice(0, 15);
        const mainBarChart = {
            labels: sortedGroupedData.map(item => item[0]),
            datasets: [{
                label: 'Total Containers',
                data: sortedGroupedData.map(item => item[1]),
                backgroundColor: '#0033A0',
            }]
        };

        const statusCounts: Record<string, number> = {};
        filteredEntries.forEach(e => {
            const status = e.statusComex || 'N/A';
            statusCounts[status] = (statusCounts[status] || 0) + (e.quantity || 1);
        });
        
        const colors = ['#6366f1', '#a855f7', '#d946ef', '#f59e0b', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b'];
        const statusLabels = Object.keys(statusCounts);

        const statusPieChart = {
            labels: statusLabels,
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: statusLabels.map((_, i) => colors[i % colors.length]),
            }],
        };

        const today = new Date(); today.setHours(0,0,0,0);
        const deadlineGroups: Record<string, number> = { 'Atrasado (<0)': 0, '0-7 Dias': 0, '8-15 Dias': 0, '16-30 Dias': 0, '31+ Dias': 0, 'Entregue': 0 };
        filteredEntries.forEach(e => {
            const qty = e.quantity || 1;
            if (e.deliveryDateAtByd) {
                deadlineGroups['Entregue'] += qty; return;
            }
            const deadline = parseDate(e.deadlineReturnCntr);
            if (deadline) {
                deadline.setHours(0,0,0,0);
                const diff = (deadline.getTime() - today.getTime()) / (1000 * 3600 * 24);
                if (diff < 0) deadlineGroups['Atrasado (<0)'] += qty;
                else if (diff <= 7) deadlineGroups['0-7 Dias'] += qty;
                else if (diff <= 15) deadlineGroups['8-15 Dias'] += qty;
                else if (diff <= 30) deadlineGroups['16-30 Dias'] += qty;
                else deadlineGroups['31+ Dias'] += qty;
            } else {
                 deadlineGroups['31+ Dias'] += qty;
            }
        });
        const deadlineBarChart = {
            labels: Object.keys(deadlineGroups),
            datasets: [{
                label: 'Nº de Contêineres',
                data: Object.values(deadlineGroups),
                backgroundColor: ['#e74c3c', '#f39c12', '#f1c40f', '#27ae60', '#2ecc71', '#3498db'],
            }]
        };

        return { mainBarChart, statusPieChart, deadlineBarChart };
    }, [filteredEntries, analysisView]);
    
    const analysisViewTitles: Record<AnalysisView, string> = {
        vessel: 'Total de Containers por Navio',
        po: 'Total de Containers por PO',
        warehouse: 'Total de Containers por Armazém',
    };
    
    const exportToExcel = useCallback(() => {
        if (filteredEntries.length === 0) return alert('No data to export.');
        const ws = XLSX.utils.json_to_sheet(filteredEntries);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        XLSX.writeFile(wb, 'kpi_log_report.xlsx');
    }, [filteredEntries]);

    const renderAnalysisTab = (view: AnalysisView, label: string, icon: React.ReactNode) => (
        <button onClick={() => setAnalysisView(view)} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${analysisView === view ? 'text-byd-blue' : 'text-gray-500 hover:text-byd-blue'}`}>
            {icon} {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md flex overflow-hidden">
                <div className="w-1/3 bg-byd-blue flex items-center justify-center p-6 text-white">
                    <div className="w-24 h-24">
                        <DeliveryTruckIcon />
                    </div>
                </div>
                <div className="w-2/3 p-6 flex flex-col justify-center">
                    <div className="flex items-center space-x-4">
                        {renderAnalysisTab('vessel', 'Análise por Navio', <LogisticsIcon />)}
                        {renderAnalysisTab('po', 'Análise por PO', <DocumentTextIcon />)}
                        {renderAnalysisTab('warehouse', 'Análise por Armazém', <BuildingOfficeIcon />)}
                    </div>
                </div>
            </div>

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
                        <input type="text" name="poSearch" value={filters.poSearch} onChange={handleFilterChange} placeholder="Pesquisar por PO..." className="p-2 border rounded-md text-sm"/>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Chegada:</label>
                            <input type="date" name="arrivalStart" value={filters.arrivalStart} onChange={handleFilterChange} className="p-2 border rounded-md text-sm w-full"/>
                            <span className="text-gray-500">-</span>
                            <input type="date" name="arrivalEnd" value={filters.arrivalEnd} onChange={handleFilterChange} className="p-2 border rounded-md text-sm w-full"/>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={resetFilters} className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300 text-sm"><ClearIcon /> Limpar</button>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md h-[28rem]">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{analysisViewTitles[analysisView]}</h3>
                    <ChartJS type="horizontalBar" data={chartData.mainBarChart} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true } }, plugins: { legend: { display: false }, datalabels: { color: 'white', anchor: 'center', align: 'center', font: { weight: 'bold' } } } }} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md h-[28rem]">
                         <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição de Status de Carga</h3>
                         <ChartJS type="doughnut" data={chartData.statusPieChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { color: 'white', font: { weight: 'bold' }, formatter: (value: number) => value } } }} />
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md h-[28rem]">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição de Prazos</h3>
                <ChartJS type="bar" data={chartData.deadlineBarChart} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false }, datalabels: { color: '#333', anchor: 'end', align: 'top', font: { weight: 'bold' } } } }}/>
            </div>

        </div>
    );
};

export default KPILogPage;