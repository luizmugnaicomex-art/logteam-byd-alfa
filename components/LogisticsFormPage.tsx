import React, { useState } from 'react';
import { LogisticsEntry } from '../types';
import { toDisplayDate, fromDisplayDate } from '../utils/helpers';
import { BackIcon, CloseIcon } from './common/Icons';

interface LogisticsFormPageProps {
    onSave: (entry: LogisticsEntry | LogisticsEntry[]) => void;
    onCancel: () => void;
    existingEntry?: LogisticsEntry;
}

const LogisticsFormPage: React.FC<LogisticsFormPageProps> = ({ onSave, onCancel, existingEntry }) => {
    const [entry, setEntry] = useState<Partial<LogisticsEntry>>(existingEntry || {
        cntrsOriginal: '', bl: '', statusComex: ''
    });
    const [containerInput, setContainerInput] = useState('');
    const [containerList, setContainerList] = useState<string[]>(existingEntry?.cntrsOriginal ? [existingEntry.cntrsOriginal] : []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        // Exact 64-column structural alignment for numeric conversion
        const numberFields: (keyof LogisticsEntry)[] = [
            'quantity', 'valuePerCntr', 'freeTime', 
            'daysDemurrage1Period', 'costDemurrage1Period', 
            'daysDemurrage2Period', 'costDemurrage2Period', 
            'daysDemurrage3Period', 'costDemurrage3Period', 
            'costDemurrageTotal'
        ];

        // Exact 64-column structural alignment for date conversion
        const dateFields: (keyof LogisticsEntry)[] = [
            'dateNotaFiscal', 'channelDate', 'arrivalVessel', 'ata', 
            'cargoReadyDate', 'deadlinePickUpDsa', 'desembaracoDeadlineReturnCntr', 
            'unloadDate', 'estimatedDeliveryDate', 'deliveryDateAtByd', 
            'estimatedDepotDate', 'actualDepotReturnDate', 'storageDeadline',
            'demurrageStarted1Periodo', 'demurrageStarted2Period', 'demurrageStarted3Period'
        ];

        let processedValue: string | number | null = value;
        if (numberFields.includes(name as keyof LogisticsEntry)) {
            processedValue = value === '' ? null : parseFloat(value);
            if (isNaN(processedValue as number)) processedValue = null;
        } else if (dateFields.includes(name as keyof LogisticsEntry)) {
            processedValue = fromDisplayDate(value);
        }

        setEntry(prev => ({ ...prev, [name]: processedValue }));
    };

    const handleContainerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
            e.preventDefault();
            addContainersFromInput();
        }
    };

    const addContainersFromInput = () => {
        if (!containerInput.trim()) return;
        const newContainers = containerInput
            .split(/,|\s|\n/)
            .map(c => c.trim())
            .filter(c => c.length > 0)
            .filter(c => !containerList.includes(c)); // avoid duplicates
            
        if (newContainers.length > 0) {
            setContainerList(prev => [...prev, ...newContainers]);
        }
        setContainerInput('');
    };

    const removeContainer = (indexToRemove: number) => {
        setContainerList(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let currentContainers = [...containerList];
        if (containerInput.trim()) {
            const pending = containerInput.split(/,|\s|\n/).map(c => c.trim()).filter(c => c.length > 0 && !currentContainers.includes(c));
            if (pending.length > 0) {
                currentContainers = [...currentContainers, ...pending];
                setContainerList(currentContainers);
                setContainerInput('');
            }
        }

        if (currentContainers.length === 0) {
            alert('Please add at least one container.');
            return;
        }

        if (existingEntry) {
            onSave({
                ...entry,
                cntrsOriginal: currentContainers[0]
            } as LogisticsEntry);
        } else {
            if (currentContainers.length === 1) {
                onSave({
                    ...entry,
                    cntrsOriginal: currentContainers[0]
                } as LogisticsEntry);
            } else {
                const entriesToSave = currentContainers.map(c => ({
                    ...entry,
                    cntrsOriginal: c
                } as LogisticsEntry));
                onSave(entriesToSave);
            }
        }
    };

    const FormField: React.FC<{label: string, name: keyof LogisticsEntry, type?: string, options?: string[]}> = ({label, name, type='text', options}) => {
        let value = entry[name];
        let displayValue = value === null || value === undefined ? '' : String(value);
        if (type === 'date') displayValue = toDisplayDate(displayValue);

        return (
            <div>
                <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
                {type === 'select' ? (
                     <select id={name} name={name} value={displayValue} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-byd-blue focus:ring-byd-blue sm:text-sm p-2">
                        <option value="">Select...</option>
                        {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                ) : (
                    <input type={type === 'date' ? 'text' : type} id={name} name={name} value={displayValue} onChange={handleChange} placeholder={type === 'date' ? 'dd/mm/yyyy' : ''} step={type === 'number' ? '0.01' : undefined} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-byd-blue focus:ring-byd-blue sm:text-sm p-2" />
                )}
            </div>
        );
    }
    
    const FormTextArea: React.FC<{label: string, name: keyof LogisticsEntry}> = ({label, name}) => (
        <div className="sm:col-span-3">
             <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
             <textarea id={name} name={name} value={(entry[name] as string) || ''} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-byd-blue focus:ring-byd-blue sm:text-sm p-2"></textarea>
        </div>
    )

    const FormSection: React.FC<{title: string, children: React.ReactNode}> = ({title, children}) => (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">{title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{children}</div>
        </div>
    )

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <header className="flex items-center gap-4">
                <button type="button" className="p-2 rounded-full hover:bg-gray-200" onClick={onCancel}><BackIcon /></button>
                <h1 className="text-2xl font-bold text-gray-800">{existingEntry ? `Edit: ${existingEntry.cntrsOriginal}` : 'New Logistics Entry'}</h1>
            </header>
            
            <FormSection title="Core Identifiers">
                <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">Containers (CNTRS)</label>
                    <div className="mt-1 flex flex-wrap gap-2 p-2 border rounded-md border-gray-300 focus-within:ring-byd-blue focus-within:border-byd-blue bg-white min-h-[42px] cursor-text" onClick={() => document.getElementById('containerInput')?.focus()}>
                        {containerList.map((c, i) => (
                             <span key={i} className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-md text-sm text-gray-800 font-medium shadow-sm">
                                 {c}
                                 <button type="button" onClick={() => removeContainer(i)} className="text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-200 transition-colors [&>svg]:w-3.5 [&>svg]:h-3.5 flex items-center justify-center">
                                     <CloseIcon />
                                 </button>
                             </span>
                        ))}
                         <input 
                             id="containerInput"
                             type="text" 
                             value={containerInput}
                             onChange={e => setContainerInput(e.target.value)}
                             onKeyDown={handleContainerKeyDown}
                             onBlur={addContainersFromInput}
                             placeholder={containerList.length === 0 ? "Enter container & press space/comma..." : ""}
                             className="flex-1 min-w-[200px] outline-none text-sm bg-transparent py-1" 
                         />
                    </div>
                    {containerList.length === 0 && <p className="text-xs text-gray-500 mt-1">Press Space, Enter, or type Comma to add multiple containers. You can also paste a list.</p>}
                </div>
                <FormField label="BL" name="bl" />
                <FormField label="PO SAP" name="poSap" />
                <FormField label="Shipper" name="shipper" />
                <FormField label="Freight Forwarder" name="freightForwarder" />
                <FormField label="Shipowner" name="shipowner" />
                <FormField label="Bonded Warehouse" name="bondedWarehouse" />
                <FormField label="Batch" name="batch" />
                <FormField label="Component" name="component" />
                <FormField label="Description" name="description" />
                <FormField label="Quantity" name="quantity" type="number"/>
                <FormField label="Type of Cargo" name="typeOfCargo" />
                <FormField label="Cost Center" name="costCenter" />
                <FormField label="Comex Sponsor" name="comexSponsor" />
                <FormField label="Responsible Analyst" name="responsibleAnalyst" />
            </FormSection>

            <FormSection title="Status & Dates">
                <FormField label="Status (COMEX)" name="statusComex" />
                <FormField label="Status" name="status" />
                <FormField label="Status Depot" name="statusDepot" />
                <FormField label="Status CNTR Warehouse" name="statusCntrWarehouse" />
                <FormField label="Damage Status" name="damageStatus" />
                <FormField label="Pending Depot Return" name="pendingDepotReturn" />
                <FormField label="Arrival Vessel" name="arrivalVessel" />
                <FormField label="ATA" name="ata" type="date" />
                <FormField label="Cargo Ready Date" name="cargoReadyDate" type="date" />
                <FormField label="Deadline Pick Up DSA" name="deadlinePickUpDsa" type="date" />
                <FormField label="Desembaraço Deadline Return CNTR" name="desembaracoDeadlineReturnCntr" type="date" />
                <FormField label="Unload Date" name="unloadDate" type="date" />
                <FormField label="Est. Delivery Date" name="estimatedDeliveryDate" type="date" />
                <FormField label="Delivery Date AT BYD" name="deliveryDateAtByd" type="date" />
                <FormField label="Estimated Depot Date" name="estimatedDepotDate" type="date" />
                <FormField label="Actual Depot Return Date" name="actualDepotReturnDate" type="date" />
            </FormSection>

            <FormSection title="Customs & Financials">
                <FormField label="DI" name="di" />
                <FormField label="Parametrization" name="parametrization" />
                <FormField label="Channel Date" name="channelDate" type="date" />
                <FormField label="Nota Fiscal" name="notaFiscal" />
                <FormField label="Date Nota Fiscal" name="dateNotaFiscal" type="date" />
                <FormField label="Value Per CNTR" name="valuePerCntr" type="number" />
                <FormField label="Free Time (days)" name="freeTime" type="number" />
                <FormField label="Incoterm" name="incoterm" />
                <FormField label="Storage Deadline" name="storageDeadline" type="date" />
            </FormSection>
            
            <FormSection title="Transportation">
                <FormField label="Carrier" name="carrier" />
                <FormField label="Type of Truck" name="typeOfTruck" />
                <FormField label="TMS Despatch No" name="tmsDespatchNo" />
                <FormField label="On-site Place of Delivery" name="onSitePlaceOfDelivery" />
                <FormField label="Depot" name="depot" />
            </FormSection>

            <FormSection title="Demurrage">
                <FormField label="Started (1°)" name="demurrageStarted1Periodo" type="date" />
                <FormField label="Days (1°)" name="daysDemurrage1Period" type="number" />
                <FormField label="Cost (1°)" name="costDemurrage1Period" type="number" />
                <FormField label="Started (2°)" name="demurrageStarted2Period" type="date" />
                <FormField label="Days (2°)" name="daysDemurrage2Period" type="number" />
                <FormField label="Cost (2°)" name="costDemurrage2Period" type="number" />
                <FormField label="Started (3°)" name="demurrageStarted3Period" type="date" />
                <FormField label="Days (3°)" name="daysDemurrage3Period" type="number" />
                <FormField label="Cost (3°)" name="costDemurrage3Period" type="number" />
                <FormField label="Cost Total" name="costDemurrageTotal" type="number" />
                <FormField label="Cost (BYD/Terceiros)" name="costBydOuTerceiros" />
                <FormField label="Dispute (Y/N)" name="disputeYOrN" type="select" options={['Y', 'N']} />
            </FormSection>

            <FormSection title="Packing List (Romaneio)">
                <FormField label="Romaneio ID/No" name="romaneio" />
                <FormField label="Made Romaneio" name="madeRomaneio" />
                <FormField label="Signed Romaneio" name="signedRomaneio" />
                <FormField label="Received Romaneio" name="receivedRomaneio" />
                <FormField label="Scanned Romaneio" name="scannedRomaneio" />
                <FormTextArea label="Romaneio Observations" name="romaneioObs" />
            </FormSection>

            <div className="flex justify-end gap-4 sticky bottom-0 bg-gray-100 py-4">
                <button type="button" className="px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50" onClick={onCancel}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-byd-blue text-white font-semibold rounded-md hover:bg-byd-blue/90">Save Entry</button>
            </div>
        </form>
    );
};

export default LogisticsFormPage;
