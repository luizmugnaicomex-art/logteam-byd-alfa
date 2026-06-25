

export enum ComexStatus {
    CargoDelivered = 'CARGO DELIVERED',
    Pending = 'PENDENTE',
    Default = 'N/A',
}

export enum CntrWarehouseStatus {
    Loaded = 'LOADED',
    Pending = 'PENDENTE',
    SemInfo = 'SEM INFO',
    Default = 'N/A',
}

export enum DepotStatus {
    Entregue = 'ENTREGUE',
    Pendente = 'PENDENTE',
}

export interface LogisticsEntry {
    id: string;
    
    // Core Identifiers & Entities
    cntrsOriginal: string;         // Mandatory Key
    shipper?: string;
    freightForwarder?: string;
    shipowner?: string;
    bondedWarehouse?: string;
    bl?: string;
    responsibleAnalyst?: string;
    poSap?: string;
    batch?: string;
    component?: string;
    description?: string;
    typeOfCargo?: string;
    costCenter?: string;
    comexSponsor?: string;
    quantity?: number;

    // Status & Workflow
    statusComex?: string;
    status?: string;
    statusDepot?: string;
    statusCntrWarehouse?: string;
    damageStatus?: string;
    pendingDepotReturn?: string;

    // Customs & Financial
    di?: string;
    notaFiscal?: string;
    dateNotaFiscal?: string | Date;
    parametrization?: string;
    channelDate?: string | Date;
    valuePerCntr?: number;
    incoterm?: string;

    // Transportation & Delivery
    carrier?: string;
    typeOfTruck?: string;
    tmsDespatchNo?: string;
    onSitePlaceOfDelivery?: string;
    depot?: string;

    // Dates & Timelines
    arrivalVessel?: string;
    ata?: string | Date;
    cargoReadyDate?: string | Date;
    deadlinePickUpDsa?: string | Date;
    desembaracoDeadlineReturnCntr?: string | Date;
    unloadDate?: string | Date;
    estimatedDeliveryDate?: string | Date;
    deliveryDateAtByd?: string | Date;
    estimatedDepotDate?: string | Date;
    actualDepotReturnDate?: string | Date;
    storageDeadline?: string | Date;

    // Demurrage Cost Control
    freeTime?: number;
    demurrageStarted1Periodo?: string | Date;
    daysDemurrage1Period?: number;
    costDemurrage1Period?: number;
    demurrageStarted2Period?: string | Date;
    daysDemurrage2Period?: number;
    costDemurrage2Period?: number;
    demurrageStarted3Period?: string | Date;
    daysDemurrage3Period?: number;
    costDemurrage3Period?: number;
    costDemurrageTotal?: number;
    costBydOuTerceiros?: string;
    disputeYOrN?: string;

    // Romaneio (Packing List)
    romaneio?: string;
    madeRomaneio?: string;
    signedRomaneio?: string;
    receivedRomaneio?: string;
    scannedRomaneio?: string;
    romaneioObs?: string;

    // Track Metadata
    fileName?: string;
    originalCntrModel?: string;

    // Keep some extra properties that might be used by components until fixed
    cntrsRent?: string;
    localizationCntr?: string;
    cntrReturn?: string;
    carrierBufferXDepot?: string;
    observation?: string;
    desconsiderar?: string;
    averageTimeDeliveredBydXDepot?: number;
    averageTimeDateNfXDeliveredByd?: number;
    dayEstimated?: string;
    dayEstimated2?: string;
    yearEstimated?: number;
    weekDelivery?: string;
    dayDelivery?: string;
    yearDelivery?: number;
    monthAta?: string;
    yearAta?: number;
}


export interface Claim {
    id: string;
    importBl: string;
    status: 'Resolved' | 'Rejected' | 'Open' | 'In Progress';
    amount: number;
}

export interface Task {
    id: string;
    description: string;
    assignedToId: string;
    status: 'Completed' | 'In Progress' | 'Pending';
    dueDate?: string;
}

export type UserRole = 'Admin' | 'COMEX' | 'Broker' | 'Logistics' | 'Finance';

export interface User {
    id: string;
    name: string;
    username: string;
    password?: string;
    role: UserRole;
}

export interface FiveW2H {
    id: string;
    what: string;
    why: string;
    who: string;
    where: string;
    when: string;
    how: string;
    howMuch: number;
    currency: 'USD' | 'BRL' | 'EUR' | 'CNY';
    status: 'Open' | 'In Progress' | 'Completed';
    relatedTo?: {
        type: 'LogisticsEntry';
        id: string;
        label: string;
    };
}