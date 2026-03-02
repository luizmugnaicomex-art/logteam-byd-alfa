
import React, { useState } from 'react';
import { User } from '../types';
import { AlertCircleIcon, CheckCircleIcon } from './common/Icons';

interface AdminPageProps {
    user: User;
    onPasswordChange: (pass: string) => Promise<void>;
}

const AdminPage: React.FC<AdminPageProps> = ({ user, onPasswordChange }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setSuccess('');

        if (!password || !confirmPassword) return setError('Please fill out both password fields.');
        if (password !== confirmPassword) return setError('Passwords do not match.');
        if (password.length < 6) return setError('Password must be at least 6 characters long.');

        try {
            await onPasswordChange(password);
            setSuccess('Password changed successfully!');
            setPassword(''); setConfirmPassword('');
        } catch (err: any) {
            setError(err.message || 'Failed to change password.');
        }
    };

    return (
        <div className="space-y-6">
            <header><h1 className="text-3xl font-bold text-gray-800">Admin Settings</h1></header>
            <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-gray-800">Change My Password</h3>
                <p className="text-gray-600 mt-1">Update the password for your account ({user.username}).</p>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center"><AlertCircleIcon /> <span className="ml-2">{error}</span></div>}
                    {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center"><CheckCircleIcon /> <span className="ml-2">{success}</span></div>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">New Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="px-4 py-2 bg-byd-blue text-white font-semibold rounded-md hover:bg-byd-blue/90">Update Password</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminPage;