import React, { useState, useMemo, useEffect } from 'react';
import { LogisticsEntry } from '../types';
import { getComexStatusPillClass, toDisplayDate, getWarehouseStatusPillClass, formatPoSap } from '../utils/helpers';
import { UploadIcon, EditIcon, SaveIcon, CancelIcon, TrashIcon, CalendarPlusIcon, Loader2Icon } from './common/Icons';

interface LogisticsListPageProps {
    entries: LogisticsEntry[];
    isLoading: boolean;
    onSelect: (id: string) => void;
    onNew: () => void;
    onUpdate: (entry: LogisticsEntry) => void;
    onDelete: (id: string) => void;
    onUploadClick: () => void;
    onScheduleClick: (ids: string[]) => void;
    onFilterChange: (filters: Record<string, any>) => void;
    onPageChange: (direction: 'next' | 'prev') => void;
    page: number;
}

const ALL_COMEX_STATUSES = ['CARGO DELIVERED', 'CARGO CLEARED', 'IN TRANSIT', 'AT THE PORT', 'CARGO READY', 'DI REGISTERED', 'DOCUMENT REVIEW', 'PENDENTE'];
const ALL_WAREHOUSES = ['INTERMARÍTIMA', 'TECA', 'TPC', 'CLIA EMPÓRIO'];

