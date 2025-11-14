
import React, { useState } from 'react';

interface LoginScreenProps {
    onLogin: (username: string, pass: string) => void;
    error: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, error }) => {
    const [username, setUsername] = useState('luizmugnai.comex@gmail.com');
    const [password, setPassword] = useState('Byd@N1');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(username, password);
    };

    return (
        <div className="fixed inset-0 bg-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-lg shadow-xl p-8 space-y-6 animate-scale-in">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-byd-blue">BYD Navigator</h1>
                    <p className="text-gray-600 mt-2">Please enter your credentials</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username (Email)</label>
                        <input type="email" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                    </div>
                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                    <button type="submit" className="w-full p-2 bg-byd-blue text-white font-semibold rounded-md hover:bg-byd-blue/90">Login</button>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;