import React, { useState } from 'react';
import { CloseIcon } from './common/Icons';

interface SchedulingModalProps {
    count: number;
    onClose: () => void;
    onConfirm: (date: string) => void;
}

const SchedulingModal: React.FC<SchedulingModalProps> = ({ count, onClose, onConfirm }) => {
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);

    const handleConfirm = () => {
        if (deliveryDate) {
            onConfirm(deliveryDate);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-semibold">Schedule Delivery</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button>
                </div>
                <div className="p-6 space-y-4">
                    <p>Set a delivery date for the <strong>{count}</strong> selected item(s).</p>
                    <div>
                        <label htmlFor="deliveryDate" className="block text-sm font-medium text-gray-700">Estimated Delivery Date</label>
                        <input
                            type="date"
                            id="deliveryDate"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-byd-blue focus:ring-byd-blue sm:text-sm p-2"
                        />
                    </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                    <button onClick={handleConfirm} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-byd-blue text-base font-medium text-white hover:bg-byd-blue/90 sm:ml-3 sm:w-auto sm:text-sm">Confirm Schedule</button>
                    <button onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default SchedulingModal;