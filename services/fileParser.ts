
import { LogisticsEntry } from '../types';

declare var XLSX: any;

export const normalizeHeader = (header: string): string => {
    if (!header) return '';
    return header.toLowerCase()
        .replace(/[\s/._-]/g, '')
        .replace(/[ç]/g, 'c').replace(/[ãáâ]/g, 'a').replace(/[éê]/g, 'e')
        .replace(/[í]/g, 'i').replace(/[óô]/g, 'o').replace(/[ú]/g, 'u')
        .replace(/[^a-z0-9]/g, '');
};

const headerToKeyMap: { [key: string]: keyof LogisticsEntry } = {
    'shipper': 'shipper', 'freightforwarder': 'freightForwarder', 'shipowner': 'shipowner',
    'bondedwarehouse': 'bondedWarehouse', 'bl': 'bl', 'cntrsoriginal': 'cntrsOriginal',
    'responsibleanalyst': 'responsibleAnalyst', 'posap': 'poSap', 'batch': 'batch',
    'component': 'component', 'loadingtype': 'loadingType', 'description': 'description',
    'typeofcargo': 'typeOfCargo', 'costcenter': 'costCenter', 'comexsponsor': 'comexSponsor',
    'dsa': 'dsa', 'arrivalvessel': 'arrivalVessel', 'ata': 'ata', 'freetime': 'freeTime',
    'di': 'di', 'parametrization': 'parametrization', 'channeldate': 'channelDate',
    'valuepercntr': 'valuePerCntr', 'notafiscal': 'notaFiscal', 'datenotafiscal': 'dateNotaFiscal',
    'cargoreadydate': 'cargoReadyDate', 'statuscomex': 'statusComex', 'incoterm': 'incoterm',
    'deadlinepickupdsa': 'deadlinePickUpDsa', 'cntrbbkair': 'cntrBbkAir',
    'originalcntrmodel': 'originalCntrModel', 'cntrsrent': 'cntrsRent',
    'desembaracodeadlinereturncntr': 'deadlineReturnCntr', 'statuscntrwarehouse': 'statusCntrWarehouse',
    'unloaddate': 'unloadDate', 'carrier': 'carrier', 'tmsdespatchno': 'tmsDespatchNo',
    'typeoftruck': 'typeOfTruck', 'estimateddeliverydate': 'estimatedDeliveryDate',
    'onsiteplaceofdelivery': 'onSitePlaceOfDelivery', 'localdeentrega': 'onSitePlaceOfDelivery',
    'deliverydateatbyd': 'deliveryDateAtByd',
    'pendingdepotreturn': 'pendingDepotReturn', 'localizationcntr': 'localizationCntr',
    'carrierbufferxdepot': 'carrierBufferXDepot', 'estimateddepotdate': 'estimatedDepotDate',
    'actualdepotreturndate': 'actualDepotReturnDate', 'depot': 'depot',
    'damagestatus': 'damageStatus', 'storagedeadline': 'storageDeadline', 'romaneio': 'romaneio',
    'maderomaneio': 'madeRomaneio', 'signedromaneio': 'signedRomaneio',
    'receivedromaneio': 'receivedRomaneio', 'scannedromaneio': 'scannedRomaneio',
    'romaneioobs': 'romaneioObs', 'desconsiderar': 'desconsiderar',
    'demurragestarted1periodo': 'demurrageStarted1', 'daysdemurrage1period': 'daysDemurrage1',
    'costdemurrage1period': 'costDemurrage1', 'demurragestarted2period': 'demurrageStarted2',
    'daysdemurrage2period': 'daysDemurrage2', 'costdemurrage2period': 'costDemurrage2',
    'demurragestarted3period': 'demurrageStarted3', 'daysdemurrage3period': 'daysDemurrage3',
    'costdemurrage3period': 'costDemurrage3', 'costdemurragetotal': 'costDemurrageTotal',
    'costbydouterceiros': 'costBydOuTerceiros', 'disputeyorn': 'disputeYOrN',
    'observation': 'observation', 'status': 'status', 'statusdepot': 'statusDepot',
    'averagetimedeliveredbydxdepot': 'averageTimeDeliveredBydXDepot',
    'averagetimedatenfxdeliveredbyd': 'averageTimeDateNfXDeliveredByd',
    'cntrreturn': 'cntrReturn', 'dayestimated': 'dayEstimated', 'dayestimated_2': 'dayEstimated2',
    'yearestimated': 'yearEstimated', 'weekdelivery': 'weekDelivery', 'daydelivery': 'dayDelivery',
    'yeardelivery': 'yearDelivery', 'monthata': 'monthAta', 'yearata': 'yearAta',
    'qty': 'quantity', 'quantity': 'quantity',
};

