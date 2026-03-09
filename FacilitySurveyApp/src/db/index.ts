import { Platform } from 'react-native';
import { migrateDb } from './schema';
import Constants, { ExecutionEnvironment } from 'expo-constants';

let dbInstance: any | null = null;

export const getDb = async () => {
    if (dbInstance) return dbInstance;

    // Check if running in Expo Go (doesn't support SQLite native modules)
    // ExecutionEnvironment.StoreClient means Expo Go app
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

    if (Platform.OS === 'web' || isExpoGo) {
        // Mock DB for web and Expo Go
        // Data will be stored in AsyncStorage via storage.ts
        console.warn(`SQLite not supported (${Platform.OS === 'web' ? 'web' : 'Expo Go'}). Using AsyncStorage.`);
        dbInstance = {
            execAsync: async () => { },
            runAsync: async () => { },
            getAllAsync: async () => [],
            getFirstAsync: async () => null,
            closeAsync: async () => { /* No-op */ },
        };
        return dbInstance;
    }

    // Only import SQLite when needed (native builds / dev clients)
    try {
        const SQLite = await import('expo-sqlite');
        dbInstance = await SQLite.openDatabaseAsync('facility_survey.db');
        await migrateDb(dbInstance);
        return dbInstance;
    } catch (e) {
        console.error("Failed to load SQLite native module:", e);
        // Fallback (though ideally shouldn't happen in native build)
        return {
            execAsync: async () => { },
            runAsync: async () => { },
            getAllAsync: async () => [],
            getFirstAsync: async () => null,
        };
    }
};
