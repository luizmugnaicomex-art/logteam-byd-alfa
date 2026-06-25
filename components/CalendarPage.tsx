
import React, { useState, useMemo, useEffect } from 'react';
import { LogisticsEntry } from '../types';
import { ExpandIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, Loader2Icon } from './common/Icons';

// Helper to group entries by BL and sum quantities
const groupEntriesByBL = (entries: LogisticsEntry[]) => {
    const grouped = new Map<string, any>();
    entries.forEach(e => {
        const key = e.bl || 'N/A';
        if (!grouped.has(key)) {
            grouped.set(key, {
                ...e,
                summedQty: Number(e.quantity || 1),
                isGroupDelivered: !!e.deliveryDateAtByd
            });
        } else {
            const existing = grouped.get(key);
            existing.summedQty = (Number(existing.summedQty) || 0) + Number(e.quantity || 1);
            if (e.deliveryDateAtByd) existing.isGroupDelivered = true;
        }
    });
    return Array.from(grouped.values());
};

const DayDetailModal: React.FC<{ day: { date: Date, entries: LogisticsEntry[] }, onClose: () => void }> = ({ day, onClose }) => {
    const groupedData = useMemo(() => groupEntriesByBL(day.entries), [day.entries]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col animate-scale-in overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center bg-gray-50/80 backdrop-blur">
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight capitalize">
                        {day.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"><CloseIcon /></button>
                </div>
                <div className="flex-grow p-6 overflow-auto bg-gray-50/30">
                    {groupedData.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-medium uppercase text-xs tracking-wider">
                                        <th className="p-4">HBL</th>
                                        <th className="p-4">LOT</th>
                                        <th className="p-4">B.Warehouse</th>
                                        <th className="p-4">Vessel</th>
                                        <th className="p-4">FT</th>
                                        <th className="p-4 text-center">QTY</th>
                                        <th className="p-4">Release</th>
                                        <th className="p-4">Truck</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {groupedData.map((group, idx) => (
                                        <tr key={idx} className={`hover:bg-gray-50 transition-colors ${group.isGroupDelivered ? 'bg-green-50/50' : ''}`}>
                                            <td className="p-4 font-semibold text-gray-900">{group.bl}</td>
                                            <td className="p-4 text-gray-600">{group.batch}</td>
                                            <td className="p-4 text-gray-600">{group.bondedWarehouse}</td>
                                            <td className="p-4 text-gray-600">{group.arrivalVessel}</td>
                                            <td className="p-4 text-gray-600">
                                                {group.deadlineReturnCntr 
                                                    ? new Date(group.deadlineReturnCntr + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                                                    : ''}
                                            </td>
                                            <td className="p-4 text-center font-black text-byd-blue text-base">{group.summedQty}</td>
                                            <td className="p-4 text-gray-600">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${group.dsa ? 'bg-blue-50 text-byd-blue' : 'bg-gray-100 text-gray-500'}`}>
                                                    {group.dsa || 'NO'}
                                                </span>
                                            </td>
                                            <td className="p-4 font-medium text-gray-700">{group.carrier}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : ( 
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                                <span className="text-2xl">📅</span>
                            </div>
                            <span className="font-medium text-lg">Nenhuma entrega agendada</span>
                        </div> 
                    )}
                </div>
                <div className="bg-white p-6 flex justify-end items-center gap-4 border-t border-gray-100">
                    <span className="text-gray-500 font-medium uppercase tracking-wider text-sm">Total Containers</span>
                    <span className="font-black text-4xl text-gray-900 bg-gray-50 px-6 py-2 rounded-xl">
                        {day.entries.reduce((sum, entry) => Number(sum) + (Number(entry.quantity) || 1), 0)}
                    </span>
                </div>
            </div>
        </div>
    );
};

interface CalendarPageProps {
    entries: LogisticsEntry[];
    isLoading: boolean;
    onMonthChange: (startDate: string, endDate: string) => void;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ entries, isLoading, onMonthChange }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
    const [maximizedDay, setMaximizedDay] = useState<{ date: Date, entries: LogisticsEntry[] } | null>(null);

     useEffect(() => {
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
        onMonthChange(start, end);
    }, [currentDate, onMonthChange]);

    const goToPreviousMonth = () => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)); setSelectedWeekIndex(null); };
    const goToNextMonth = () => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)); setSelectedWeekIndex(null); };

    const { weeks, monthName, year } = useMemo(() => {
        const d = new Date(currentDate); const month = d.getMonth(); const year = d.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dayOfWeek = new Date(year, month, 1).getDay();
        const firstDayOfMonth = (dayOfWeek + 6) % 7; 
        let allDays: { date: Date | null; entries: LogisticsEntry[] }[] = Array(firstDayOfMonth).fill({ date: null, entries: [] });
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(Date.UTC(year, month, day));
            const dateString = date.toISOString().split('T')[0];
            allDays.push({ date, entries: entries.filter(e => e.estimatedDeliveryDate === dateString) });
        }
        while (allDays.length % 7 !== 0) allDays.push({ date: null, entries: [] });
        const weeks = []; for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));
        const monthName = d.toLocaleString('pt-BR', { month: 'long' });
        return { weeks, monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1), year };
    }, [currentDate, entries]);

    const WeeklySummary: React.FC<{ week: { entries: LogisticsEntry[] }[], onClick: () => void, isClickable: boolean }> = ({ week, onClick, isClickable }) => {
        const weeklyTotal = week.flatMap(d => d.entries).reduce((sum, e) => Number(sum) + (Number(e.quantity) || 1), 0);
        
        if (weeklyTotal === 0) return isClickable ? null : <div className="h-6"></div>;
        
        const carrierCounts = week.flatMap(d => d.entries).reduce((acc: Record<string, number>, e: LogisticsEntry) => {
            const carrierKey = e.carrier || 'N/A';
            acc[carrierKey] = (Number(acc[carrierKey]) || 0) + (Number(e.quantity) || 1);
            return acc;
        }, {});

        return (
            <div 
                onClick={isClickable ? onClick : undefined}
                className={`mt-4 grid grid-cols-1 md:grid-cols-12 gap-y-4 md:gap-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 transition-all ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-gray-300' : ''}`}
            >
                {/* Left: Summary */}
                <div className="md:col-span-3 flex flex-col items-center justify-center md:border-r border-gray-100 pr-0 md:pr-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total da Semana</span>
                    <span className="text-5xl font-black text-byd-blue">{weeklyTotal}</span>
                </div>
                
                {/* Middle: Daily breakdown */}
                <div className="md:col-span-5 flex items-center justify-between px-2 md:px-4 md:border-r border-gray-100">
                    {week.map((day, idx) => {
                        const dailyTotal = day.entries.reduce((sum, e) => Number(sum) + (Number(e.quantity) || 1), 0);
                        const dayName = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][idx];
                        return (
                            <div key={idx} className="flex flex-col items-center">
                                <span className="text-[10px] text-gray-400 font-bold uppercase mb-2">{dayName}</span>
                                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${dailyTotal > 0 ? 'bg-blue-50 text-byd-blue' : 'text-gray-300'}`}>
                                    {dailyTotal}
                                </span>
                            </div>
                        );
                    })}
                </div>
                
                {/* Right: Carriers */}
                <div className="md:col-span-4 flex flex-col justify-center gap-2 pl-0 md:pl-4">
                    {Object.entries(carrierCounts).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 4).map(([c, n]) => (
                        <div key={c} className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-600 uppercase truncate pr-2 w-24">{c}</span>
                            <div className="flex items-center gap-3 flex-1">
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                     <div className="bg-byd-blue h-full rounded-full" style={{ width: `${(Number(n)/Number(weeklyTotal))*100}%` }}></div>
                                </div>
                                <span className="w-8 text-right font-bold text-gray-800">{n}</span>
                            </div>
                        </div>
                    ))}
                    {Object.keys(carrierCounts).length > 4 && (
                        <span className="text-[10px] text-gray-400 font-medium text-right mt-1">+ {Object.keys(carrierCounts).length - 4} outros</span>
                    )}
                </div>
            </div>
        );
    };

    const DayCell: React.FC<{ day: { date: Date | null, entries: LogisticsEntry[] }, heightClass: string }> = ({ day, heightClass }) => {
        if (!day.date) return <div className={`bg-gray-50/30 border-r border-b border-gray-100 last:border-r-0 ${heightClass}`}></div>;
        
        const groupedData = useMemo(() => groupEntriesByBL(day.entries), [day.entries]);
        const dayTotal = groupedData.reduce((sum, g) => sum + g.summedQty, 0);

        return (
            <div className={`border-r border-b border-gray-200 last:border-r-0 flex flex-col ${heightClass} bg-white overflow-hidden group hover:bg-gray-50/50 transition-colors`}>
                {/* Day Header */}
                <div className="p-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${dayTotal > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                            {day.date.getDate()}
                        </span>
                        {dayTotal > 0 && (
                            <span className="bg-blue-100 text-byd-blue text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {dayTotal} un
                            </span>
                        )}
                    </div>
                    {groupedData.length > 0 && (
                        <button 
                            onClick={() => setMaximizedDay(day)} 
                            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-200 text-gray-500 hover:text-gray-900"
                            title="Expandir dia"
                        >
                            <ExpandIcon />
                        </button>
                    )}
                </div>
                
                {/* Minimalist Cards Data */}
                <div className="flex-grow overflow-y-auto px-2 pb-2 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-200">
                    {groupedData.slice(0, 5).map((group, idx) => (
                        <div key={idx} className={`p-2 rounded-lg border text-xs shadow-sm flex flex-col gap-1 transition-all hover:shadow-md ${group.isGroupDelivered ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                            <div className="flex justify-between items-start gap-2">
                                <span className={`font-semibold truncate ${group.isGroupDelivered ? 'text-green-900' : 'text-gray-800'}`} title={group.bl}>{group.bl}</span>
                                <span className={`font-black shrink-0 ${group.isGroupDelivered ? 'text-green-700' : 'text-byd-blue'}`}>{group.summedQty}</span>
                            </div>
                            <div className="flex justify-between items-center mt-0.5">
                                <span className="text-[10px] font-medium uppercase text-gray-500 truncate pr-2">
                                    {group.carrier || 'N/A'} • <span className="text-gray-400 font-normal">{group.arrivalVessel?.slice(0,10)}</span>
                                </span>
                                {group.deadlineReturnCntr && (
                                    <span className="text-[9px] text-gray-400 whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded">
                                        FT {group.deadlineReturnCntr.split('-')[2]}/{group.deadlineReturnCntr.split('-')[1].slice(0,3)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {groupedData.length > 5 && (
                        <div className="text-center py-2 text-xs font-semibold text-gray-400 bg-gray-50 rounded-lg border border-gray-100 border-dashed cursor-pointer hover:bg-gray-100" onClick={() => setMaximizedDay(day)}>
                            + {groupedData.length - 5} outras entregas
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const heightClass = selectedWeekIndex !== null ? "h-[500px]" : "h-[180px] lg:h-[220px]";

    return (
        <div className="flex flex-col gap-6 max-w-full pb-10">
            <div className="w-full relative">
                {isLoading && <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl"><Loader2Icon /></div>}
                
                <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-6 gap-4">
                    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm">
                        <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors group"><div className="group-hover:-translate-x-0.5 transition-transform"><ChevronLeftIcon /></div></button>
                        <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter w-48 text-center truncate">
                            {monthName} {year}
                        </h2>
                        <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors group"><div className="group-hover:translate-x-0.5 transition-transform"><ChevronRightIcon /></div></button>
                    </div>
                    {selectedWeekIndex !== null && (
                        <button onClick={() => setSelectedWeekIndex(null)} className="px-6 py-2.5 bg-byd-blue text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all uppercase text-sm flex items-center gap-2">
                             Voltar visão mensal
                        </button>
                    )}
                </div>

                <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Weekdays Header */}
                    <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                            <div key={d} className="py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100 last:border-r-0">
                                {d}
                            </div>
                        ))}
                    </div>

                    {selectedWeekIndex === null ? (
                        <div className="flex flex-col">
                            {weeks.map((week, index) => (
                                <div key={index} className="flex flex-col border-b border-gray-200 last:border-b-0">
                                    <div className="grid grid-cols-7">
                                        {week.map((day, dayIndex) => (
                                            <DayCell key={dayIndex} day={day} heightClass={heightClass}/>
                                        ))}
                                    </div>
                                    <div className="px-4 pb-4 bg-gray-50/30">
                                        <WeeklySummary week={week} onClick={() => setSelectedWeekIndex(index)} isClickable={true} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        weeks[selectedWeekIndex] && (
                            <div className="flex flex-col">
                                <div className="grid grid-cols-7">
                                    {weeks[selectedWeekIndex].map((day, dayIndex) => (
                                        <DayCell key={dayIndex} day={day} heightClass="h-[70vh]"/>
                                    ))}
                                </div>
                                <div className="p-6 bg-gray-50/50 border-t border-gray-200">
                                    <WeeklySummary week={weeks[selectedWeekIndex]} onClick={() => {}} isClickable={false} />
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
            {maximizedDay && <DayDetailModal day={maximizedDay} onClose={() => setMaximizedDay(null)} />}
        </div>
    );
};

export default CalendarPage;

