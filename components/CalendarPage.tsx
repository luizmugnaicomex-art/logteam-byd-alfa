import React, { useState, useMemo } from 'react';
import { LogisticsEntry } from '../types';
import { ExpandIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon } from './common/Icons';

const DayDetailModal: React.FC<{ day: { date: Date, entries: LogisticsEntry[] }, onClose: () => void }> = ({ day, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-800">
                        {day.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button>
                </div>
                <div className="flex-grow p-2 overflow-y-auto">
                    {day.entries.length > 0 ? (
                        <table className="w-full text-base">
                            <thead className="sticky top-0 bg-gray-100">
                                <tr className="text-left">
                                    <th className="p-2 font-semibold border-b">HBL</th>
                                    <th className="p-2 font-semibold border-b">LOT</th>
                                    <th className="p-2 font-semibold border-b">B.WARE</th>
                                    <th className="p-2 font-semibold border-b">VESSEL</th>
                                    <th className="p-2 font-semibold border-b">FT</th>
                                    <th className="p-2 font-semibold border-b text-center">QTY</th>
                                    <th className="p-2 font-semibold border-b">TRUCK</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {day.entries.map(entry => (
                                    <tr key={entry.id} className={`${entry.deliveryDateAtByd ? 'bg-green-50' : ''}`}>
                                        <td className="p-2">{entry.bl}</td>
                                        <td className="p-2">{entry.batch}</td>
                                        <td className="p-2">{entry.bondedWarehouse}</td>
                                        <td className="p-2">{entry.arrivalVessel}</td>
                                        <td className="p-2">{entry.estimatedDeliveryDate ? new Date(entry.estimatedDeliveryDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : ''}</td>
                                        <td className="p-2 text-center">{entry.quantity || 1}</td>
                                        <td className="p-2">{entry.carrier}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">Nenhuma entrega agendada para este dia.</div>
                    )}
                </div>
                <div className="bg-gray-50 p-3 flex justify-end font-bold text-lg rounded-b-lg">
                    TOTAL: {day.entries.reduce((sum, entry) => sum + (entry.quantity || 1), 0)}
                </div>
            </div>
        </div>
    );
};

const CalendarPage: React.FC<{ entries: LogisticsEntry[] }> = ({ entries }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
    const [maximizedDay, setMaximizedDay] = useState<{ date: Date, entries: LogisticsEntry[] } | null>(null);

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setSelectedWeekIndex(null);
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setSelectedWeekIndex(null);
    };

    const { weeks, monthName, year } = useMemo(() => {
        const d = new Date(currentDate);
        const month = d.getMonth();
        const year = d.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...

        const correctedFirstDay = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1; // Start week on Monday

        let allDays: { date: Date | null; entries: LogisticsEntry[] }[] = [];
        
        for (let i = 0; i < correctedFirstDay; i++) {
            allDays.push({ date: null, entries: [] });
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(Date.UTC(year, month, day));
            const dateString = date.toISOString().split('T')[0];
            const dayEntries = entries.filter(e => e.estimatedDeliveryDate === dateString);
            allDays.push({ date, entries: dayEntries });
        }

        while (allDays.length % 7 !== 0) {
            allDays.push({ date: null, entries: [] });
        }
        
        const weeks = [];
        for (let i = 0; i < allDays.length; i += 7) {
            weeks.push(allDays.slice(i, i + 7));
        }
        
        const monthName = d.toLocaleString('pt-BR', { month: 'long' });

        return { weeks, monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1), year };
    }, [currentDate, entries]);

    const WeeklySummary: React.FC<{ week: { date: Date | null, entries: LogisticsEntry[] }[], onClick: () => void, isClickable: boolean }> = ({ week, onClick, isClickable }) => {
        const weeklyEntries = week.flatMap(day => day.entries);
        const weeklyTotal = weeklyEntries.reduce((sum, entry) => sum + (entry.quantity || 1), 0);

        if (weeklyTotal === 0 && isClickable) return null; // Don't show empty summaries in month view
        if (!isClickable && weeklyTotal === 0) return <div className="grid grid-cols-7 border-t-2 border-black h-4"></div>; // Placeholder for week view

        const carrierCounts = weeklyEntries.reduce((acc, entry) => {
            const carrier = entry.carrier || 'N/A';
            acc[carrier] = (acc[carrier] || 0) + (entry.quantity || 1);
            return acc;
        }, {} as Record<string, number>);

        const sortedCarriers = Object.entries(carrierCounts).sort(([, a], [, b]) => b - a);

        return (
            <div onClick={isClickable ? onClick : undefined} className={`grid grid-cols-7 border-t-2 border-black ${isClickable ? 'cursor-pointer hover:bg-yellow-50 transition-colors' : ''}`}>
                <div className="col-span-1 p-1 border-x border-b border-gray-300 bg-yellow-200 font-bold text-xs flex items-center justify-center text-center">
                    TOTAL CONTAINERS SEMANA
                </div>
                <div className="col-span-1 p-1 border-r border-b border-gray-300 bg-yellow-300 font-bold text-sm flex items-center justify-center">
                    {weeklyTotal}
                </div>
                <div className="col-span-5 p-1 border-r border-b border-gray-300 text-xs">
                    <table className="w-full">
                        <tbody>
                        {sortedCarriers.map(([carrier, count]) => (
                            <tr key={carrier}>
                                <td className="font-semibold pr-2">{carrier}</td>
                                <td className="text-right">{count}</td>
                                <td className="text-right pl-2 w-16">{((count / weeklyTotal) * 100).toFixed(0)}%</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const DayCell: React.FC<{ day: { date: Date | null, entries: LogisticsEntry[] }, heightClass: string }> = ({ day, heightClass }) => {
        if (!day.date) return <div className={`border border-gray-300 bg-gray-50 ${heightClass}`}></div>;
        
        const dailyTotal = day.entries.reduce((sum, entry) => sum + (entry.quantity || 1), 0);

        return (
            <div className={`border border-gray-300 flex flex-col ${heightClass}`}>
                <div className="bg-orange-200 text-center font-bold text-sm p-1 border-b border-gray-300 flex justify-between items-center">
                    <span>
                      {day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).replace('.', '')}
                    </span>
                    <button onClick={() => setMaximizedDay(day)} className="p-1 rounded-full hover:bg-orange-300 text-gray-700" title="Maximizar dia">
                       <ExpandIcon />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto text-xs">
                    {day.entries.length > 0 && (
                        <table className="w-full">
                            <thead className="sticky top-0 bg-orange-100">
                                <tr className="text-left">
                                    <th className="p-1 font-semibold border-b">HBL</th>
                                    <th className="p-1 font-semibold border-b">LOT</th>
                                    <th className="p-1 font-semibold border-b">B.WARE</th>
                                    <th className="p-1 font-semibold border-b">VESSEL</th>
                                    <th className="p-1 font-semibold border-b">FT</th>
                                    <th className="p-1 font-semibold border-b text-center">QTY</th>
                                    <th className="p-1 font-semibold border-b">TRUCK</th>
                                </tr>
                            </thead>
                            <tbody>
                                {day.entries.map(entry => (
                                    <tr key={entry.id} className={`border-b last:border-b-0 ${entry.deliveryDateAtByd ? 'bg-green-100' : ''}`}>
                                        <td className="p-1 whitespace-nowrap">{entry.bl}</td>
                                        <td className="p-1 whitespace-nowrap">{entry.batch}</td>
                                        <td className="p-1 whitespace-nowrap">{entry.bondedWarehouse}</td>
                                        <td className="p-1 whitespace-nowrap">{entry.arrivalVessel}</td>
                                        <td className="p-1 whitespace-nowrap">{entry.estimatedDeliveryDate ? new Date(entry.estimatedDeliveryDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : ''}</td>
                                        <td className="p-1 whitespace-nowrap text-center">{entry.quantity || 1}</td>
                                        <td className="p-1 whitespace-nowrap">{entry.carrier}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="flex justify-between font-bold text-sm p-1 border-t border-gray-300 bg-gray-50">
                    <span>TOTAL</span>
                    <span>{dailyTotal}</span>
                </div>
            </div>
        );
    };

    const dayCellHeightClass = selectedWeekIndex !== null ? "min-h-[40rem]" : "min-h-[25rem]";
    const getWeekStartDate = (week: {date: Date | null}[]) => {
        const firstDay = week.find(d => d.date);
        return firstDay?.date?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }) ?? '';
    }

    return (
        <>
            <div className="bg-white p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4 px-2">
                    <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-200"><ChevronLeftIcon /></button>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {selectedWeekIndex !== null && weeks[selectedWeekIndex] ? `Semana de ${getWeekStartDate(weeks[selectedWeekIndex])}` : `${monthName} ${year}`}
                    </h2>
                    <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-200"><ChevronRightIcon /></button>
                </div>
                
                {selectedWeekIndex !== null && (
                     <button onClick={() => setSelectedWeekIndex(null)} className="mb-4 text-byd-blue font-semibold flex items-center gap-1 hover:underline">
                         <ChevronLeftIcon /> Voltar para a visão mensal
                     </button>
                )}

                <div>
                     {selectedWeekIndex === null ? (
                        weeks.map((week, index) => (
                            <div key={index} className="mb-4">
                                <div className="grid grid-cols-7">
                                   {week.map((day, dayIndex) => <DayCell key={dayIndex} day={day} heightClass={dayCellHeightClass}/>)}
                                </div>
                                <WeeklySummary week={week} onClick={() => setSelectedWeekIndex(index)} isClickable={true} />
                            </div>
                        ))
                    ) : (
                        weeks[selectedWeekIndex] && (
                             <div>
                                <div className="grid grid-cols-7">
                                    {weeks[selectedWeekIndex].map((day, dayIndex) => <DayCell key={dayIndex} day={day} heightClass={dayCellHeightClass}/>)}
                                </div>
                                <WeeklySummary week={weeks[selectedWeekIndex]} onClick={() => {}} isClickable={false} />
                            </div>
                        )
                    )}
                </div>
            </div>
            {maximizedDay && <DayDetailModal day={maximizedDay} onClose={() => setMaximizedDay(null)} />}
        </>
    );
};

export default CalendarPage;