

import React, { useState, useMemo } from 'react';
import { LogisticsEntry } from '../types';
import { getComexStatusPillClass, formatPoSap } from '../utils/helpers';
import { ExportIcon } from './common/Icons';

declare var XLSX: any;

interface FUPReportPageProps {
    entries: LogisticsEntry[];
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
    { header: 'ROMANEIO', key: 'romaneio' }, { header: 'MADE ROMANEIO', key: 'madeRomaneio' },
    { header: 'SIGNED ROMANEIO', key: 'signedRomaneio' }, { header: 'RECEIVED ROMANEIO', key: 'receivedRomaneio' },
    { header: 'SCANNED ROMANEIO', key: 'scannedRomaneio' }, { header: 'ROMANEIO OBS', key: 'romaneioObs' },
    { header: 'DESCONSIDERAR', key: 'desconsiderar' }, { header: 'DEMURRAGE STARTED (1° PERÍODO)', key: 'demurrageStarted1' },
    { header: 'DAYS DEMURRAGE (1° PERIOD)', key: 'daysDemurrage1' }, { header: 'COST DEMURRAGE (1° PERIOD)', key: 'costDemurrage1' },
    { header: 'DEMURRAGE STARTED (2° PERIOD)', key: 'demurrageStarted2' }, { header: 'DAYS DEMURRAGE (2° PERIOD)', key: 'daysDemurrage2' },
    { header: 'COST DEMURRAGE (2° PERIOD)', key: 'costDemurrage2' },
    { header: 'DEMURRAGE STARTED (3° PERIOD)', key: 'demurrageStarted3' }, { header: 'DAYS DEMURRAGE (3° PERIOD)', key: 'daysDemurrage3' },
    { header: 'COST DEMURRAGE (3° PERIOD)', key: 'costDemurrage3' }, { header: 'COST DEMURRAGE TOTAL', key: 'costDemurrageTotal' },
    { header: 'COST ( BYD OU TERCEIROS)', key: 'costBydOuTerceiros' }, { header: 'DISPUTE (Y OR N)', key: 'disputeYOrN' },
    { header: 'OBSERVATION', key: 'observation' }, { header: 'STATUS', key: 'status' },
    { header: 'STATUS DEPOT', key: 'statusDepot' }, { header: 'AVERAGE TIME (DELIVERED BYD X DEPOT)', key: 'averageTimeDeliveredBydXDepot' },
    { header: 'AVERAGE TIME (DATE NF X DELIVERED BYD)', key: 'averageTimeDateNfXDeliveredByd' }, { header: 'CNTR RETURN', key: 'cntrReturn' },
    { header: 'DAY (ESTIMATED)', key: 'dayEstimated' }, { header: 'DAY (ESTIMATED)', key: 'dayEstimated2' },
    { header: 'YEAR (ESTIMATED)', key: 'yearEstimated' }, { header: 'WEEK (DELIVERY)', key: 'weekDelivery' },
    { header: 'DAY (DELIVERY)', key: 'dayDelivery' }, { header: 'YEAR (DELIVERY)', key: 'yearDelivery' },
    { header: 'MONTH (ATA)', key: 'monthAta' }, { header: 'YEAR (ATA)', key: 'yearAta' },
];

const exportAllToXLSX = (entries: LogisticsEntry[], fileName: string = 'logistics_report.xlsx') => {
    if (entries.length === 0) return alert('No data to export.');

    const dataToExport = entries.map(row => {
        const newRow: { [key: string]: any } = {};
        orderedLogisticsColumns.forEach(col => {
            const value = row[col.key];
            newRow[col.header] = value === null || value === undefined ? '' : value;
        });
        return newRow;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport, { header: orderedLogisticsColumns.map(c => c.header) });
    const colWidths = orderedLogisticsColumns.map(col => {
        const headerWidth = col.header.length;
        const dataWidths = dataToExport.map(row => String(row[col.header] || '').length);
        return { wch: Math.min(Math.max(headerWidth, ...dataWidths), 50) + 2 };
    });
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Logistics Report');
    XLSX.writeFile(wb, fileName);
};

const FUPReportPage: React.FC<FUPReportPageProps> = ({ entries }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredEntries = useMemo(() => {
        if (!searchTerm) return entries;
        const lowercasedFilter = searchTerm.toLowerCase();
        return entries.filter(e => Object.values(e).some(value => String(value).toLowerCase().includes(lowercasedFilter)));
    }, [entries, searchTerm]);

    return (
        <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-800">FUP Report</h2>
                    <div className="flex items-center gap-2">
                        <input type="text" placeholder="Search all fields..." className="p-2 border rounded-md text-sm w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <button onClick={() => exportAllToXLSX(filteredEntries, 'fup_logistics_report.xlsx')} className="flex items-center gap-2 p-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 text-sm">
                            <ExportIcon /> Export XLSX
                        </button>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            {orderedLogisticsColumns.map(col => <th key={col.key} scope="col" className="px-4 py-3 whitespace-nowrap">{col.header}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredEntries.map(entry => (
                            <tr key={entry.id} className="bg-white hover:bg-gray-50">
                                {orderedLogisticsColumns.map(col => {
                                    const value = entry[col.key];
                                    let cellContent: React.ReactNode = value === null || value === undefined ? '' : String(value);
                                    
                                    if (col.key === 'statusComex') {
                                        cellContent = <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getComexStatusPillClass(value as string)}`}>{value as string}</span>;
                                    } else if (col.key === 'poSap') {
                                        cellContent = formatPoSap(value);
                                    }

                                    return <td key={col.key} className="px-4 py-2 whitespace-nowrap" title={String(value || '')}>{cellContent}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FUPReportPage;