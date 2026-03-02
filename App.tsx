
import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { collection, doc, addDoc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, query, orderBy, limit, startAfter, endBefore, limitToLast, where, QueryDocumentSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword, User as FirebaseAuthUser } from 'firebase/auth';

import { auth, firestore } from './services/firebase';
import { LogisticsEntry, User, FiveW2H } from './types';
import { removeUndefinedFields } from './utils/helpers';
import { parseLogisticsFile } from './services/fileParser';

import Sidebar from './components/Sidebar';
import { Loader2Icon } from './components/common/Icons';

// --- Lazy Load Page Components ---
const DashboardPage = lazy(() => import('./components/DashboardPage'));
const LogisticsListPage = lazy(() => import('./components/LogisticsListPage'));
const LogisticsFormPage = lazy(() => import('./components/LogisticsFormPage'));
const FUPReportPage = lazy(() => import('./components/FUPReportPage'));
const LoginScreen = lazy(() => import('./components/LoginScreen'));
const ConfirmationModal = lazy(() => import('./components/ConfirmationModal'));
const UploadModal = lazy(() => import('./components/UploadModal'));
const SchedulingModal = lazy(() => import('./components/SchedulingModal'));
const DeliveryPanelPage = lazy(() => import('./components/DeliveryPanelPage'));
const CalendarPage = lazy(() => import('./components/CalendarPage'));
const TeamPage = lazy(() => import('./components/TeamPage'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const FiveW2HPage = lazy(() => import('./components/FiveW2HPage'));
const VesselUpdatePage = lazy(() => import('./components/VesselUpdatePage'));


const App: React.FC = () => {
    // --- GLOBAL STATE ---
    const [users, setUsers] = useState<User[]>([]);
    const [fiveW2HData, setFiveW2HData] = useState<FiveW2H[]>([]);
    
    // --- AUTH STATE ---
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [loginError, setLoginError] = useState('');
    const [authLoading, setAuthLoading] = useState(true);

    // --- NAVIGATION & MODAL STATE ---
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);
    const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [schedulingIds, setSchedulingIds] = useState<string[]>([]);

    // --- DATA FETCHING & STATE MANAGEMENT ---
    const [viewData, setViewData] = useState<{ entries: LogisticsEntry[], loading: boolean }>({ entries: [], loading: true });
    const [dashboardEntries, setDashboardEntries] = useState<LogisticsEntry[]>([]);
    const [pagination, setPagination] = useState<{ page: number, lastDoc: QueryDocumentSnapshot | null, firstDoc: QueryDocumentSnapshot | null }>({ page: 1, lastDoc: null, firstDoc: null });
    const [filters, setFilters] = useState<Record<string, any>>({});
    const PAGE_SIZE = 50;


    // --- Auth, Users, 5W2H (Lightweight, real-time) ---
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (userAuth: FirebaseAuthUser | null) => {
            try {
                if (userAuth) {
                    const userDocRef = doc(firestore, 'users', userAuth.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        setLoggedInUser({ id: userDoc.id, ...userDoc.data() } as User);
                    } else {
                        if (!userAuth.email) {
                            throw new Error("Authentication failed: Authenticated user has no email address.");
                        }
                        // Check if this is the first user to make them an admin
                        const usersCollectionRef = collection(firestore, 'users');
                        const usersSnapshot = await getDocs(query(usersCollectionRef, limit(1)));
                        const isFirstUser = usersSnapshot.empty;
                        
                        const defaultUserData: Omit<User, 'id'> = { name: userAuth.displayName || userAuth.email.split('@')[0], username: userAuth.email, role: isFirstUser ? 'Admin' : 'Logistics' };
                        await setDoc(userDocRef, defaultUserData);
                        setLoggedInUser({ id: userAuth.uid, ...defaultUserData } as User);
                    }
                } else {
                    setLoggedInUser(null);
                }
            } catch (error) {
                 console.error("Error during auth state change handling:", error);
                 setLoginError(`Failed to load user profile. ${error instanceof Error ? error.message : 'Please check connection and refresh.'}`);
                 setLoggedInUser(null);
                 await signOut(auth).catch(e => console.error("Sign out failed during error handling:", e));
            } finally {
                setAuthLoading(false);
            }
        });

        const unsubUsers = onSnapshot(
            collection(firestore, 'users'), 
            (snap) => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User))),
            (error) => console.error("Firestore 'users' listener error:", error)
        );
        const unsub5W2H = onSnapshot(
            collection(firestore, 'fiveW2H'),
            (snap) => setFiveW2HData(snap.docs.map(d => ({ id: d.id, ...d.data() } as FiveW2H))),
            (error) => console.error("Firestore 'fiveW2H' listener error:", error)
        );

        return () => { unsubscribeAuth(); unsubUsers(); unsub5W2H(); };
    }, []);

    // --- DATA FETCHING ENGINE for Different Views ---
    useEffect(() => {
        if (!loggedInUser) return;

        let unsubscribe: (() => void) | undefined;
        // --- De-duplication Helper ---
        const deDuplicateEntries = (entriesToFilter: LogisticsEntry[]): LogisticsEntry[] => {
            const uniqueEntriesMap = new Map<string, LogisticsEntry>();
            entriesToFilter.forEach(entry => {
                const key = `${entry.cntrsOriginal}-${entry.batch}-${entry.arrivalVessel}`;
                const existingEntry = uniqueEntriesMap.get(key);
                if (!existingEntry || entry.id > existingEntry.id) {
                    uniqueEntriesMap.set(key, entry);
                }
            });
            return Array.from(uniqueEntriesMap.values());
        };

        const fetchData = async () => {
            setViewData({ entries: [], loading: true });
            
            try {
                // --- Dashboard View: Real-time, last 90 days ---
                if (currentView === 'dashboard') {
                    const ninetyDaysAgo = new Date();
                    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                    const q = query(collection(firestore, 'logisticsEntries'), where('ata', '>=', ninetyDaysAgo.toISOString().split('T')[0]));
                    unsubscribe = onSnapshot(q, snap => {
                        setDashboardEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as LogisticsEntry)));
                        setViewData({ entries: [], loading: false });
                    }, (error) => { console.error("Dashboard snapshot error:", error); setViewData({ entries: [], loading: false }); });
                } 
                // --- Paginated Views: Logistics & FUP Report ---
                else if (['logistics', 'fupreport'].includes(currentView)) {
                    // --- Logistics View: Advanced, combinable search ---
                    const isLogisticsSearch = currentView === 'logistics' && (filters.containerSearch || filters.loteSearch || filters.blSearch || filters.vesselSearch || (filters.statusFilter && filters.statusFilter !== 'All'));
                    if (isLogisticsSearch) {
                        const qConstraints: any[] = [];
                        if (filters.containerSearch) qConstraints.push(where('cntrsOriginal', '==', filters.containerSearch));
                        
                        if (filters.loteSearch) {
                            const loteValue = filters.loteSearch;
                            const loteAsNumber = parseInt(loteValue, 10);
                            const queryValue = !isNaN(loteAsNumber) && String(loteAsNumber) === loteValue ? loteAsNumber : loteValue;
                            qConstraints.push(where('batch', '==', queryValue));
                        }

                        if (filters.blSearch) qConstraints.push(where('bl', '==', filters.blSearch));
                        if (filters.vesselSearch) qConstraints.push(where('arrivalVessel', '==', filters.vesselSearch));
                        if(filters.statusFilter && filters.statusFilter !== 'All') qConstraints.push(where('statusComex', '==', filters.statusFilter));
                        if(filters.warehouseFilter && filters.warehouseFilter !== 'All') qConstraints.push(where('bondedWarehouse', '==', filters.warehouseFilter));

                        const q = query(collection(firestore, 'logisticsEntries'), ...qConstraints);
                        const docSnap = await getDocs(q);
                        let entries = docSnap.docs.map(d => ({ id: d.id, ...d.data() } as LogisticsEntry));
                        
                        entries = deDuplicateEntries(entries);
                        entries.sort((a, b) => String(a.cntrsOriginal || '').localeCompare(String(b.cntrsOriginal || '')));

                        setViewData({ entries, loading: false });
                        setPagination({ page: 1, lastDoc: null, firstDoc: null }); // Reset pagination for search
                        return;
                    }

                     // --- FUP Report View: Simple search by Container/LOTE ---
                    if (currentView === 'fupreport' && filters.searchTerm) {
                        const q = query(collection(firestore, 'logisticsEntries'), where('cntrsOriginal', '==', filters.searchTerm));
                        const docSnap = await getDocs(q);
                        let entries = docSnap.docs.map(d => ({ id: d.id, ...d.data() } as LogisticsEntry));
                        
                        entries = deDuplicateEntries(entries);
                        entries.sort((a, b) => String(a.cntrsOriginal || '').localeCompare(String(b.cntrsOriginal || '')));

                        setViewData({ entries, loading: false });
                        setPagination({ page: 1, lastDoc: null, firstDoc: null });
                        return;
                    }

                    const qConstraints: any[] = [];
                    if(filters.statusFilter && filters.statusFilter !== 'All') qConstraints.push(where('statusComex', '==', filters.statusFilter));
                    if(filters.warehouseFilter && filters.warehouseFilter !== 'All') qConstraints.push(where('bondedWarehouse', '==', filters.warehouseFilter));

                    const hasActiveFilters = (filters.statusFilter && filters.statusFilter !== 'All') || (filters.warehouseFilter && filters.warehouseFilter !== 'All');
                    const orderByField = hasActiveFilters ? '__name__' : 'cntrsOriginal';
                    
                    const isPrevPageQuery = pagination.page > 1 && pagination.firstDoc && filters.direction === 'prev';
                    
                    if (isPrevPageQuery) {
                        qConstraints.push(orderBy(orderByField, 'desc'), startAfter(pagination.firstDoc));
                    } else {
                        qConstraints.push(orderBy(orderByField, 'asc'));
                        if (pagination.page > 1 && pagination.lastDoc && filters.direction === 'next') {
                           qConstraints.push(startAfter(pagination.lastDoc));
                        }
                    }
                    
                    qConstraints.push(limit(PAGE_SIZE));
                    
                    const q = query(collection(firestore, 'logisticsEntries'), ...qConstraints);
                    const docSnap = await getDocs(q);
                    
                    let entries = docSnap.docs.map(d => ({ id: d.id, ...d.data() } as LogisticsEntry));
                    
                    entries = deDuplicateEntries(entries);
                    entries.sort((a, b) => {
                        const cntrCompare = String(a.cntrsOriginal || '').localeCompare(String(b.cntrsOriginal || ''));
                        if (cntrCompare !== 0) return cntrCompare;
                        return String(a.bl || '').localeCompare(String(b.bl || ''));
                    });

                    setViewData({ entries, loading: false });
                    setPagination(prev => ({ ...prev, lastDoc: docSnap.docs[docSnap.docs.length - 1], firstDoc: docSnap.docs[0] }));
                } 
                // --- Date-based Views: Calendar & Delivery Panel ---
                else if (['calendario', 'deliverypanel'].includes(currentView)) {
                    if (!filters.startDate || !filters.endDate) { setViewData({ entries: [], loading: false }); return; }
                    const q = query(collection(firestore, 'logisticsEntries'), where('estimatedDeliveryDate', '>=', filters.startDate), where('estimatedDeliveryDate', '<=', filters.endDate));
                    unsubscribe = onSnapshot(q, snap => {
                        let entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as LogisticsEntry));
                        entries = deDuplicateEntries(entries);
                        setViewData({ entries, loading: false });
                    }, (error) => { console.error("Date-based snapshot error:", error); setViewData({ entries: [], loading: false }); });
                }
                // --- Vessel Update View: Filtered Data ---
                else if (currentView === 'vesselupdates') {
                    const q = query(collection(firestore, 'logisticsEntries'), where('statusComex', 'in', ['IN TRANSIT', 'AT THE PORT', 'SHIPMENT CONFIRMED']), limit(500));
                    const docSnap = await getDocs(q);
                    setViewData({ entries: docSnap.docs.map(d => ({ id: d.id, ...d.data() } as LogisticsEntry)), loading: false });
                }
                else {
                    setViewData({ entries: [], loading: false });
                }
            } catch (error) {
                console.error("Error fetching data for view:", currentView, error);
                setViewData({ entries: [], loading: false });
            }
        };
        
        fetchData();

        return () => { if (unsubscribe) unsubscribe(); };
    }, [loggedInUser, currentView, pagination.page, filters]);
    
    // --- NAVIGATION & FILTER HANDLERS ---
    const handleNavigate = useCallback((view: string, filter?: { type: string; value: string; }) => {
        setCurrentView(view);
        setSelectedEntryId(null);
        setPagination({ page: 1, lastDoc: null, firstDoc: null });
        
        // Start with provided filter or empty
        const baseFilters = filter ? { [filter.type]: filter.value, direction: 'next' } : {};

        if (['calendario', 'deliverypanel'].includes(view)) {
            const today = new Date();
            const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
            setFilters({ ...baseFilters, startDate: start, endDate: end });
        } else {
            setFilters(baseFilters);
        }
    }, []);
    
    const handlePageChange = useCallback((direction: 'next' | 'prev') => {
        setFilters(f => ({ ...f, direction }));
        if (direction === 'next') setPagination(p => ({ ...p, page: p.page + 1 }));
        if (direction === 'prev' && pagination.page > 1) setPagination(p => ({ ...p, page: p.page - 1 }));
    }, [pagination.page]);

    const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
        setPagination({ page: 1, lastDoc: null, firstDoc: null });
        setFilters(f => ({ ...f, ...newFilters, direction: 'next' }));
    }, []);
    
    const handleMonthChange = useCallback((startDate: string, endDate: string) => {
        handleFilterChange({ startDate, endDate });
    }, [handleFilterChange]);

    const handleSelectEntry = useCallback((id: string) => { setSelectedEntryId(id); setCurrentView('logistics/edit'); }, []);
    const handleNewEntry = useCallback(() => { setSelectedEntryId(null); setCurrentView('logistics/new'); }, []);
    const handleBackToList = useCallback(() => { setSelectedEntryId(null); setCurrentView('logistics'); }, []);
    
    // --- Data Mutation Handlers ---
    const addEntry = useCallback(async (newEntryData: LogisticsEntry) => { try { await addDoc(collection(firestore, 'logisticsEntries'), removeUndefinedFields(newEntryData)); handleBackToList(); } catch (e) { alert(`Error adding entry: ${e instanceof Error ? e.message : 'Unknown error'}`); } }, [handleBackToList]);
    const updateEntrySilently = useCallback(async (updatedEntry: LogisticsEntry) => { try { const { id, ...dataToUpdate } = updatedEntry; if (!id) return; await updateDoc(doc(firestore, 'logisticsEntries', id), removeUndefinedFields(dataToUpdate)); } catch (e) { console.error(`Silent update failed:`, e) }}, []);
    const updateEntry = useCallback(async (updatedEntry: LogisticsEntry) => { try { await updateEntrySilently(updatedEntry); handleBackToList(); } catch (e) { alert(`Error updating entry: ${e instanceof Error ? e.message : 'Unknown error'}`); } }, [updateEntrySilently, handleBackToList]);
    const initiateDeleteEntry = useCallback((id: string) => setEntryToDeleteId(id), []);
    const confirmDeleteEntry = useCallback(async () => { try { if (entryToDeleteId) await deleteDoc(doc(firestore, 'logisticsEntries', entryToDeleteId)); setEntryToDeleteId(null); } catch(e) { alert(`Error deleting entry: ${e instanceof Error ? e.message : 'Unknown error'}`); } }, [entryToDeleteId]);
    const cancelDeleteEntry = useCallback(() => setEntryToDeleteId(null), []);
    const handleSaveUser = useCallback(async (user: User) => { try { if (user.id) { const { id, password, ...userData } = user; await updateDoc(doc(firestore, 'users', id), userData); } else { if (!user.password) throw new Error("Password required."); const cred = await createUserWithEmailAndPassword(auth, user.username, user.password); await setDoc(doc(firestore, 'users', cred.user.uid), { name: user.name, username: user.username, role: user.role }); } } catch (e) { alert(`Error saving user: ${e instanceof Error ? e.message : 'Unknown error'}`); } }, []);
    const initiateDeleteUser = useCallback((id: string) => setUserToDeleteId(id), []);
    const cancelDeleteUser = useCallback(() => setUserToDeleteId(null), []);
    const confirmDeleteUser = useCallback(async () => { try { if (userToDeleteId) await deleteDoc(doc(firestore, 'users', userToDeleteId)); setUserToDeleteId(null); } catch (e) { alert(`Error deleting user: ${e instanceof Error ? e.message : 'Unknown error'}`); } }, [userToDeleteId]);
    const handlePasswordChange = useCallback(async (newPass: string) => { if (auth.currentUser) await updatePassword(auth.currentUser, newPass); }, []);
    const saveFiveW2H = useCallback(async (item: FiveW2H) => { try { if (item.id) { const { id, ...data } = item; await updateDoc(doc(firestore, 'fiveW2H', id), data); } else { await addDoc(collection(firestore, 'fiveW2H'), item); } } catch (e) { alert(`Error saving 5W2H: ${e instanceof Error ? e.message : 'Unknown error'}`); } }, []);
    const deleteFiveW2H = useCallback(async (id: string) => { try { if (window.confirm('Delete?')) await deleteDoc(doc(firestore, 'fiveW2H', id)); } catch(e) { alert(`Error deleting 5W2H: ${e instanceof Error ? e.message : 'Unknown error'}`); }}, []);
    const handleLogout = useCallback(async () => { await signOut(auth); setCurrentView('dashboard'); }, []);
    const handleLogin = useCallback(async (email: string, pass: string) => { setLoginError(''); try { await signInWithEmailAndPassword(auth, email, pass); } catch (e) { setLoginError(`Login failed: ${e instanceof Error ? e.message : 'Please check credentials'}`); } }, []);
    
    const handleBulkImport = useCallback(async (data: LogisticsEntry[], onProgress: (p: number) => void) => {
        try {
            if (!data || data.length === 0) return;

            // Step 1: Create a lookup map of existing container numbers to their document IDs.
            // NOTE: We store array of IDs because duplicates might exist in legacy data.
            const incomingContainerNumbers = [...new Set(data.map(item => item.cntrsOriginal).filter(Boolean) as string[])];
            const existingDocsMap = new Map<string, string[]>();

            // Firestore's 'in' query is limited to 30 values, so we must chunk our lookups.
            const LOOKUP_CHUNK_SIZE = 30;
            for (let i = 0; i < incomingContainerNumbers.length; i += LOOKUP_CHUNK_SIZE) {
                const chunk = incomingContainerNumbers.slice(i, i + LOOKUP_CHUNK_SIZE);
                if (chunk.length > 0) {
                    const q = query(collection(firestore, 'logisticsEntries'), where('cntrsOriginal', 'in', chunk));
                    const querySnapshot = await getDocs(q);
                    querySnapshot.forEach(doc => {
                        const docData = doc.data() as LogisticsEntry;
                        if (docData.cntrsOriginal) {
                            // Ensure we handle multiple docs for same container by storing all IDs
                            const currentIds = existingDocsMap.get(docData.cntrsOriginal) || [];
                            currentIds.push(doc.id);
                            existingDocsMap.set(docData.cntrsOriginal, currentIds);
                        }
                    });
                }
            }
            
            // Step 2: Iterate through the data, create batched writes, and commit them with a delay.
            const BATCH_SIZE = 499; // Firestore's batch write limit is 500 operations.
            let batch = writeBatch(firestore);
            let operationsInBatch = 0;

            for (let i = 0; i < data.length; i++) {
                const item = data[i];
                if (!item.cntrsOriginal) continue;

                const cleanItem = removeUndefinedFields(item);
                const existingDocIds = existingDocsMap.get(item.cntrsOriginal);

                if (existingDocIds && existingDocIds.length > 0) {
                    // Update the first found document
                    const mainDocId = existingDocIds[0];
                    batch.update(doc(firestore, 'logisticsEntries', mainDocId), cleanItem);
                    operationsInBatch++;

                    // CRITICAL: If there are duplicates in the database (more than 1 ID), delete the extras.
                    // This enforces "no duplicates" logic.
                    if (existingDocIds.length > 1) {
                        const duplicatesToDelete = existingDocIds.slice(1);
                        for (const dupId of duplicatesToDelete) {
                            if (operationsInBatch >= BATCH_SIZE) {
                                await batch.commit();
                                batch = writeBatch(firestore);
                                operationsInBatch = 0;
                                await new Promise(res => setTimeout(res, 1000));
                            }
                            batch.delete(doc(firestore, 'logisticsEntries', dupId));
                            operationsInBatch++;
                        }
                        // Update map to prevent trying to delete these again if the file has this container multiple times
                        existingDocsMap.set(item.cntrsOriginal, [mainDocId]);
                    }

                } else {
                    // Create new document
                    batch.set(doc(collection(firestore, 'logisticsEntries')), cleanItem);
                    operationsInBatch++;
                }

                if (operationsInBatch >= BATCH_SIZE || i === data.length - 1) {
                    await batch.commit();
                    onProgress(Math.round(((i + 1) / data.length) * 100));
                    
                    // Reset for the next batch
                    if (i < data.length - 1) {
                        batch = writeBatch(firestore);
                        operationsInBatch = 0;
                        await new Promise(res => setTimeout(res, 1000));
                    }
                }
            }
        } catch (e) {
            if (e instanceof Error && (e.message.includes('resource-exhausted') || e.message.includes('Write stream exhausted'))) {
                 throw new Error("Import failed: The server is busy. Please try again with a smaller file or wait a few minutes.");
            }
            throw new Error(e instanceof Error ? e.message : "Import failed.");
        }
    }, []);

    const handleScheduleDeliveries = useCallback(async (date: string) => { try { const batch = writeBatch(firestore); schedulingIds.forEach(id => batch.update(doc(firestore, 'logisticsEntries', id), { estimatedDeliveryDate: date, status: 'PENDENTE' })); await batch.commit(); setSchedulingIds([]); } catch(e) { alert(`Error scheduling: ${e instanceof Error ? e.message : 'Unknown error'}`); } }, [schedulingIds]);

    const handleUnscheduleEntry = useCallback(async (entryToUnschedule: LogisticsEntry) => {
        if (!entryToUnschedule.cntrsOriginal) {
            console.warn("Entry has no container number, cannot perform duplicate search. Falling back to single update for ID:", entryToUnschedule.id);
            try {
                await updateDoc(doc(firestore, 'logisticsEntries', entryToUnschedule.id), { estimatedDeliveryDate: null, status: null });
            } catch (e) {
                alert(`Error unscheduling entry: ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
            return;
        }
    
        try {
            // Step 1: Query for all entries with the same container number. This is broader but necessary
            // to handle cases where batch/vessel are null or undefined in the database.
            const q = query(collection(firestore, 'logisticsEntries'), where('cntrsOriginal', '==', entryToUnschedule.cntrsOriginal));
            const querySnapshot = await getDocs(q);
    
            if (querySnapshot.empty) {
                // This case is unlikely as we started from an existing entry, but it's a safe fallback.
                console.warn("Could not find any entries for container, falling back to single update for ID:", entryToUnschedule.cntrsOriginal);
                await updateDoc(doc(firestore, 'logisticsEntries', entryToUnschedule.id), { estimatedDeliveryDate: null, status: null });
                return;
            }
            
            // Step 2: Filter for exact duplicates on the client side and prepare a batch update.
            // We use loose equality (==) to correctly handle comparisons between `null` and `undefined`.
            const batch = writeBatch(firestore);
            let updatedCount = 0;
            const targetBatch = entryToUnschedule.batch;
            const targetVessel = entryToUnschedule.arrivalVessel;
    
            querySnapshot.forEach(documentSnapshot => {
                const docData = documentSnapshot.data() as LogisticsEntry;
                
                // Loose equality (`==`) treats `null` and `undefined` as equal. This is crucial for matching
                // entries regardless of whether a missing field is stored as `null` or is absent.
                const batchMatches = docData.batch == targetBatch;
                const vesselMatches = docData.arrivalVessel == targetVessel;
    
                if (batchMatches && vesselMatches) {
                    batch.update(documentSnapshot.ref, { estimatedDeliveryDate: null, status: null });
                    updatedCount++;
                }
            });
    
            if (updatedCount > 0) {
                await batch.commit();
            } else {
                // As a final fallback, if the client-side filter didn't find any matches (including the original entry,
                // which would be strange), we ensure the originally clicked entry is still updated.
                console.warn("No exact duplicates found after client-side filter. Updating original entry by ID as a fallback.");
                await updateDoc(doc(firestore, 'logisticsEntries', entryToUnschedule.id), { estimatedDeliveryDate: null, status: null });
            }
            
        } catch (e) {
            alert(`Error unscheduling entries: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }, []);

    const renderView = () => {
        const viewParts = currentView.split('/');
        const baseView = viewParts[0];

        switch (baseView) {
            case 'dashboard': return <DashboardPage entries={dashboardEntries} currentUser={loggedInUser} onNavigate={handleNavigate} />;
            case 'logistics':
                if (viewParts[1] === 'new') return <LogisticsFormPage onSave={addEntry} onCancel={handleBackToList} />;
                if (viewParts[1] === 'edit' && selectedEntryId) {
                    const entry = viewData.entries.find(e => e.id === selectedEntryId) || dashboardEntries.find(e => e.id === selectedEntryId);
                    return entry ? <LogisticsFormPage onSave={updateEntry} onCancel={handleBackToList} existingEntry={entry} /> : <p>Loading entry or not found...</p>;
                }
                return <LogisticsListPage entries={viewData.entries} isLoading={viewData.loading} onSelect={handleSelectEntry} onNew={handleNewEntry} onUpdate={updateEntrySilently} onDelete={initiateDeleteEntry} onUploadClick={() => setIsUploadModalOpen(true)} onScheduleClick={setSchedulingIds} onFilterChange={handleFilterChange} onPageChange={handlePageChange} page={pagination.page} />;
            case 'fupreport': return <FUPReportPage entries={viewData.entries} isLoading={viewData.loading} onFilterChange={handleFilterChange} onPageChange={handlePageChange} page={pagination.page} />;
            case 'deliverypanel': return <DeliveryPanelPage entries={viewData.entries} onUpdateEntry={updateEntrySilently} onUnscheduleEntry={handleUnscheduleEntry} isLoading={viewData.loading} onMonthChange={handleMonthChange} />;
            case 'calendario': return <CalendarPage entries={viewData.entries} isLoading={viewData.loading} onMonthChange={handleMonthChange} />;
            case 'vesselupdates': return <VesselUpdatePage entries={viewData.entries} onVesselUpdates={(updates) => updates.forEach(updateEntrySilently)} />;
            case 'team': return <TeamPage users={users} onSave={handleSaveUser} onDelete={initiateDeleteUser} currentUser={loggedInUser} />;
            case 'admin': return loggedInUser ? <AdminPage user={loggedInUser} onPasswordChange={handlePasswordChange} /> : null;
            case '5w2h': return <FiveW2HPage data={fiveW2HData} onSave={saveFiveW2H} onDelete={deleteFiveW2H} allUsers={users} />;
            default: return <DashboardPage entries={dashboardEntries} currentUser={loggedInUser} onNavigate={handleNavigate} />;
        }
    };

    if (authLoading) return <div className="fixed inset-0 flex items-center justify-center"><Loader2Icon /></div>;

    return (
        <div className="flex h-screen bg-gray-100">
             <Suspense fallback={<div className="bg-navy-dark w-64 flex-shrink-0" />}>
                {loggedInUser && <Sidebar onNavigate={handleNavigate} activeView={currentView} onLogout={handleLogout} loggedInUser={loggedInUser} />}
            </Suspense>
            <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-all duration-300 ${loggedInUser ? 'ml-64' : ''}`}>
                <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2Icon /></div>}>
                    {!loggedInUser ? <LoginScreen onLogin={handleLogin} error={loginError} /> : renderView()}
                </Suspense>
            </main>
            {entryToDeleteId && <Suspense><ConfirmationModal title="Confirm Deletion" message="Are you sure you want to delete this logistics entry?" onConfirm={confirmDeleteEntry} onCancel={cancelDeleteEntry} /></Suspense>}
            {userToDeleteId && <Suspense><ConfirmationModal title="Confirm Deletion" message="Are you sure you want to delete this user?" onConfirm={confirmDeleteUser} onCancel={cancelDeleteUser} /></Suspense>}
            {isUploadModalOpen && <Suspense><UploadModal onCancel={() => setIsUploadModalOpen(false)} onImport={async (data, onProgress) => { await handleBulkImport(data, onProgress); setIsUploadModalOpen(false); handleFilterChange({}); }} parser={parseLogisticsFile} title="Upload Logistics File" /></Suspense>}
            {schedulingIds.length > 0 && <Suspense><SchedulingModal count={schedulingIds.length} onClose={() => setSchedulingIds([])} onConfirm={handleScheduleDeliveries} /></Suspense>}
        </div>
    );
};

export default App;
