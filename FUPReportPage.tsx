
import React, { useMemo } from 'react';
import { LogisticsEntry, User } from '../types';
import { parseDate } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { AlertCircle, CalendarClock, PackageCheck, ShieldCheck, Truck, Warehouse, CheckCircle2, Factory } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface DashboardPageProps {
    entries: LogisticsEntry[];
    currentUser: User | null;
    onNavigate: (view: string, filter?: { type: string; value: string; }) => void;
}

const KPICard: React.FC<{ title: string; value: number | string; subtitle?: string; icon: React.ReactNode; color: string; onClick?: () => void }> = ({ title, value, subtitle, icon, color, onClick }) => (
    <div 
        onClick={onClick}
        className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group ${onClick ? 'cursor-pointer hover:shadow-md transition-all hover:-translate-y-1' : ''}`}
    >
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity group-hover:scale-110 duration-300" style={{ color }}>
            <div className="w-20 h-20">{icon}</div>
        </div>
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl text-white" style={{ backgroundColor: color }}>
                {icon}
            </div>
            <h3 className="font-semibold text-gray-500 uppercase tracking-widest text-xs">{title}</h3>
        </div>
        <div className="relative z-10">
            <span className="text-4xl font-black text-gray-900">{value}</span>
            {subtitle && <span className="ml-2 text-sm font-medium text-gray-400">{subtitle}</span>}
        </div>
    </div>
);

const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e', '#f97316'];
const PARAM_COLORS = { 'VERDE': '#22c55e', 'AMARELO': '#eab308', 'VERMELHO': '#ef4444', 'N/A': '#94a3b8' };

const DashboardPage: React.FC<DashboardPageProps> = ({ entries, onNavigate }) => {
    const { t } = useLanguage();

    const analytics = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        
        let deliveredCount = 0;
        let totalCount = 0;
        
        const riskCounts = { high: 0, medium: 0, low: 0, safe: 0 };
        const statusCounts: Record<string, number> = {};
        const warehouseCounts: Record<string, number> = {};
        const paramCounts: Record<string, number> = { 'VERDE': 0, 'AMARELO': 0, 'VERMELHO': 0, 'N/A': 0 };
        const demurrageDataMap: Record<string, number> = {};
        
        entries.forEach(e => {
            const qty = Number(e.quantity) || 1;
            totalCount += qty;
            
            // Delivered
            if (e.deliveryDateAtByd) {
                deliveredCount += qty;
            } else {
                // Free Time Analysis (Demurrage)
                const deadline = parseDate(e.deadlineReturnCntr);
                if (deadline) {
                    deadline.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 3600 * 24));
                    
                    if (diffDays < 0) riskCounts.high += qty;
                    else if (diffDays <= 7) riskCounts.medium += qty;
                    else if (diffDays <= 15) riskCounts.low += qty;
                    else riskCounts.safe += qty;

                    // Timeline data for demurrage
                    const monthKey = deadline.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
                    demurrageDataMap[monthKey] = (demurrageDataMap[monthKey] || 0) + qty;
                } else {
                    riskCounts.safe += qty;
                }
            }
            
            // Status distribution
            const status = e.deliveryDateAtByd ? 'ENTREGUE' : (e.statusComex || 'N/A');
            statusCounts[status] = (statusCounts[status] || 0) + qty;
            
            // Warehouses
            const warehouse = e.bondedWarehouse || 'N/A';
            warehouseCounts[warehouse] = (warehouseCounts[warehouse] || 0) + qty;
            
            // Parametrization
            const param = String(e.parametrization || '').toUpperCase().trim();
            if (param.includes('VERDE')) paramCounts['VERDE'] += qty;
            else if (param.includes('AMARELO')) paramCounts['AMARELO'] += qty;
            else if (param.includes('VERMELHO')) paramCounts['VERMELHO'] += qty;
            else paramCounts['N/A'] += qty;
        });
        
        const sortedStatuses = Object.entries(statusCounts)
            .sort((a,b) => b[1] - a[1])
            .map(([name, value]) => ({ name, value }));
            
        const sortedWarehouses = Object.entries(warehouseCounts)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, value]) => ({ name, value }));

        const paramChartData = Object.entries(paramCounts)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name, value }));
            
        const demurrageData = Object.entries(demurrageDataMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a,b) => {
                const partsA = a.name.split(' de ');
                const partsB = b.name.split(' de ');
                if(partsA.length < 2 || partsB.length < 2) return 0;
                return new Date(Number(partsA[1]), 0).getTime() - new Date(Number(partsB[1]), 0).getTime();
            });

        return {
            totalCount,
            deliveredCount,
            riskCounts,
            sortedStatuses,
            sortedWarehouses,
            paramChartData,
            demurrageData
        };
    }, [entries]);

    return (
        <div className="space-y-8 pb-10">
            <header className="flex flex-col gap-2">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('dashboard')}</h1>
                <p className="text-gray-500 font-medium">{t('dashboardSubtitle')}</p>
            </header>

            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard 
                    title={t('containersDelivered')} 
                    value={analytics.deliveredCount} 
                    subtitle={`${t('of')} ${analytics.totalCount}`}
                    icon={<CheckCircle2 size={32} />} 
                    color="#0ea5e9" 
                    onClick={() => onNavigate('logistics')}
                />
                <KPICard 
                    title={t('containersInTransit')} 
                    value={analytics.totalCount - analytics.deliveredCount} 
                    icon={<Truck size={32} />} 
                    color="#8b5cf6" 
                    onClick={() => onNavigate('logistics')}
                />
                <KPICard 
                    title={t('demurrageRisk')} 
                    value={analytics.riskCounts.high} 
                    subtitle={t('containers')}
                    icon={<AlertCircle size={32} />} 
                    color="#ef4444" 
                    onClick={() => onNavigate('logistics')}
                />
                <KPICard 
                    title={t('activeWarehouses')} 
                    value={analytics.sortedWarehouses.filter(w => w.name !== 'N/A').length} 
                    icon={<Factory size={32} />} 
                    color="#f59e0b" 
                />
            </div>

            {/* Graphics Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Status of Operation */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><PackageCheck size={24} /></div>
                        <h2 className="text-xl font-bold text-gray-800">{t('statusOfOperations')}</h2>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.sortedStatuses} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" textAnchor="end" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} />
                                <RechartsTooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                                    {analytics.sortedStatuses.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Parametrization */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ShieldCheck size={24} /></div>
                        <h2 className="text-xl font-bold text-gray-800">{t('parametrization')}</h2>
                    </div>
                    <div className="flex-1 flex items-center justify-center min-h-[300px] relative">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={analytics.paramChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {analytics.paramChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PARAM_COLORS[entry.name as keyof typeof PARAM_COLORS] || '#cbd5e1'} />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none mt-[-36px]">
                            <span className="text-3xl font-black text-gray-800">{analytics.totalCount}</span>
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t('total')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Demurrage Risk Timeline */}
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><CalendarClock size={24} /></div>
                        <h2 className="text-xl font-bold text-gray-800">{t('demurrageTimeline')}</h2>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={analytics.demurrageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorDemurrage" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="value" name="Containers Vencendo" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorDemurrage)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Top Warehouses */}
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Warehouse size={24} /></div>
                        <h2 className="text-xl font-bold text-gray-800">{t('topWarehouses')}</h2>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.sortedWarehouses} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={60} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                                <RechartsTooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" name="Quantidade" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
            </div>
            
        </div>
    );
};

export default DashboardPage;

