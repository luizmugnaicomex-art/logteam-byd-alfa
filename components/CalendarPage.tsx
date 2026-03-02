
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-semibold text-gray-800 uppercase tracking-tight">
                        {day.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button>
                </div>
                <div className="flex-grow p-4 overflow-auto">
                    {groupedData.length > 0 ? (
                        <table className="w-full text-xs border-collapse border border-gray-400">
                            <thead>
                                <tr className="bg-[#f8cbad] text-black">
                                    <th className="p-2 border border-gray-400">HBL</th>
                                    <th className="p-2 border border-gray-400">LOT</th>
                                    <th className="p-2 border border-gray-400">B.WARE.</th>
                                    <th className="p-2 border border-gray-400">VESSEL</th>
                                    <th className="p-2 border border-gray-400">FT</th>
                                    <th className="p-2 border border-gray-400 text-center">QTY</th>
                                    <th className="p-2 border border-gray-400">RELEASE</th>
                                    <th className="p-2 border border-gray-400">TRUCK</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedData.map((group, idx) => (
                                    <tr key={idx} className={`hover:bg-gray-50 ${group.isGroupDelivered ? 'bg-green-50' : ''}`}>
                                        <td className="p-2 border border-gray-300 font-bold">{group.bl}</td>
                                        <td className="p-2 border border-gray-300">{group.batch}</td>
                                        <td className="p-2 border border-gray-300">{group.bondedWarehouse}</td>
                                        <td className="p-2 border border-gray-300">{group.arrivalVessel}</td>
                                        <td className="p-2 border border-gray-300 text-center">
                                            {group.deadlineReturnCntr 
                                                ? new Date(group.deadlineReturnCntr + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') 
                                                : ''}
                                        </td>
                                        <td className="p-2 border border-gray-300 text-center font-bold text-byd-blue">{group.summedQty}</td>
                                        <td className="p-2 border border-gray-300 text-center">{group.dsa || 'NO'}</td>
                                        <td className="p-2 border border-gray-300">{group.carrier}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : ( 
                        <div className="flex items-center justify-center h-full text-gray-500 font-medium italic">Nenhuma entrega agendada.</div> 
                    )}
                </div>
                <div className="bg-gray-100 p-4 flex justify-end font-bold text-2xl border-t border-gray-300">
                    {/* Fix: Explicitly cast operands to number for arithmetic operations to avoid TS errors. */}
                    TOTAL CONTAINERS: {day.entries.reduce((sum, entry) => Number(sum) + (Number(entry.quantity) || 1), 0)}
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
        // Fix: Explicitly cast operands to number for arithmetic operations to avoid TS errors.
        const weeklyTotal = week.flatMap(d => d.entries).reduce((sum, e) => Number(sum) + (Number(e.quantity) || 1), 0);
        
        // Row of daily totals just above the yellow block
        const dailyTotalsRow = (
            <div className="grid grid-cols-7 border-t border-black bg-white">
                {week.map((day, idx) => {
                    // Fix: Explicitly cast operands to number for arithmetic operations to avoid TS errors.
                    const dailyTotal = day.entries.reduce((sum, e) => Number(sum) + (Number(e.quantity) || 1), 0);
                    return (
                        <div key={idx} className="flex justify-between p-1 text-[10px] font-bold border-r border-gray-300">
                            <span>TOTAL</span>
                            <span>{dailyTotal}</span>
                        </div>
                    );
                })}
            </div>
        );

        if (weeklyTotal === 0) return isClickable ? null : <div className="mt-2">{dailyTotalsRow}</div>;
        
        const carrierCounts = week.flatMap(d => d.entries).reduce((acc: Record<string, number>, e: LogisticsEntry) => {
            const carrierKey = e.carrier || 'N/A';
            // Fix: Explicitly cast operands to number for arithmetic operations to avoid TS errors.
            acc[carrierKey] = (Number(acc[carrierKey]) || 0) + (Number(e.quantity) || 1);
            return acc;
        }, {});

        return (
            <div className="mt-1">
                {dailyTotalsRow}
                
                <div 
                    onClick={isClickable ? onClick : undefined} 
                    className={`mt-1 border-2 border-black bg-[#ffff00] flex text-sm overflow-hidden min-h-[140px] ${isClickable ? 'cursor-pointer hover:bg-[#ffff88]' : ''}`}
                >
                    {/* Left: TOTAL SEMANA label */}
                    <div className="w-[20%] p-4 border-r border-black flex items-center justify-center font-bold text-center text-lg leading-tight">
                        TOTAL SEMANA
                    </div>
                    
                    {/* Middle: Big Sum Number */}
                    <div className="w-[25%] p-4 border-r border-black flex items-center justify-center text-6xl font-black text-black">
                        {weeklyTotal}
                    </div>

                    {/* Right: Carriers List */}
                    <div className="flex-1 p-3 flex flex-col justify-center space-y-1">
                        {Object.entries(carrierCounts).sort(([, a], [, b]) => b - a).map(([c, n]) => (
                            <div key={c} className="flex items-center justify-between text-xs font-bold px-2">
                                <span className="uppercase truncate pr-4">{c}</span>
                                <div className="flex items-center gap-4 min-w-[100px] justify-end">
                                    <span className="w-10 text-right">{n}</span>
                                    {/* Fix: Explicitly cast operands to number for arithmetic operations to avoid TS errors. */}
                                    <span className="w-12 text-right border-l border-black pl-2">{((Number(n) / Number(weeklyTotal)) * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const DayCell: React.FC<{ day: { date: Date | null, entries: LogisticsEntry[] }, heightClass: string }> = ({ day, heightClass }) => {
        if (!day.date) return <div className={`border border-gray-300 bg-gray-50 ${heightClass}`}></div>;
        
        const groupedData = useMemo(() => groupEntriesByBL(day.entries), [day.entries]);

        return (
            <div className={`border border-gray-400 flex flex-col ${heightClass} bg-white overflow-hidden`}>
                {/* Day Header - Peach background as per screenshot */}
                <div className="bg-[#f8cbad] text-center font-bold text-[10px] p-0.5 border-b border-black flex justify-between items-center px-1">
                    <span className="flex-grow">{day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).replace('.', '')}</span>
                    <button onClick={() => setMaximizedDay(day)} className="p-0.5 rounded-full hover:bg-orange-300"><ExpandIcon /></button>
                </div>
                
                {/* Excel Style Data Grid - High Density */}
                <div className="flex-grow overflow-y-auto text-[8px] leading-[1.1] font-sans">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-white border-b border-black text-center font-bold uppercase">
                            <tr className="bg-gray-200">
                                <th className="border-r border-black w-[18%] px-0.5">HBL</th>
                                <th className="border-r border-black w-[10%] px-0.5">LOT</th>
                                <th className="border-r border-black w-[12%] px-0.5">B.W.</th>
                                <th className="border-r border-black w-[15%] px-0.5">VESSEL</th>
                                <th className="border-r border-black w-[10%] px-0.5">FT</th>
                                <th className="border-r border-black w-[8%] px-0.5">QTY</th>
                                <th className="border-r border-black w-[12%] px-0.5">REL.</th>
                                <th className="px-0.5">TRK</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedData.map((group, idx) => (
                                <tr key={idx} className={`border-b border-gray-300 h-[14px] ${group.isGroupDelivered ? 'bg-green-100' : ''}`}>
                                    <td className="px-0.5 border-r border-gray-300 truncate font-semibold">{group.bl}</td>
                                    <td className="px-0.5 border-r border-gray-300 text-center truncate">{group.batch}</td>
                                    <td className="px-0.5 border-r border-gray-300 truncate">{group.bondedWarehouse?.slice(0, 5)}</td>
                                    <td className="px-0.5 border-r border-gray-300 truncate uppercase">{group.arrivalVessel?.slice(0, 8)}</td>
                                    <td className="px-0.5 border-r border-gray-300 text-center whitespace-nowrap">
                                        {group.deadlineReturnCntr ? group.deadlineReturnCntr.split('-')[2] + '/' + group.deadlineReturnCntr.split('-')[1].slice(0,3) : ''}
                                    </td>
                                    <td className="px-0.5 border-r border-gray-300 text-center font-black">{group.summedQty}</td>
                                    <td className="px-0.5 border-r border-gray-300 text-center truncate">{group.dsa || 'NO'}</td>
                                    <td className="px-0.5 truncate uppercase">{group.carrier?.slice(0, 5)}</td>
                                </tr>
                            ))}
                            {/* Empty rows to maintain Excel structure look */}
                            {/* Fix: Explicitly cast operands to number for arithmetic operations to avoid TS errors on line 172. */}
                            {Array.from({ length: Math.max(0, 15 - Number(groupedData.length)) }).map((_, i) => (
                                <tr key={`empty-${i}`} className="border-b border-gray-100 h-[13px] bg-white">
                                    <td className="border-r border-gray-100"></td><td className="border-r border-gray-100"></td><td className="border-r border-gray-100"></td><td className="border-r border-gray-100"></td><td className="border-r border-gray-100"></td><td className="border-r border-gray-100"></td><td className="border-r border-gray-100"></td><td></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Adjusted heights for desktop view to avoid too much vertical empty space while showing rows
    const heightClass = selectedWeekIndex !== null ? "h-[500px]" : "h-[320px]";
    const getWeekStartDate = (week: {date: Date | null}[]) => week.find(d => d.date)?.date?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }) ?? '';

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white p-4 rounded-lg shadow-lg relative border border-gray-300 min-w-[1200px]">
                {isLoading && <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10"><Loader2Icon /></div>}
                
                <div className="flex justify-between items-center mb-4 px-2">
                    <div className="flex items-center gap-6">
                        <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-100 border transition-colors"><ChevronLeftIcon /></button>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                            {selectedWeekIndex !== null && weeks[selectedWeekIndex] ? `Semana de ${getWeekStartDate(weeks[selectedWeekIndex])}` : `${monthName} ${year}`}
                        </h2>
                        <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-100 border transition-colors"><ChevronRightIcon /></button>
                    </div>
                    {selectedWeekIndex !== null && (
                        <button onClick={() => setSelectedWeekIndex(null)} className="px-6 py-2 bg-byd-blue text-white font-black rounded shadow-lg hover:scale-105 transition-transform uppercase text-sm">
                            Voltar visão mensal
                        </button>
                    )}
                </div>

                <div className="w-full">
                    {selectedWeekIndex === null ? (
                        weeks.map((week, index) => (
                            <div key={index} className="mb-6 last:mb-0">
                                <div className="grid grid-cols-7 border-l border-t border-black">
                                    {week.map((day, dayIndex) => (
                                        <DayCell key={dayIndex} day={day} heightClass={heightClass}/>
                                    ))}
                                </div>
                                <WeeklySummary week={week} onClick={() => setSelectedWeekIndex(index)} isClickable={true} />
                            </div>
                        ))
                    ) : (
                        weeks[selectedWeekIndex] && (
                            <div>
                                <div className="grid grid-cols-7 border-l border-t border-black">
                                    {weeks[selectedWeekIndex].map((day, dayIndex) => (
                                        <DayCell key={dayIndex} day={day} heightClass={heightClass}/>
                                    ))}
                                </div>
                                <WeeklySummary week={weeks[selectedWeekIndex]} onClick={() => {}} isClickable={false} />
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
