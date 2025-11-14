
import React, { useState, useMemo } from 'react';
import { FiveW2H, LogisticsEntry, User } from '../types';
import { get5W2HStatusPillClass, toDisplayDate } from '../utils/helpers';
import { EditIcon, TrashIcon, CloseIcon, AlertCircleIcon } from './common/Icons';

// --- Form Modal Component ---
const FiveW2HFormModal: React.FC<{ item?: FiveW2H, onSave: (item: FiveW2H) => void, onCancel: () => void, allEntries: LogisticsEntry[], allUsers: User[] }> = 
({ item, onSave, onCancel, allEntries, allUsers }) => {
    const [formData, setFormData] = useState<Partial<FiveW2H>>(item || {
        what: '', why: '', who: '', where: '', when: '', how: '', howMuch: 0, currency: 'BRL', status: 'Open'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
    };

    const handleRelatedToChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        if (selectedId) {
            const selectedEntry = allEntries.find(entry => entry.id === selectedId);
            if (selectedEntry) {
                setFormData(prev => ({ ...prev, relatedTo: { type: 'LogisticsEntry', id: selectedId, label: `CNTR: ${selectedEntry.cntrsOriginal} / BL: ${selectedEntry.bl}` } }));
            }
        } else {
            setFormData(prev => ({ ...prev, relatedTo: undefined }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as FiveW2H);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" onClick={onCancel}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b flex justify-between items-center"><h3 className="text-xl font-semibold">{item ? 'Edit' : 'New'} Action Item</h3><button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button></div>
                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">What (needs to be done?)</label>
                                <input type="text" name="what" value={formData.what} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Why (does it need to be done?)</label>
                                <textarea name="why" value={formData.why} onChange={handleChange} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Who (is responsible?)</label>
                                <select name="who" value={formData.who} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2">
                                    <option value="">Select User</option>
                                    {allUsers.map(user => <option key={user.id} value={user.name}>{user.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">When (Due Date)</label>
                                <input type="date" name="when" value={formData.when} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Where (will it be done?)</label>
                                <input type="text" name="where" value={formData.where} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">How (will it be done?)</label>
                                <textarea name="how" value={formData.how} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"></textarea>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">How Much (Cost)</label>
                                <input type="number" step="0.01" name="howMuch" value={formData.howMuch} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Currency</label>
                                <select name="currency" value={formData.currency} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2">
                                    <option value="BRL">BRL</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="CNY">CNY</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2">
                                    <option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Related To (Container)</label>
                                <select value={formData.relatedTo?.id || ''} onChange={handleRelatedToChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2">
                                    <option value="">None</option>
                                    {allEntries.map(entry => <option key={entry.id} value={entry.id}>{`CNTR: ${entry.cntrsOriginal} / BL: ${entry.bl}`}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                        <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-byd-blue text-base font-medium text-white hover:bg-byd-blue/90 sm:ml-3 sm:w-auto sm:text-sm">{item ? 'Save' : 'Create'}</button>
                        <button type="button" onClick={onCancel} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main Page Component ---
interface FiveW2HPageProps {
    data: FiveW2H[]; onSave: (item: FiveW2H) => void; onDelete: (id: string) => void; allEntries: LogisticsEntry[]; allUsers: User[];
}

const FiveW2HPage: React.FC<FiveW2HPageProps> = ({ data, onSave, onDelete, allEntries, allUsers }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<FiveW2H | undefined>(undefined);

    const filteredData = useMemo(() => {
        return data.filter(item => 
            (searchTerm === '' || item.what.toLowerCase().includes(searchTerm.toLowerCase()) || item.who.toLowerCase().includes(searchTerm.toLowerCase()) || item.relatedTo?.label.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (statusFilter === 'All' || item.status === statusFilter)
        );
    }, [data, searchTerm, statusFilter]);

    const handleSave = (item: FiveW2H) => {
        onSave(item);
        setIsModalOpen(false);
    };

    return (
        <div className="bg-white rounded-lg shadow-md">
             <div className="p-4 border-b">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-800">5W2H Action Plan</h2>
                    <div className="flex items-center gap-2">
                        <input type="text" placeholder="Search actions..." className="p-2 border rounded-md text-sm w-48" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border rounded-md text-sm">
                            <option value="All">All Statuses</option><option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option>
                        </select>
                        <button onClick={() => { setEditingItem(undefined); setIsModalOpen(true); }} className="p-2 bg-byd-blue text-white font-semibold rounded-md hover:bg-byd-blue/90 text-sm">New Action</button>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            {['What', 'Who', 'When (Due)', 'Related To', 'Status', 'Actions'].map(h => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(item => (
                            <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-4 py-2 max-w-sm whitespace-normal">{item.what}</td>
                                <td className="px-4 py-2">{item.who}</td>
                                <td className="px-4 py-2">{toDisplayDate(item.when)}</td>
                                <td className="px-4 py-2">{item.relatedTo?.label || 'N/A'}</td>
                                <td className="px-4 py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${get5W2HStatusPillClass(item.status)}`}>{item.status}</span></td>
                                <td className="px-4 py-2 flex items-center gap-2">
                                    <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-1 text-blue-600 hover:text-blue-800"><EditIcon /></button>
                                    <button onClick={() => onDelete(item.id)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <FiveW2HFormModal item={editingItem} onSave={handleSave} onCancel={() => setIsModalOpen(false)} allEntries={allEntries} allUsers={allUsers} />}
        </div>
    );
};

export default FiveW2HPage;
