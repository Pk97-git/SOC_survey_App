import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { storage } from '../services/storage';

type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending_upload';

interface SyncContextType {
    status: SyncStatus;
    isOnline: boolean;
    pendingCount: number;
    lastSyncedAt: Date | null;
    syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
    const [isOnline, setIsOnline] = useState(true);
    const [status, setStatus] = useState<SyncStatus>('synced');
    const [pendingCount, setPendingCount] = useState(0);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

    // 1. Monitor Network
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const online = state.isConnected && state.isInternetReachable;
            setIsOnline(!!online);
            updateStatus(!!online, pendingCount);
        });
        return unsubscribe;
    }, [pendingCount]);

    // 2. Check Pending Items (Simulated for now, would check SQLite 'status=pending')
    useEffect(() => {
        checkPendingItems();
        const interval = setInterval(checkPendingItems, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    const checkPendingItems = async () => {
        // In real app: const pending = await storage.getPendingSurveys();
        // For now, we simulate "0" or usage of local DB
        const pending = 0;
        setPendingCount(pending);
        updateStatus(isOnline, pending);
    };

    const updateStatus = (online: boolean, pending: number) => {
        if (!online) {
            setStatus('offline');
        } else if (pending > 0) {
            setStatus('pending_upload');
        } else {
            setStatus('synced');
        }
    };

    const syncNow = async () => {
        if (!isOnline) return;
        setStatus('syncing');

        // Simulate Upload
        await new Promise(r => setTimeout(r, 2000));

        setLastSyncedAt(new Date());
        setPendingCount(0);
        setStatus('synced');
    };

    return (
        <SyncContext.Provider value={{ status, isOnline, pendingCount, lastSyncedAt, syncNow }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => {
    const context = useContext(SyncContext);
    if (!context) throw new Error("useSync must be used within SyncProvider");
    return context;
};