const LogisticsListPage: React.FC<LogisticsListPageProps> = ({ entries, isLoading, onSelect, onNew, onUpdate, onDelete, onUploadClick, onScheduleClick, onFilterChange, onPageChange, page }) => {
    const [filters, setFilters] = useState({ containerSearch: '', loteSearch: '', blSearch: '', vesselSearch: '', statusFilter: 'All', warehouseFilter: 'All' });
    const [editingRow, setEditingRow] = useState<Partial<LogisticsEntry> | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Server-side filtering is triggered from App.tsx, so we just pass up the new filter state.
        // We debounce this to avoid rapid-fire requests as the user types or selects.
        const handler = setTimeout(() => {
            onFilterChange({ 
                containerSearch: filters.containerSearch,
                loteSearch: filters.loteSearch,
                blSearch: filters.blSearch,
                vesselSearch: filters.vesselSearch,
                statusFilter: filters.statusFilter, 
                warehouseFilter: filters.warehouseFilter 
            });
        }, 500);
        return () => clearTimeout(handler);
    }, [filters, onFilterChange]);
    

    // --- Selection Logic ---
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedIds(new Set(entries.map(entry => entry.id)));
        else setSelectedIds(new Set());
    };
    const handleSelectOne = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedIds(newSelection);
    };
    const isAllSelected = useMemo(() => entries.length > 0 && selectedIds.size === entries.length, [selectedIds, entries]);

    // --- Inline Editing Handlers ---
    const handleStartEditing = (entry: LogisticsEntry) => setEditingRow({ ...entry });
    const handleCancelEditing = () => setEditingRow(null);
    const handleSaveEditing = () => { if (editingRow) { onUpdate(editingRow as LogisticsEntry); setEditingRow(null); } };
    const handleEditingChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
        if (editingRow) {
            const { name, value, type } = e.target;
            const processedValue = type === 'date' && value === '' ? null : value;
            setEditingRow({ ...editingRow, [name]: processedValue }); 
        }
    };


    return (
        <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b space-y-4">
                 <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-800">Logistics Entries</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={onUploadClick} className="flex items-center gap-2 p-2 bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200 text-sm"><UploadIcon /> Upload File</button>
                        <button onClick={onNew} className="p-2 bg-byd-blue text-white font-semibold rounded-md hover:bg-byd-blue/90 text-sm">New Entry</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                    <input type="text" placeholder="Container..." className="p-2 border rounded-md text-sm" value={filters.containerSearch} onChange={(e) => setFilters(f => ({ ...f, containerSearch: e.target.value }))} />
                    <input type="text" placeholder="LOTE..." className="p-2 border rounded-md text-sm" value={filters.loteSearch} onChange={(e) => setFilters(f => ({ ...f, loteSearch: e.target.value }))} />
                    <input type="text" placeholder="BL..." className="p-2 border rounded-md text-sm" value={filters.blSearch} onChange={(e) => setFilters(f => ({ ...f, blSearch: e.target.value }))} />
                    <input type="text" placeholder="Vessel..." className="p-2 border rounded-md text-sm" value={filters.vesselSearch} onChange={(e) => setFilters(f => ({ ...f, vesselSearch: e.target.value }))} />
                    <select className="p-2 border rounded-md text-sm" value={filters.statusFilter} onChange={(e) => setFilters(f => ({ ...f, statusFilter: e.target.value }))}><option value="All">All Statuses</option>{ALL_COMEX_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    <select className="p-2 border rounded-md text-sm" value={filters.warehouseFilter} onChange={(e) => setFilters(f => ({ ...f, warehouseFilter: e.target.value }))}><option value="All">All Warehouses</option>{ALL_WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}</select>
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="p-2 bg-blue-50 border-b flex items-center justify-between">
                     <span className="text-sm font-semibold text-byd-blue">{selectedIds.size} items selected</span>
                     <button onClick={() => onScheduleClick(Array.from(selectedIds))} className="flex items-center gap-2 px-3 py-1.5 bg-byd-blue text-white font-semibold rounded-md hover:bg-byd-blue/90 text-sm"><CalendarPlusIcon /> Programar Entrega</button>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="p-4"><input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} /></th>
                            {['CNTR', 'BL', 'PO SAP', 'LOTE', 'Shipper', 'Vessel', 'Type of Cargo', 'Carrier', 'ATA', 'Free Time', 'Deadline CNTR', 'Est. Delivery', 'Actual Delivery', 'Actual Depot', 'Status', 'Warehouse Status', 'Actions'].map(h => <th key={h} scope="col" className="px-4 py-3 whitespace-nowrap">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={18} className="text-center p-8"><Loader2Icon /></td></tr>
                        ) : entries.map(entry => {
                            const isEditing = editingRow?.id === entry.id;
                            const commonInputClass = "p-1 border rounded-md text-sm w-full";
                            return (
                                <tr key={entry.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="p-4"><input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => handleSelectOne(entry.id)} /></td>
                                    <td className="px-4 py-2 font-medium text-byd-blue hover:underline"><button onClick={() => onSelect(entry.id)}>{entry.cntrsOriginal}</button></td>
                                    <td className="px-4 py-2">{entry.bl}</td>
                                    <td className="px-4 py-2" title={String(entry.poSap || '')}>{formatPoSap(entry.poSap)}</td>
                                    <td className="px-4 py-2">{entry.batch}</td>
                                    <td className="px-4 py-2 max-w-40 truncate" title={entry.shipper || ''}>{entry.shipper}</td>
                                    <td className="px-4 py-2">{entry.arrivalVessel}</td>
                                    <td className="px-4 py-2">{entry.typeOfCargo}</td>
                                    <td className="px-4 py-2">{isEditing ? <input type="text" name="carrier" value={editingRow?.carrier || ''} onChange={handleEditingChange} className={commonInputClass} autoFocus /> : entry.carrier}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{toDisplayDate(entry.ata)}</td>
                                    <td className="px-4 py-2 text-center">{entry.freeTime ?? 'N/A'}</td>
                                    <td className="px-4 py-2 whitespace-nowrap font-semibold text-red-600">{toDisplayDate(entry.deadlineReturnCntr)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap font-semibold text-blue-700">{isEditing ? <input type="date" name="estimatedDeliveryDate" value={editingRow?.estimatedDeliveryDate || ''} onChange={handleEditingChange} className={commonInputClass} /> : toDisplayDate(entry.estimatedDeliveryDate)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{isEditing ? <input type="date" name="deliveryDateAtByd" value={editingRow?.deliveryDateAtByd || ''} onChange={handleEditingChange} className={commonInputClass} /> : toDisplayDate(entry.deliveryDateAtByd)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{isEditing ? <input type="date" name="actualDepotReturnDate" value={editingRow?.actualDepotReturnDate || ''} onChange={handleEditingChange} className={commonInputClass} /> : toDisplayDate(entry.actualDepotReturnDate)}</td>
                                    <td className="px-4 py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getComexStatusPillClass(entry.statusComex)}`}>{entry.statusComex}</span></td>
                                    <td className="px-4 py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getWarehouseStatusPillClass(entry.statusCntrWarehouse)}`}>{entry.statusCntrWarehouse || 'N/A'}</span></td>
                                    <td className="px-4 py-2 flex items-center gap-2">
                                        {isEditing ? (<><button onClick={handleSaveEditing} className="p-1 text-green-600"><SaveIcon /></button><button onClick={handleCancelEditing} className="p-1 text-gray-600"><CancelIcon /></button></>) 
                                        : (<><button onClick={() => handleStartEditing(entry)} className="p-1 text-blue-600"><EditIcon /></button><button onClick={() => onDelete(entry.id)} className="p-1 text-red-600"><TrashIcon /></button></>)}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                 {entries.length === 0 && !isLoading && <tr><td colSpan={18} className="text-center p-8 text-gray-500">No entries found.</td></tr>}
            </div>
            <div className="p-4 flex justify-between items-center">
                <span className="text-sm text-gray-600">Page {page}</span>
                <div className="flex gap-2">
                    <button onClick={() => onPageChange('prev')} disabled={page <= 1} className="px-4 py-2 bg-white border rounded-md font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Previous</button>
                    <button onClick={() => onPageChange('next')} disabled={entries.length < 50} className="px-4 py-2 bg-white border rounded-md font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Next</button>
                </div>
            </div>
        </div>
    );
};

export default LogisticsListPage;
