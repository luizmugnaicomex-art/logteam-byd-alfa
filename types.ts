

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
    shipper?: string;
    freightForwarder?: string;
    shipowner?: string;
    bondedWarehouse?: string;
    bl?: string;
    cntrsOriginal?: string;
    responsibleAnalyst?: string;
    poSap?: string;
    batch?: string;
    quantity?: number;
    component?: string;
    loadingType?: string;
    description?: string;
    typeOfCargo?: string;
    costCenter?: string;
    comexSponsor?: string;
    dsa?: string;
    arrivalVessel?: string;
    ata?: string;
    freeTime?: number;
    di?: string;
    parametrization?: string;
    channelDate?: string;
    dateNotaFiscal?: string;
    cargoReadyDate?: string;
    deadlinePickUpDsa?: string;
    deadlineReturnCntr?: string;
    unloadDate?: string;
    estimatedDeliveryDate?: string;
    deliveryDateAtByd?: string;
    estimatedDepotDate?: string;
    actualDepotReturnDate?: string;
    storageDeadline?: string;
    valuePerCntr?: number;
    notaFiscal?: string;
    costDemurrageTotal?: number;
    costBydOuTerceiros?: string;
    statusComex?: string;
    incoterm?: string;
    cntrBbkAir?: string;
    originalCntrModel?: string;
    cntrsRent?: string;
    statusCntrWarehouse?: string;
    pendingDepotReturn?: string;
    localizationCntr?: string;
    damageStatus?: string;
    status?: string;
    statusDepot?: string;
    cntrReturn?: string;
    carrier?: string;
    tmsDespatchNo?: string;
    typeOfTruck?: string;
    onSitePlaceOfDelivery?: string;
    carrierBufferXDepot?: string;
    depot?: string;
    romaneio?: string;
    madeRomaneio?: string;
    signedRomaneio?: string;
    receivedRomaneio?: string;
    scannedRomaneio?: string;
    romaneioObs?: string;
    demurrageStarted1?: string;
    daysDemurrage1?: number;
    costDemurrage1?: number;
    demurrageStarted2?: string;
    daysDemurrage2?: number;
    costDemurrage2?: number;
    demurrageStarted3?: string;
    daysDemurrage3?: number;
    costDemurrage3?: number;
    disputeYOrN?: string;
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