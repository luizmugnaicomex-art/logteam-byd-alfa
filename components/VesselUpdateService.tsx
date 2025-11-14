import React, { useState } from 'react';
import { LogisticsEntry } from '../types';
import { WandIcon, Loader2Icon } from './common/Icons';
import { writeBatch, doc, Firestore } from 'firebase/firestore';

interface ScrapedVesselData {
    ship_name: string; eta: string; ata: string | null; etd: string; atd: string | null;
}

const mockFetchShipSchedule = async (): Promise<ScrapedVesselData[]> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return [
        { ship_name: 'MSC VITA', eta: '2025-06-12 10:00', ata: '2025-06-11 00:00', etd: '2025-06-14 12:00', atd: null },
        { ship_name: 'MAERSK ALABAMA', eta: '2025-07-22 14:00', ata: '2025-07-22 15:30', etd: '2025-07-24 18:00', atd: null },
        { ship_name: 'COSCO SHIPPING ROSE', eta: '2025-10-15 16:00', ata: null, etd: '2025-10-16 10:00', atd: null },
    ];
};

interface VesselUpdateServiceProps {
    entries: LogisticsEntry[];
    firestore?: Firestore;
    onVesselUpdates: (updatedEntries: Partial<LogisticsEntry>[]) => void;
}

const VesselUpdateService: React.FC<VesselUpdateServiceProps> = ({ entries, firestore, onVesselUpdates }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [updateLog, setUpdateLog] = useState<string[]>([]);

    const handleUpdate = async () => {
        setIsLoading(true);
        setUpdateLog(['Process started... Fetching latest vessel schedules.']);

        try {
            const scrapedData = await mockFetchShipSchedule();
            setUpdateLog(prev => [...prev, `Successfully fetched data for ${scrapedData.length} vessels.`]);

            const batch = firestore ? writeBatch(firestore) : null;
            const updatedEntriesForState: Partial<LogisticsEntry>[] = [];
            
            const foundVesselsInScrape = new Set(scrapedData.map(d => d.ship_name?.trim().toUpperCase()).filter(Boolean));

            for (const scrapedVessel of scrapedData) {
                const vesselNameUpper = scrapedVessel.ship_name?.trim().toUpperCase();
                if (!vesselNameUpper) continue;

                const matchingEntries = entries.filter(e => e.arrivalVessel?.trim().toUpperCase() === vesselNameUpper);

                if (matchingEntries.length > 0) {
                    for (const original of matchingEntries) {
                        const updatedFields: Partial<LogisticsEntry> = { id: original.id };
                        let hasUpdate = false;
                        
                        const newAta = scrapedVessel.ata ? new Date(scrapedVessel.ata).toISOString().split('T')[0] : null;
                        const newEta = scrapedVessel.eta ? new Date(scrapedVessel.eta).toISOString().split('T')[0] : null;

                        const targetDate = newAta || newEta;

                        if (targetDate && targetDate !== original.ata) {
                            updatedFields.ata = targetDate; 
                            hasUpdate = true;
                        }
                        
                        if (hasUpdate) {
                            if (batch && firestore) {
                                batch.update(doc(firestore, 'logisticsEntries', original.id), updatedFields);
                            }
                            updatedEntriesForState.push(updatedFields);
                            setUpdateLog(prev => [...prev, `[SUCCESS] Vessel '${original.arrivalVessel}' (CNTR: ${original.cntrsOriginal}) update queued. New ATA: ${updatedFields.ata}.`]);
                        } else {
                             setUpdateLog(prev => [...prev, `[INFO] Vessel '${original.arrivalVessel}' (CNTR: ${original.cntrsOriginal}): Date is already synchronized.`]);
                        }
                    }
                }
            }
            
            if (batch) await batch.commit();
            onVesselUpdates(updatedEntriesForState);

            const localVesselNames = new Set(entries.map(e => e.arrivalVessel?.trim().toUpperCase()).filter(Boolean));
            localVesselNames.forEach(vesselName => {
                if(!foundVesselsInScrape.has(vesselName)) {
                    setUpdateLog(prev => [...prev, `[WARNING] Vessel '${vesselName}' was not found in the live schedule.`]);
                }
            });

            setUpdateLog(prev => [...prev, `\nUpdate complete. ${updatedEntriesForState.length} entr(y/ies) updated.`]);
        } catch (error) {
            console.error("Failed to fetch or update vessel data:", error);
            const errorMessage = error instanceof Error ? error.message : String(error || "An unknown error occurred.");
            setUpdateLog(prev => [...prev, `[ERROR] Failed: ${errorMessage}`]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <header><h1 className="text-3xl font-bold text-gray-800">Vessel ETA Updates</h1></header>
            <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
                <div className="flex items-start gap-4">
                    <div className="text-byd-blue"><WandIcon /></div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">Automated Vessel ATA/ETA Updates</h3>
                        <p className="text-gray-600 mt-1">This tool automates updating the <strong>ATA (Actual Time of Arrival)</strong> by fetching the latest public schedule from the port terminal. If an ATA is not available, it will use the ETA.</p>
                    </div>
                </div>
                <div className="mt-6 text-center">
                    <button onClick={handleUpdate} disabled={isLoading} className="inline-flex items-center gap-2 px-6 py-3 bg-byd-blue text-white font-semibold rounded-md hover:bg-byd-blue/90 disabled:bg-gray-400">
                        {isLoading ? <><Loader2Icon /> Fetching...</> : 'Fetch Latest Vessel Data'}
                    </button>
                </div>
                {updateLog.length > 0 && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="font-semibold text-gray-700">Update Log</h4>
                        <pre className="mt-2 bg-gray-50 p-4 rounded-md text-xs h-64 overflow-y-auto font-mono">
                            {updateLog.map((line, index) => {
                                const typeClass = line.startsWith('[SUCCESS]') ? 'text-green-600' :
                                    line.startsWith('[WARNING]') ? 'text-yellow-600' :
                                    line.startsWith('[ERROR]') ? 'text-red-600' :
                                    line.startsWith('[INFO]') ? 'text-gray-500' : '';
                                return <div key={index} className={typeClass}>{line}</div>
                            })}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VesselUpdateService;