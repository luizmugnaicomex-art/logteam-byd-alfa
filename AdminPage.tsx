
import React from 'react';
import { LogisticsEntry } from '../types';
import VesselUpdateService from './VesselUpdateService';

interface VesselUpdatePageProps {
    entries: LogisticsEntry[];
    onVesselUpdates: (updatedEntries: Partial<LogisticsEntry>[]) => void;
}

const VesselUpdatePage: React.FC<VesselUpdatePageProps> = ({ entries, onVesselUpdates }) => {
    return (
         <VesselUpdateService
            entries={entries}
            onVesselUpdates={onVesselUpdates}
        />
    );
};

export default VesselUpdatePage;
