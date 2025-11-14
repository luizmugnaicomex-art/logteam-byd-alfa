

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { initializeApp }from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, Firestore } from 'firebase/firestore';

import { LogisticsEntry, User, ComexStatus } from './types';
import { removeUndefinedFields } from './utils/helpers';
import { parseLogisticsFile } from './services/fileParser';

import Sidebar from './components/Sidebar';
import DashboardPage from './components/DashboardPage';
import LogisticsListPage from './components/LogisticsListPage';
import LogisticsFormPage from './components/LogisticsFormPage';
import FUPReportPage from './components/FUPReportPage';
import VesselUpdateService from './components/VesselUpdateService';
import LoginScreen from './components/LoginScreen';
import ConfirmationModal from './components/ConfirmationModal';
import { Loader2Icon } from './components/common/Icons';
import UploadModal from './components/UploadModal';
import SchedulingModal from './components/SchedulingModal';
import DeliveryPanelPage from './components/DeliveryPanelPage';
import CalendarPage from './components/CalendarPage';

// --- Firebase Service Variables ---
let app: any, auth: any, firestore: Firestore;

// --- Globals from environment ---
declare var __firebase_config: string | undefined;

// --- MOCK MODE & DATA ---
const MOCK_MODE = typeof __firebase_config === 'undefined';

const mockLogisticsEntries: LogisticsEntry[] = [
  { id: 'mock1', cntrsOriginal: 'BMOU4032076', bl: 'BSYX250202315', poSap: '450123456', shipper: 'CHINA EXPORTS', arrivalVessel: 'MSC VITA', ata: '2025-06-11', estimatedDeliveryDate: '2025-11-14', deliveryDateAtByd: '2025-06-21', actualDepotReturnDate: '2025-06-25', statusComex: ComexStatus.CargoDelivered, bondedWarehouse: 'WAREHOUSE A', carrier: 'INTERMARITIMA', quantity: 1 },
  { id: 'mock2', cntrsOriginal: 'MSCU1234567', bl: 'MAEUABC123', poSap: '450123457', shipper: 'GLOBAL IMPORTS', arrivalVessel: 'MAERSK ALABAMA', ata: '2025-07-22', estimatedDeliveryDate: '2025-11-14', deliveryDateAtByd: undefined, actualDepotReturnDate: undefined, statusComex: 'AT THE PORT', bondedWarehouse: 'WAREHOUSE B', carrier: 'INTERMARITIMA', quantity: 1 },
  { id: 'mock3', cntrsOriginal: 'CMAU7654321', bl: 'CMAUXYZ789', poSap: '450123458', shipper: 'OCEANIC TRADING', arrivalVessel: 'COSCO SHIPPING ROSE', ata: undefined, estimatedDeliveryDate: '2025-11-14', deliveryDateAtByd: undefined, actualDepotReturnDate: undefined, statusComex: 'IN TRANSIT', bondedWarehouse: 'WAREHOUSE A', carrier: 'INTERMARITIMA', quantity: 2 },
];
const mockUser: User = { id: 'mock-admin-user', name: 'Dev Admin', username: 'dev@example.com', role: 'Admin' };


