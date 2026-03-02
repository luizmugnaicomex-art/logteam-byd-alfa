

import React from 'react';
import { User } from '../types';
import { DashboardIcon, ImportsIcon, ReportIcon, UserIcon, LogoutIcon, DeliveryTruckIcon, CalendarIcon, TeamIcon, AdminIcon, ChartBarIcon, WandIcon } from './common/Icons';

interface SidebarProps {
    onNavigate: (view: string) => void;
    activeView: string;
    onLogout: () => void;
    loggedInUser: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, activeView, onLogout, loggedInUser }) => {
    const navItems = [
        { label: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' },
        { label: 'Logistics', icon: <ImportsIcon />, view: 'logistics' },
        { label: 'Painel de Entregas', icon: <DeliveryTruckIcon />, view: 'deliverypanel' },
        { label: 'Calendario', icon: <CalendarIcon />, view: 'calendario' },
        { label: 'FUP Report', icon: <ReportIcon />, view: 'fupreport' },
    ];
    
    const toolNavItems = [
        { label: 'Vessel Updates', icon: <WandIcon />, view: 'vesselupdates' },
    ];

    const adminNavItems = [
        { label: 'Team', icon: <TeamIcon />, view: 'team' },
        { label: 'Admin', icon: <AdminIcon />, view: 'admin' },
    ];

    const isActive = (view: string) => activeView.startsWith(view);

    const renderLink = (item: {label: string, icon: React.ReactNode, view: string}) => (
         <a
            key={item.label}
            href="#"
            onClick={(e) => { e.preventDefault(); onNavigate(item.view); }}
            className={`flex items-center px-2 py-2.5 text-sm font-medium rounded-md transition-colors ${
                isActive(item.view)
                    ? 'bg-byd-blue text-white'
                    : 'hover:bg-navy-light hover:text-white'
            }`}
        >
            <div className="mr-3 h-6 w-6">{item.icon}</div>
            {item.label}
        </a>
    );

    return (
        <aside className="bg-navy-dark text-gray-300 w-64 flex flex-col fixed inset-y-0 left-0 z-30">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                <div className="flex items-center flex-shrink-0 px-4">
                    <h1 className="text-2xl font-bold text-white">BYD Navigator</h1>
                </div>
                <nav className="mt-5 flex-1 px-2 space-y-1">
                    {navItems.map(renderLink)}
                    
                    <div className="pt-2 mt-2 border-t border-navy-light">
                         <p className="px-2 pt-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tools</p>
                        {toolNavItems.map(renderLink)}
                    </div>

                    {loggedInUser?.role === 'Admin' && (
                        <>
                            <div className="pt-2 mt-2 border-t border-navy-light">
                                <p className="px-2 pt-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
                                {adminNavItems.map(renderLink)}
                            </div>
                        </>
                    )}
                </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-navy-light p-4">
                <div className="flex-shrink-0 w-full group block">
                    <div className="flex items-center">
                        <div className="bg-gray-500 rounded-full h-10 w-10 flex items-center justify-center text-white">
                            <UserIcon />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-white">{loggedInUser?.name}</p>
                            <p className="text-xs font-medium text-gray-400">{loggedInUser?.role}</p>
                        </div>
                        <button onClick={onLogout} className="ml-auto text-gray-400 hover:text-white transition-colors" title="Logout">
                           <LogoutIcon />
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;