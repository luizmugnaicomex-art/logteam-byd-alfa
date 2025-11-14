import React, { useState } from 'react';
import { LogisticsEntry, ComexStatus } from '../types';
import { toDisplayDate, fromDisplayDate } from '../utils/helpers';
import { BackIcon } from './common/Icons';

interface LogisticsFormPageProps {
    onSave: (entry: LogisticsEntry) => void;
    onCancel: () => void;
    existingEntry?: LogisticsEntry;
}

const LogisticsFormPage: React.FC<LogisticsFormPageProps> = ({ onSave, onCancel, existingEntry }) => {
    const [entry, setEntry] = useState<Partial<LogisticsEntry>>(existingEntry || {
        cntrsOriginal: '', bl: '', statusComex: ComexStatus.Default
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        const numberFields: (keyof LogisticsEntry)[] = ['freeTime', 'valuePerCntr', 'costDemurrageTotal', 'daysDemurrage1', 'costDemurrage1', 'daysDemurrage2', 'costDemurrage2', 'daysDemurrage3', 'costDemurrage3', 'averageTimeDeliveredBydXDepot', 'averageTimeDateNfXDeliveredByd', 'yearEstimated', 'yearDelivery', 'yearAta', 'quantity'];
        const dateFields: (keyof LogisticsEntry)[] = ['ata', 'channelDate', 'dateNotaFiscal', 'cargoReadyDate', 'deadlinePickUpDsa', 'deadlineReturnCntr', 'unloadDate', 'estimatedDeliveryDate', 'deliveryDateAtByd', 'estimatedDepotDate', 'actualDepotReturnDate', 'storageDeadline', 'demurrageStarted1', 'demurrageStarted2', 'demurrageStarted3'];

        let processedValue: string | number | null = value;
        if (numberFields.includes(name as keyof LogisticsEntry)) {
            processedValue = value === '' ? null : parseFloat(value);
            if (isNaN(processedValue as number)) processedValue = null;
        } else if (dateFields.includes(name as keyof LogisticsEntry)) {
            processedValue = fromDisplayDate(value);
        }

        setEntry(prev => ({ ...prev, [name]: processedValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(entry as LogisticsEntry);
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
                <FormField label="Container (CNTRS)" name="cntrsOriginal" />
                <FormField label="BL" name="bl" />
                <FormField label="PO SAP" name="poSap" />
                <FormField label="Shipper" name="shipper" />
                <FormField label="Freight Forwarder" name="freightForwarder" />
                <FormField label="Shipowner" name="shipowner" />
                <FormField label="Description" name="description" />
                <FormField label="Quantity" name="quantity" type="number"/>
                <FormField label="Type of Cargo" name="typeOfCargo" />
                <FormField label="Responsible Analyst" name="responsibleAnalyst" />
            </FormSection>

            <FormSection title="Status & Dates">
                <FormField label="Status (COMEX)" name="statusComex" />
                <FormField label="Status CNTR Warehouse" name="statusCntrWarehouse" />
                <FormField label="Status" name="status" />
                <FormField label="Status Depot" name="statusDepot" />
                <FormField label="Arrival Vessel" name="arrivalVessel" />
                <FormField label="ATA" name="ata" type="date" />
                <FormField label="Cargo Ready" name="cargoReadyDate" type="date" />
                <FormField label="Est. Delivery Date" name="estimatedDeliveryDate" type="date" />
                <FormField label="Delivery Date AT BYD" name="deliveryDateAtByd" type="date" />
                <FormField label="Actual Depot Return" name="actualDepotReturnDate" type="date" />
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
            </FormSection>

            <FormSection title="Demurrage">
                <FormField label="Started (1°)" name="demurrageStarted1" type="date" />
                <FormField label="Days (1°)" name="daysDemurrage1" type="number" />
                <FormField label="Cost (1°)" name="costDemurrage1" type="number" />
                <FormField label="Started (2°)" name="demurrageStarted2" type="date" />
                <FormField label="Days (2°)" name="daysDemurrage2" type="number" />
                <FormField label="Cost (2°)" name="costDemurrage2" type="number" />
                <FormField label="Started (3°)" name="demurrageStarted3" type="date" />
                <FormField label="Days (3°)" name="daysDemurrage3" type="number" />
                <FormField label="Cost (3°)" name="costDemurrage3" type="number" />
                <FormField label="Cost Total" name="costDemurrageTotal" type="number" />
                <FormField label="Cost (BYD/Terceiros)" name="costBydOuTerceiros" />
                <FormField label="Dispute (Y/N)" name="disputeYOrN" type="select" options={['Y', 'N']} />
            </FormSection>

            <FormSection title="Observations">
                <FormTextArea label="Observation" name="observation" />
                <FormTextArea label="Romaneio Obs" name="romaneioObs" />
            </FormSection>

            <div className="flex justify-end gap-4 sticky bottom-0 bg-gray-100 py-4">
                <button type="button" className="px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50" onClick={onCancel}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-byd-blue text-white font-semibold rounded-md hover:bg-byd-blue/90">Save Entry</button>
            </div>
        </form>
    );
};

export default LogisticsFormPage;