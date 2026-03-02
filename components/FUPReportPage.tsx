import React, { useState, useEffect } from 'react';
import { LogisticsEntry } from '../types';
import { getComexStatusPillClass, formatPoSap, toDisplayDate } from '../utils/helpers';
import { ExportIcon, Loader2Icon } from './common/Icons';

declare var XLSX: any;

interface FUPReportPageProps {
    entries: LogisticsEntry[];
    isLoading: boolean;
    onFilterChange: (filters: Record<string, any>) => void;
    onPageChange: (direction: 'next' | 'prev') => void;
    page: number;
}

const orderedLogisticsColumns: { header: string, key: keyof LogisticsEntry }[] = [
    { header: 'CNTRS ORIGINAL', key: 'cntrsOriginal' }, { header: 'BL', key: 'bl' }, { header: 'SHIPPER', key: 'shipper' },
    { header: 'FREIGHT FORWARDER', key: 'freightForwarder' }, { header: 'SHIPOWNER', key: 'shipowner' },
    { header: 'BONDED WAREHOUSE', key: 'bondedWarehouse' }, { header: 'RESPONSIBLE ANALYST', key: 'responsibleAnalyst' },
    { header: 'PO SAP', key: 'poSap' }, { header: 'BATCH', key: 'batch' }, { header: 'COMPONENT', key: 'component' },
    { header: 'LOADING TYPE', key: 'loadingType' }, { header: 'DESCRIPTION', key: 'description' },
    { header: 'TYPE OF CARGO', key: 'typeOfCargo' }, { header: 'COST CENTER', key: 'costCenter' },
    { header: 'COMEX SPONSOR', key: 'comexSponsor' }, { header: 'DSA', key: 'dsa' }, { header: 'ARRIVAL VESSEL', key: 'arrivalVessel' },
    { header: 'ATA', key: 'ata' }, { header: 'FREE TIME', key: 'freeTime' }, { header: 'DI', key: 'di' },
    { header: 'PARAMETRIZATION', key: 'parametrization' }, { header: 'CHANNEL DATE', key: 'channelDate' },
    { header: 'VALUE PER CNTR', key: 'valuePerCntr' }, { header: 'NOTA FISCAL', key: 'notaFiscal' },
    { header: 'DATE NOTA FISCAL', key: 'dateNotaFiscal' }, { header: 'CARGO READY (DATE)', key: 'cargoReadyDate' },
    { header: 'STATUS (COMEX)', key: 'statusComex' }, { header: 'INCOTERM', key: 'incoterm' },
    { header: 'DEADLINE PICK UP - DSA', key: 'deadlinePickUpDsa' }, { header: 'CNTR / BBK / AIR', key: 'cntrBbkAir' },
    { header: 'ORIGINAL CNTR MODEL', key: 'originalCntrModel' }, { header: 'CNTRS RENT', key: 'cntrsRent' },
    { header: '(DESEMBARAÇO) DEADLINE RETURN CNTR', key: 'deadlineReturnCntr' }, { header: 'STATUS CNTR WAREHOUSE', key: 'statusCntrWarehouse' },
    { header: 'UNLOAD DATE', key: 'unloadDate' }, { header: 'CARRIER', key: 'carrier' }, { header: 'TMS DESPATCH NO', key: 'tmsDespatchNo' },
    { header: 'TYPE OF TRUCK', key: 'typeOfTruck' }, { header: 'ESTIMATED DELIVERY DATE', key: 'estimatedDeliveryDate' },
    { header: 'ON-SITE PLACE OF DELIVERY', key: 'onSitePlaceOfDelivery' }, { header: 'DELIVERY DATE AT BYD', key: 'deliveryDateAtByd' },
    { header: 'PENDING DEPOT RETURN', key: 'pendingDepotReturn' }, { header: 'LOCALIZATION CNTR', key: 'localizationCntr' },
    { header: 'CARRIER (BUFFER X DEPOT)', key: 'carrierBufferXDepot' }, { header: 'ESTIMATED DEPOT DATE', key: 'estimatedDepotDate' },
    { header: 'ACTUAL DEPOT RETURN DATE', key: 'actualDepotReturnDate' }, { header: 'DEPOT', key: 'depot' },
    { header: 'DAMAGE STATUS', key: 'damageStatus' }, { header: 'STORAGE DEADLINE', key: 'storageDeadline' },
    { header: 'STATUS', key: 'status' },
    { header: 'STATUS DEPOT', key: 'statusDepot' },
];

const exportViewToXLSX = (entries: LogisticsEntry[], fileName: string = 'logistics_report_view.xlsx') => {
    if (entries.length === 0) return alert('No data to export.');

    const dataToExport = entries.map(row => {
        const newRow: { [key: string]: any } = {};
        orderedLogisticsColumns.forEach(col => {
            let value = row[col.key];
            if (String(col.key).toLowerCase().includes('date')) {
                value = toDisplayDate(value as string);
            }
            newRow[col.header] = value === null || value === undefined ? '' : value;
        });
        return newRow;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport, { header: orderedLogisticsColumns.map(c => c.header) });
    const colWidths = orderedLogisticsColumns.map(col => ({ wch: Math.min(Math.max(col.header.length, 20), 50) }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Logistics Report');
    XLSX.writeFile(wb, fileName);
};

const FUPReportPage: React.FC<FUPReportPageProps> = ({ entries, isLoading, onFilterChange, onPageChange, page }) => {
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            onFilterChange({ searchTerm });
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm, onFilterChange]);

    return (
        <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-800">FUP Report</h2>
                    <div className="flex items-center gap-2">
                        <input type="text" placeholder="Search by Container..." className="p-2 border rounded-md text-sm w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <button onClick={() => exportViewToXLSX(entries)} className="flex items-center gap-2 p-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 text-sm">
                            <ExportIcon /> Export View to XLSX
                        </button>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>{orderedLogisticsColumns.map(col => <th key={col.key} scope="col" className="px-4 py-3 whitespace-nowrap">{col.header}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                        {isLoading ? (
                             <tr><td colSpan={orderedLogisticsColumns.length} className="text-center p-8"><Loader2Icon /></td></tr>
                        ) : entries.map(entry => (
                            <tr key={entry.id} className="bg-white hover:bg-gray-50">
                                {orderedLogisticsColumns.map(col => {
                                    const value = entry[col.key];
                                    let cellContent: React.ReactNode = String(col.key).toLowerCase().includes('date') ? toDisplayDate(value as string) : (value === null || value === undefined ? '' : String(value));
                                    if (col.key === 'statusComex') cellContent = <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getComexStatusPillClass(value as string)}`}>{value as string}</span>;
                                    else if (col.key === 'poSap') cellContent = formatPoSap(value);
                                    return <td key={col.key} className="px-4 py-2 whitespace-nowrap" title={String(value || '')}>{cellContent}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {entries.length === 0 && !isLoading && <tr><td colSpan={orderedLogisticsColumns.length} className="text-center p-8 text-gray-500">No entries found.</td></tr>}
            </div>
             <div className="p-4 flex justify-between items-center border-t">
                <span className="text-sm text-gray-600">Page {page}</span>
                <div className="flex gap-2">
                    <button onClick={() => onPageChange('prev')} disabled={page <= 1 || !!searchTerm} className="px-4 py-2 bg-white border rounded-md font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Previous</button>
                    <button onClick={() => onPageChange('next')} disabled={entries.length < 50 || !!searchTerm} className="px-4 py-2 bg-white border rounded-md font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Next</button>
                </div>
            </div>
        </div>
    );
};

export default FUPReportPage;