const App: React.FC = () => {
    // --- STATE MANAGEMENT ---
    const [logisticsEntries, setLogisticsEntries] = useState<LogisticsEntry[]>([]);
    
    // --- AUTHENTICATION STATE ---
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [loginError, setLoginError] = useState('');
    const [authLoading, setAuthLoading] = useState(true);
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);

    // --- NAVIGATION STATE ---
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [initialListFilter, setInitialListFilter] = useState<{ type: string; value: string } | null>(null);

    // --- MODAL STATE ---
    const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [schedulingIds, setSchedulingIds] = useState<string[]>([]);


    // --- Firebase Initialization Effect ---
    useEffect(() => {
        if (MOCK_MODE) {
            console.warn("RUNNING IN MOCK MODE. Firebase is not initialized.");
            setIsFirebaseReady(true);
            return;
        }

        try {
            const firebaseConfig = JSON.parse(__firebase_config!);
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            firestore = getFirestore(app);
            setIsFirebaseReady(true);
        } catch (error) {
             console.error("Firebase initialization failed:", error);
             setInitError("Failed to initialize application configuration.");
             setAuthLoading(false);
        }
    }, []);

    // --- Auth & Data Loading Effect ---
    useEffect(() => {
        if (!isFirebaseReady) return;

        if (MOCK_MODE) {
            setLoggedInUser(mockUser);
            setLogisticsEntries(mockLogisticsEntries);
            setAuthLoading(false);
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, async (userAuth: FirebaseUser | null) => {
            if (userAuth) {
                const userDocRef = doc(firestore, 'users', userAuth.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setLoggedInUser({ id: userDoc.id, ...userDoc.data() } as User);
                    setLoginError('');
                } else {
                    await signOut(auth).catch(err => console.error("Sign out failed:", err));
                }
            } else {
                setLoggedInUser(null);
            }
            setAuthLoading(false);
        });

        // Firestore listeners
        const unsubLogistics = onSnapshot(collection(firestore, 'logisticsEntries'), (snap) => setLogisticsEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as LogisticsEntry))));
        
        return () => {
            unsubscribeAuth();
            unsubLogistics();
        };
    }, [isFirebaseReady]);


    // --- HANDLERS ---
    const handleLogin = async (email: string, pass: string) => {
        if (MOCK_MODE) {
            if(mockUser.username === email) {
                setLoggedInUser(mockUser);
                setLoginError('');
            } else {
                setLoginError("User not found in mock data.");
            }
            return;
        }
        setLoginError('');
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            console.error("Login failed:", errorMessage);
            setLoginError("Login failed. Please check your credentials.");
        }
    };

    const handleLogout = async () => {
        if (MOCK_MODE) {
            setLoggedInUser(null);
            return;
        }
        await signOut(auth);
        setCurrentView('dashboard');
    };

    const handleNavigate = (view: string, filter?: { type: string; value: string }) => {
        setSelectedEntryId(null);
        if (filter) {
            setInitialListFilter(filter);
            setCurrentView('logistics');
        } else {
            setCurrentView(view);
        }
    };

    const handleClearInitialFilter = useCallback(() => setInitialListFilter(null), []);
    const handleSelectEntry = (id: string) => { setSelectedEntryId(id); setCurrentView('logistics/edit'); };
    const handleNewEntry = () => { setSelectedEntryId(null); setCurrentView('logistics/new'); };
    const handleBackToList = () => { setSelectedEntryId(null); setCurrentView('logistics'); };

    const handleOpenSchedulingModal = (ids: string[]) => {
        setSchedulingIds(ids);
    };

    const handleCloseSchedulingModal = () => {
        setSchedulingIds([]);
    };

    const handleScheduleDeliveries = async (date: string) => {
        if (schedulingIds.length === 0) return;
        
        if (MOCK_MODE) {
            setLogisticsEntries(prev => 
                prev.map(e => schedulingIds.includes(e.id) ? { ...e, estimatedDeliveryDate: date, status: 'PENDENTE' } : e)
            );
            console.log(`Mock scheduled ${schedulingIds.length} entries for ${date}`);
            handleCloseSchedulingModal();
            return;
        }

        const batch = writeBatch(firestore);
        schedulingIds.forEach(id => {
            const docRef = doc(firestore, 'logisticsEntries', id);
            batch.update(docRef, { estimatedDeliveryDate: date, status: 'PENDENTE' });
        });
        await batch.commit();
        handleCloseSchedulingModal();
    };


    // --- DATA ACTIONS ---
    const addEntry = async (newEntryData: LogisticsEntry) => {
        if (MOCK_MODE) {
            const entryWithId = { ...newEntryData, id: `mock_${Date.now()}` };
            setLogisticsEntries(prev => [...prev, entryWithId]);
            handleBackToList(); return;
        }
        await addDoc(collection(firestore, 'logisticsEntries'), removeUndefinedFields(newEntryData));
        handleBackToList();
    };

    const updateEntrySilently = async (updatedEntry: LogisticsEntry) => {
        if (MOCK_MODE) {
            setLogisticsEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
            return;
        }
        const { id, ...dataToUpdate } = updatedEntry;
        if (!id) return console.error("Update failed: Missing ID");
        await updateDoc(doc(firestore, 'logisticsEntries', id), removeUndefinedFields(dataToUpdate));
    };

    const updateEntry = async (updatedEntry: LogisticsEntry) => {
        await updateEntrySilently(updatedEntry);
        handleBackToList();
    };

    const initiateDeleteEntry = (id: string) => {
        if (loggedInUser?.role !== 'Admin' && loggedInUser?.role !== 'COMEX') return alert('No permission.');
        setEntryToDeleteId(id);
    };

    const confirmDeleteEntry = async () => {
        if (!entryToDeleteId) return;
        if (MOCK_MODE) {
            setLogisticsEntries(prev => prev.filter(e => e.id !== entryToDeleteId));
            setEntryToDeleteId(null); return;
        }
        await deleteDoc(doc(firestore, 'logisticsEntries', entryToDeleteId));
        setEntryToDeleteId(null);
    };

    const cancelDeleteEntry = () => setEntryToDeleteId(null);

    const handleBulkImport = async (newOrUpdatedEntries: LogisticsEntry[]) => {
       if (MOCK_MODE) {
           const updatedMap = new Map(newOrUpdatedEntries.map(e => [e.cntrsOriginal, e]));
           const newEntries = newOrUpdatedEntries.filter(e => !logisticsEntries.some(le => le.cntrsOriginal === e.cntrsOriginal));
           setLogisticsEntries(prev => [
               ...prev.map(e => updatedMap.get(e.cntrsOriginal!) || e),
               ...newEntries.map((e, i) => ({...e, id: `mock_import_${Date.now() + i}`}))
           ]);
           alert(`Mock import: ${newOrUpdatedEntries.length} records processed.`); return;
       }
        const batch = writeBatch(firestore);
        const entriesRef = collection(firestore, 'logisticsEntries');
        const existingEntriesSnapshot = await getDocs(entriesRef);
        const existingEntryMap = new Map(existingEntriesSnapshot.docs.map(d => [d.data().cntrsOriginal, d.id]));

        newOrUpdatedEntries.forEach(incoming => {
            const docId = existingEntryMap.get(incoming.cntrsOriginal);
            const docRef = docId ? doc(firestore, 'logisticsEntries', docId) : doc(collection(firestore, 'logisticsEntries'));
            batch.set(docRef, removeUndefinedFields(incoming));
        });
        await batch.commit();
    };
    
    const handleVesselUpdates = (updates: Partial<LogisticsEntry>[]) => {
        if(MOCK_MODE) {
             setLogisticsEntries(prev => {
                const updateMap = new Map(updates.map(u => [u.id, u]));
                return prev.map(entry => updateMap.has(entry.id) ? {...entry, ...updateMap.get(entry.id)} : entry);
            });
        }
        // In real mode, this would be handled by the Firestore listener after VesselUpdateService commits.
    };

    const renderView = () => {
        const viewParts = currentView.split('/');
        const baseView = viewParts[0];

        switch (baseView) {
            case 'dashboard': return <DashboardPage entries={logisticsEntries} currentUser={loggedInUser} onNavigate={handleNavigate} />;
            case 'logistics':
                if (viewParts[1] === 'new') return <LogisticsFormPage onSave={addEntry} onCancel={handleBackToList} />;
                if (viewParts[1] === 'edit' && selectedEntryId) {
                    const entry = logisticsEntries.find(e => e.id === selectedEntryId);
                    return entry ? <LogisticsFormPage onSave={updateEntry} onCancel={handleBackToList} existingEntry={entry} /> : <p>Entry not found.</p>;
                }
                return <LogisticsListPage entries={logisticsEntries} onSelect={handleSelectEntry} onNew={handleNewEntry} onUpdate={updateEntrySilently} onDelete={initiateDeleteEntry} onUploadClick={() => setIsUploadModalOpen(true)} onScheduleClick={handleOpenSchedulingModal} initialFilter={initialListFilter} onClearInitialFilter={handleClearInitialFilter} />;
            case 'fupreport': return <FUPReportPage entries={logisticsEntries} />;
            case 'deliverypanel': return <DeliveryPanelPage entries={logisticsEntries} onUpdateEntry={updateEntrySilently} />;
            case 'calendario': return <CalendarPage entries={logisticsEntries} />;
            default: return <DashboardPage entries={logisticsEntries} currentUser={loggedInUser} onNavigate={handleNavigate} />;
        }
    };

    if (authLoading) return <div className="fixed inset-0 bg-gray-100 flex items-center justify-center"><Loader2Icon /></div>;
    if (initError) return <div className="fixed inset-0 bg-gray-100 flex items-center justify-center p-4"><div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full"><h1 className="text-2xl font-bold text-byd-red mb-4">Application Error</h1><p className="text-gray-700">{initError}</p></div></div>;
    if (!loggedInUser) return <LoginScreen onLogin={handleLogin} error={loginError} />;

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar onNavigate={handleNavigate} activeView={currentView} onLogout={handleLogout} loggedInUser={loggedInUser} />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 ml-64">
                {renderView()}
            </main>
            {entryToDeleteId && <ConfirmationModal title="Confirm Deletion" message="Are you sure you want to delete this logistics entry? This action cannot be undone." onConfirm={confirmDeleteEntry} onCancel={cancelDeleteEntry} confirmText="Yes, Delete" cancelText="Cancel" />}
            {isUploadModalOpen && (
                <UploadModal
                    onCancel={() => setIsUploadModalOpen(false)}
                    onImport={(data) => { handleBulkImport(data); setIsUploadModalOpen(false); }}
                    parser={parseLogisticsFile}
                    title="Upload Logistics File"
                />
            )}
            {schedulingIds.length > 0 && (
                <SchedulingModal
                    count={schedulingIds.length}
                    onClose={handleCloseSchedulingModal}
                    onConfirm={handleScheduleDeliveries}
                />
            )}
        </div>
    );
};

export default App;