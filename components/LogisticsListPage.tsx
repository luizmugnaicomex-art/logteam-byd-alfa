

import React, { useState, useMemo, useEffect } from 'react';
import { LogisticsEntry, ComexStatus } from '../types';
import { getComexStatusPillClass, toDisplayDate, fromDisplayDate, parseDate, getWarehouseStatusPillClass, formatPoSap } from '../utils/helpers';
import { UploadIcon, EditIcon, SaveIcon, CancelIcon, TrashIcon, CalendarPlusIcon } from './common/Icons';

interface LogisticsListPageProps {
    entries: LogisticsEntry[];
    onSelect: (id: string) => void;
    onNew: () => void;
    onUpdate: (entry: LogisticsEntry) => void;
    onDelete: (id: string) => void;
    onUploadClick: () => void;
    onScheduleClick: (ids: string[]) => void;
    initialFilter: { type: string; value: string } | null;
    onClearInitialFilter: () => void;
}

const LogisticsListPage: React.FC<LogisticsListPageProps> = ({ entries, onSelect, onNew, onUpdate, onDelete, onUploadClick, onScheduleClick, initialFilter, onClearInitialFilter }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [warehouseFilter, setWarehouseFilter] = useState('All');
    const [editingRow, setEditingRow] = useState<Partial<LogisticsEntry> | null>(null);
    const [specialFilter, setSpecialFilter] = useState<{ type: string; value: string } | null>(initialFilter);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (initialFilter) {
            setSpecialFilter(initialFilter);
            setSearchTerm(''); setStatusFilter('All'); setWarehouseFilter('All');
            onClearInitialFilter();
        }
    }, [initialFilter, onClearInitialFilter]);

    const filteredEntries = useMemo(() => {
        const isDelivered = (e: LogisticsEntry) => !!e.deliveryDateAtByd;

        let results = entries;

        if (specialFilter) {
            // Special filter logic takes precedence
            switch (specialFilter.type) {
                 case 'statusComex':
                    if (specialFilter.value === 'inProgress') results = entries.filter(e => e.statusComex !== ComexStatus.CargoDelivered);
                    else results = entries.filter(e => e.statusComex === specialFilter.value);
                    break;
                case 'delivered':
                    results = entries.filter(isDelivered);
                    break;
                case 'highRisk': case 'mediumRisk': case 'lowRisk': case 'safe':
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    results = entries.filter(e => {
                        if (isDelivered(e)) return false;
                        const deadline = parseDate(e.deadlineReturnCntr);
                        if (!deadline) return specialFilter.type === 'safe';
                        deadline.setHours(0, 0, 0, 0);
                        const diffDays = (deadline.getTime() - today.getTime()) / (1000 * 3600 * 24);
                        if (specialFilter.type === 'highRisk') return diffDays <= 7;
                        if (specialFilter.type === 'mediumRisk') return diffDays > 7 && diffDays <= 15;
                        if (specialFilter.type === 'lowRisk') return diffDays > 15 && diffDays <= 30;
                        if (specialFilter.type === 'safe') return diffDays > 30;
                        return false;
                    });
                    break;
                default:
                     results = entries;
            }
        } else {
             // Standard filter logic
            results = entries.filter(e => {
                const lowercasedFilter = searchTerm.toLowerCase();
                const matchesSearch = !searchTerm || ['cntrsOriginal', 'bl', 'poSap', 'description', 'shipper', 'arrivalVessel']
                    .some(prop => String((e as any)[prop] || '').toLowerCase().includes(lowercasedFilter));
                const matchesStatus = statusFilter === 'All' || e.statusComex === statusFilter;
                const matchesWarehouse = warehouseFilter === 'All' || e.bondedWarehouse === warehouseFilter;
                return matchesSearch && matchesStatus && matchesWarehouse;
            });
        }
        return results;
    }, [entries, searchTerm, statusFilter, warehouseFilter, specialFilter]);

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('All');
        setWarehouseFilter('All');
        setSpecialFilter(null);
    }
    
    const uniqueStatuses = useMemo(() => [...new Set(entries.map(e => e.statusComex).filter(Boolean).sort())], [entries]);
    const uniqueWarehouses = useMemo(() => [...new Set(entries.map(e => e.bondedWarehouse).filter(Boolean).sort())], [entries]);

    // --- Selection Logic ---
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredEntries.map(entry => entry.id)));
        } else {
            setSelectedIds(new Set());
        }
    };
    const handleSelectOne = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedIds(newSelection);
    };

    const isAllSelected = useMemo(() => {
        if (filteredEntries.length === 0) return false;
        return selectedIds.size === filteredEntries.length;
    }, [selectedIds, filteredEntries]);

    // --- Inline Editing Handlers ---
    const handleStartEditing = (entry: LogisticsEntry) => {
        setEditingRow({ ...entry });
    };

    const handleCancelEditing = () => {
        setEditingRow(null);
    };

    const handleSaveEditing = () => {
        if (editingRow) {
            onUpdate(editingRow as LogisticsEntry);
            setEditingRow(null);
        }
    };

    const handleEditingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (editingRow) {
            setEditingRow({ ...editingRow, [e.target.name]: e.target.value });
        }
    };


    return (
        <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-800">Logistics Entries</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <input type="text" placeholder="Search CNTR, BL, PO..." className="p-2 border rounded-md text-sm w-48" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <select className="p-2 border rounded-md text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="All">All Statuses</option>{uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        <select className="p-2 border rounded-md text-sm" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}><option value="All">All Warehouses</option>{uniqueWarehouses.map(w => <option key={w} value={w}>{w}</option>)}</select>
                        <button onClick={onUploadClick} className="flex items-center gap-2 p-2 bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200 text-sm"><UploadIcon /> Upload File</button>
                        <button onClick={onNew} className="p-2 bg-byd-blue text-white font-semibold rounded-md hover:bg-byd-blue/90 text-sm">New Entry</button>
                    </div>
                </div>
                {specialFilter && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 text-sm text-blue-800 flex justify-between items-center rounded-md">
                        <span>Active filter: <strong>{specialFilter.type}</strong>.</span>
                        <button onClick={clearFilters} className="font-semibold hover:underline">Clear Filter</button>
                    </div>
                )}
            </div>

            {selectedIds.size > 0 && (
                <div className="p-2 bg-blue-50 border-b">
                    <div className="flex items-center justify-between">
                         <span className="text-sm font-semibold text-byd-blue">{selectedIds.size} items selected</span>
                         <button onClick={() => onScheduleClick(Array.from(selectedIds))} className="flex items-center gap-2 px-3 py-1.5 bg-byd-blue text-white font-semibold rounded-md hover:bg-byd-blue/90 text-sm"><CalendarPlusIcon /> Programar Entrega</button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="p-4"><input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"/></th>
                            {['CNTR', 'BL', 'PO SAP', 'Shipper', 'Vessel', 'Carrier', 'ATA', 'Free Time', 'Deadline CNTR', 'Est. Delivery', 'Actual Delivery', 'Actual Depot', 'Status', 'Warehouse Status', 'Actions'].map(h => <th key={h} scope="col" className="px-4 py-3 whitespace-nowrap">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEntries.map(entry => {
                            const isEditing = editingRow?.id === entry.id;
                            return (
                                <tr key={entry.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="w-4 p-4"><input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => handleSelectOne(entry.id)} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" /></td>
                                    <td className="px-4 py-2 font-medium text-byd-blue hover:underline"><button onClick={() => onSelect(entry.id)}>{entry.cntrsOriginal}</button></td>
                                    <td className="px-4 py-2">{entry.bl}</td>
                                    <td className="px-4 py-2" title={String(entry.poSap || '')}>{formatPoSap(entry.poSap)}</td>
                                    <td className="px-4 py-2 max-w-40 truncate" title={entry.shipper || ''}>{entry.shipper}</td>
                                    <td className="px-4 py-2">{entry.arrivalVessel}</td>
                                    <td className="px-4 py-2">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                name="carrier"
                                                value={editingRow?.carrier || ''}
                                                onChange={handleEditingChange}
                                                className="p-1 border rounded-md text-sm w-full"
                                                autoFocus
                                            />
                                        ) : (
                                            entry.carrier
                                        )}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">{toDisplayDate(entry.ata)}</td>
                                    <td className="px-4 py-2 text-center">{entry.freeTime ?? 'N/A'}</td>
                                    <td className="px-4 py-2 whitespace-nowrap font-semibold text-red-600">{toDisplayDate(entry.deadlineReturnCntr)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap font-semibold text-blue-700">{toDisplayDate(entry.estimatedDeliveryDate)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{toDisplayDate(entry.deliveryDateAtByd)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{toDisplayDate(entry.actualDepotReturnDate)}</td>
                                    <td className="px-4 py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getComexStatusPillClass(entry.statusComex)}`}>{entry.statusComex}</span></td>
                                    <td className="px-4 py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getWarehouseStatusPillClass(entry.statusCntrWarehouse)}`}>{entry.statusCntrWarehouse || 'N/A'}</span></td>
                                    <td className="px-4 py-2 flex items-center gap-2">
                                        {isEditing ? (
                                            <>
                                                <button onClick={handleSaveEditing} className="p-1 text-green-600 hover:text-green-800" aria-label="Save carrier"><SaveIcon /></button>
                                                <button onClick={handleCancelEditing} className="p-1 text-gray-600 hover:text-gray-800" aria-label="Cancel editing carrier"><CancelIcon /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleStartEditing(entry)} className="p-1 text-blue-600 hover:text-blue-800" aria-label="Edit carrier"><EditIcon /></button>
                                                <button onClick={() => onDelete(entry.id)} className="p-1 text-red-600 hover:text-red-800" aria-label="Delete entry"><TrashIcon /></button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LogisticsListPage;