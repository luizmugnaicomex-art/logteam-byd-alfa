
import React, { useMemo } from 'react';
import { LogisticsEntry, User } from '../types';
import { parseDate } from '../utils/helpers';
import { AlertTriangleIcon, HourglassIcon, CalendarCheckIcon, ShieldIcon, ArchiveBoxIcon } from './common/Icons';

interface DashboardPageProps {
    entries: LogisticsEntry[];
    currentUser: User | null;
    onNavigate: (view: string, filter?: { type: string; value: string; }) => void;
}

const KPICard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string; onClick?: () => void }> = ({ title, value, icon, color, onClick }) => (
    <div 
        onClick={onClick}
        className={`bg-white p-4 rounded-lg shadow-sm flex items-center border-l-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} 
        style={{ borderColor: color }}
    >
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full" style={{ backgroundColor: `${color}1A`, color: color }}>
            {icon}
        </div>
        <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const StatusCard: React.FC<{ status: string; count: number; onClick: () => void; color: string }> = ({ status, count, onClick, color }) => (
    <button 
        onClick={onClick}
        className="bg-white p-6 rounded-xl shadow-sm border-t-4 transition-all hover:shadow-md hover:scale-[1.02] text-left group"
        style={{ borderTopColor: color }}
    >
        <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{status}</p>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors">
                <div className="text-gray-400 scale-75">
                    <ArchiveBoxIcon />
                </div>
            </div>
        </div>
        <p className="text-4xl font-black text-gray-900 mb-4">{count}</p>
        <div className="flex items-center text-xs font-semibold text-byd-blue group-hover:translate-x-1 transition-transform">
            <span>PLANEJAR ENTRADAS</span>
            <span className="ml-2">→</span>
        </div>
    </button>
);

const DashboardPage: React.FC<DashboardPageProps> = ({ entries, onNavigate }) => {

    const analytics = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const riskCounts = { high: 0, medium: 0, low: 0, safe: 0, delivered: 0 };
        const deadlineGroups: Record<string, number> = { 'Atrasado (<0)': 0, '0-7 Dias': 0, '8-15 Dias': 0, '16-30 Dias': 0, '31+ Dias': 0, 'Entregue': 0 };

        const statusCounts: Record<string, number> = {};
        const vesselCounts: Record<string, number> = {};
        const damageStatusCounts: { SIM: number; PENDENTE: number } = { SIM: 0, PENDENTE: 0 };
        const totalContainers = entries.reduce((sum, e) => sum + (e.quantity || 1), 0);
        
        entries.forEach(e => {
            const qty = e.quantity || 1;
            
            // If a delivery date exists, the status is 'CARGO DELIVERED' for this chart,
            // regardless of the `statusComex` field. This ensures accuracy.
            const status = e.deliveryDateAtByd ? 'CARGO DELIVERED' : (e.statusComex || 'N/A');
            statusCounts[status] = (statusCounts[status] || 0) + qty;
            
            const vessel = e.arrivalVessel || 'N/A';
            vesselCounts[vessel] = (vesselCounts[vessel] || 0) + qty;
            
            if (String(e.damageStatus).toUpperCase() === 'Y' || String(e.damageStatus).toUpperCase() === 'YES') {
                damageStatusCounts.SIM += qty;
            } else {
                damageStatusCounts.PENDENTE += qty;
            }
            
            if (e.deliveryDateAtByd) {
                riskCounts.delivered += qty;
                deadlineGroups['Entregue'] += qty;
            } else {
                const deadline = parseDate(e.deadlineReturnCntr);
                if (deadline) {
                    deadline.setHours(0, 0, 0, 0);
                    const diffDays = (deadline.getTime() - today.getTime()) / (1000 * 3600 * 24);
                    if (diffDays <= 7) riskCounts.high += qty;
                    else if (diffDays <= 15) riskCounts.medium += qty;
                    else if (diffDays <= 30) riskCounts.low += qty;
                    else riskCounts.safe += qty;
                    
                    if (diffDays < 0) deadlineGroups['Atrasado (<0)'] += qty;
                    else if (diffDays <= 7) deadlineGroups['0-7 Dias'] += qty;
                    else if (diffDays <= 15) deadlineGroups['8-15 Dias'] += qty;
                    else if (diffDays <= 30) deadlineGroups['16-30 Dias'] += qty;
                    else deadlineGroups['31+ Dias'] += qty;
                } else {
                    riskCounts.safe += qty;
                    deadlineGroups['31+ Dias'] += qty;
                }
            }
        });
        
        const sortedVessels = Object.entries(vesselCounts).sort((a,b) => b[1] - a[1]).slice(0, 10);
        const sortedStatuses = Object.entries(statusCounts).sort((a,b) => b[1] - a[1]);

        return {
            totalContainers, riskCounts,
            sortedStatuses,
            comexStatusChart: {
                labels: sortedStatuses.map(s => s[0]),
                datasets: [{ data: sortedStatuses.map(s => s[1]), backgroundColor: ['#2ecc71', '#f39c12', '#e67e22', '#3498db', '#1abc9c', '#95a5a6'] }]
            },
            vesselChart: {
                labels: sortedVessels.map(v => v[0]),
                datasets: [{ label: 'Total de Containers', data: sortedVessels.map(v => v[1]), backgroundColor: '#0033A0' }]
            },
            damageChart: {
                labels: ['PENDENTE', 'SIM'],
                datasets: [{ data: [damageStatusCounts.PENDENTE, damageStatusCounts.SIM], backgroundColor: ['#8b5cf6', '#3b82f6'] }]
            },
            deadlineChart: {
                labels: Object.keys(deadlineGroups),
                datasets: [{ label: 'Nº de Contêineres', data: Object.values(deadlineGroups), backgroundColor: ['#e74c3c', '#f39c12', '#f1c40f', '#27ae60', '#2ecc71', '#3498db']}]
            }
        };
    }, [entries]);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Logistics Dashboard</h1>
                <p className="text-sm text-gray-500">Exibindo dados em tempo real dos últimos 90 dias.</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                 <KPICard title="ALTO RISCO (≤ 7D)" value={analytics.riskCounts.high} icon={<AlertTriangleIcon />} color="#ef4444" />
                 <KPICard title="MÉDIO RISCO (8-15D)" value={analytics.riskCounts.medium} icon={<HourglassIcon />} color="#f59e0b" />
                 <KPICard title="BAIXO RISCO (16-30D)" value={analytics.riskCounts.low} icon={<CalendarCheckIcon />} color="#22c55e" />
                 <KPICard title="SEGURO (>30D)" value={analytics.riskCounts.safe} icon={<ShieldIcon />} color="#16a34a" />
                 <KPICard title="ENTREGUE" value={analytics.riskCounts.delivered} icon={<ArchiveBoxIcon />} color="#6b7280" />
            </div>

            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Status das Operações</h2>
                    <span className="px-3 py-1 bg-blue-50 text-byd-blue text-xs font-bold rounded-full">CLIQUE PARA FILTRAR</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {analytics.sortedStatuses.map(([status, count], index) => (
                        <StatusCard 
                            key={status}
                            status={status}
                            count={count}
                            color={['#2ecc71', '#f39c12', '#e67e22', '#3498db', '#1abc9c', '#95a5a6'][index % 6]}
                            onClick={() => onNavigate('logistics', { type: 'statusFilter', value: status })}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
};

export default DashboardPage;
