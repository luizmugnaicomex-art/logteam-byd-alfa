
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { EditIcon, TrashIcon, CloseIcon, AlertCircleIcon } from './common/Icons';

// --- Form Modal Component ---
const UserFormModal: React.FC<{ user?: User, onSave: (user: User) => void, onCancel: () => void }> = ({ user, onSave, onCancel }) => {
    const [formData, setFormData] = useState<User>(user || { id: '', name: '', username: '', role: 'Broker', password: '' });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!user && formData.password !== confirmPassword) return setError('Passwords do not match.');
        if (!user && !formData.password) return setError('Password is required for new users.');
        onSave(formData);
    };

    const roles: UserRole[] = ['Admin', 'COMEX', 'Broker', 'Logistics', 'Finance'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" onClick={onCancel}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b flex justify-between items-center"><h3 className="text-xl font-semibold">{user ? 'Edit' : 'New'} User</h3><button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button></div>
                    <div className="p-6 space-y-4">
                        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center"><AlertCircleIcon /> <span className="ml-2">{error}</span></div>}
                        <div><label className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" /></div>
                        <div><label className="block text-sm font-medium text-gray-700">Username (Email)</label><input type="email" name="username" value={formData.username} onChange={handleChange} required readOnly={!!user} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 read-only:bg-gray-100" /></div>
                        <div><label className="block text-sm font-medium text-gray-700">Role</label><select name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2">{roles.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        {!user && (<>
                            <div><label className="block text-sm font-medium text-gray-700">Password</label><input type="password" name="password" value={formData.password} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Confirm Password</label><input type="password" name="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" /></div>
                        </>)}
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                        <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-byd-blue text-base font-medium text-white hover:bg-byd-blue/90 sm:ml-3 sm:w-auto sm:text-sm">{user ? 'Save' : 'Create'}</button>
                        <button type="button" onClick={onCancel} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Main Page Component ---
interface TeamPageProps { users: User[]; onSave: (user: User) => void; onDelete: (id: string) => void; currentUser: User | null; }

const TeamPage: React.FC<TeamPageProps> = ({ users, onSave, onDelete, currentUser }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

    const handleSave = (user: User) => {
        onSave(user);
        setIsModalOpen(false);
    };

    return (
        <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800">User Management</h2><button onClick={() => {setEditingUser(undefined); setIsModalOpen(true);}} className="p-2 bg-byd-blue text-white font-semibold rounded-md hover:bg-byd-blue/90 text-sm">New User</button></div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50"><tr><th scope="col" className="px-6 py-3">Name</th><th scope="col" className="px-6 py-3">Role</th><th scope="col" className="px-6 py-3">Actions</th></tr></thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                                <td className="px-6 py-4">{user.role}</td>
                                <td className="px-6 py-4 flex items-center gap-4">
                                    <button onClick={() => {setEditingUser(user); setIsModalOpen(true);}} className="p-1 text-blue-600 hover:text-blue-800"><EditIcon /></button>
                                    <button onClick={() => onDelete(user.id)} disabled={currentUser?.id === user.id} className="p-1 text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed" title={currentUser?.id === user.id ? "Cannot delete self" : `Delete ${user.name}`}><TrashIcon /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <UserFormModal user={editingUser} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />}
        </div>
    );
};

export default TeamPage;