export const parseLogisticsFile = (jsonData: any[]): { data: LogisticsEntry[], error: string | null } => {
    try {
        if (!jsonData || jsonData.length === 0) {
            return { data: [], error: "File contains no data rows." };
        }
        
        const firstRow = jsonData[0];
        if (!firstRow) return { data: [], error: "File seems empty or malformed." };

        const rawHeaders = Object.keys(firstRow);
        const rawHeaderToKeyMap = new Map<string, keyof LogisticsEntry>();
        const headerNormalizationMap = new Map<string, string>();
        
        let dayEstimatedCount = 0;

        rawHeaders.forEach(h => {
            let normalized = normalizeHeader(h);
            if (normalized === 'dayestimated') {
                dayEstimatedCount++;
                if (dayEstimatedCount > 1) normalized = 'dayestimated_2';
            }
            const key = headerToKeyMap[normalized];
            if (key) {
                rawHeaderToKeyMap.set(h, key);
                headerNormalizationMap.set(normalized, h);
            }
        });

        const cntrOriginalRawHeader = headerNormalizationMap.get('cntrsoriginal');
        if (!cntrOriginalRawHeader) {
            return { data: [], error: "Missing required column 'CNTRS ORIGINAL'." };
        }

        const entries: LogisticsEntry[] = [];
        for (const row of jsonData) {
            const cntrOriginalValue = row[cntrOriginalRawHeader];
            if (!cntrOriginalValue || String(cntrOriginalValue).trim() === '') continue;

            const newEntry: Partial<LogisticsEntry> = { cntrsOriginal: String(cntrOriginalValue).trim() };

            for (const rawHeader in row) {
                const value = row[rawHeader];
                const key = rawHeaderToKeyMap.get(rawHeader);
                if (key) {
                    (newEntry as any)[key] = (value !== null && value !== '') ? value : null;
                }
            }

            // Type Coercion
            const numberFields: (keyof LogisticsEntry)[] = ['freeTime', 'valuePerCntr', 'daysDemurrage1', 'costDemurrage1', 'daysDemurrage2', 'costDemurrage2', 'daysDemurrage3', 'costDemurrage3', 'costDemurrageTotal', 'averageTimeDeliveredBydXDepot', 'averageTimeDateNfXDeliveredByd', 'yearEstimated', 'yearDelivery', 'yearAta', 'quantity'];
            numberFields.forEach(field => {
                if (newEntry[field] !== undefined && newEntry[field] !== null) {
                    const val = newEntry[field];
                    const numVal = parseFloat(String(val).replace(/[^0-9.,-]/g, '').replace(',', '.'));
                    (newEntry as any)[field] = isNaN(numVal) ? null : numVal;
                }
            });

            const dateFields: (keyof LogisticsEntry)[] = ['ata', 'channelDate', 'dateNotaFiscal', 'cargoReadyDate', 'deadlinePickUpDsa', 'deadlineReturnCntr', 'unloadDate', 'estimatedDeliveryDate', 'deliveryDateAtByd', 'estimatedDepotDate', 'actualDepotReturnDate', 'storageDeadline', 'demurrageStarted1', 'demurrageStarted2', 'demurrageStarted3'];
            dateFields.forEach(field => {
                const value = newEntry[field];
                if (value === undefined || value === null || value === '' || String(value).trim() === '00/01/1900') {
                    (newEntry as any)[field] = null; return;
                }
                let isoString: string | null = null;
                if (typeof value === 'number') {
                    const d = XLSX.SSF.parse_date_code(value);
                    if (d && d.y > 1900) {
                        const date = new Date(Date.UTC(d.y, d.m - 1, d.d));
                        isoString = isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
                    }
                } else if (typeof value === 'string') {
                    const dateStr = value.trim();
                    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
                        const [d, m, y] = dateStr.split('/');
                        isoString = (y.length === 4 && parseInt(y) > 1900) ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : null;
                    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                        isoString = dateStr;
                    }
                }
                (newEntry as any)[field] = isoString;
            });

            entries.push(newEntry as LogisticsEntry);
        }

        if (entries.length === 0 && jsonData.length > 0) {
            return { data: [], error: "No valid data rows with an identifier ('CNTRS ORIGINAL') could be found." };
        }

        return { data: entries, error: null };
    } catch (e: any) {
        return { data: [], error: e.message || "An unknown parsing error occurred." };
    }
};
