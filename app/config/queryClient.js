import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import logger from '../utils/logger';

// Función para determinar si podemos usar MMKV
const initializeStorage = () => {
    // Verificar si estamos en Expo Go
    // Constants.appOwnership puede ser 'expo' (Standalone/Expo Go) o 'standalone' (Bare/EAS Build)
    // Constants.executionEnvironment puede ser 'storeClient' (Expo Go) o 'standalone' (Builds)
    const isExpoGo = Constants.executionEnvironment === 'storeClient';

    if (isExpoGo) {
        logger.warn('⚠️ Detectado Expo Go: Utilizando AsyncStorage en lugar de MMKV (MMKV requiere Development Build)');
        return {
            storageImpl: AsyncStorage,
            isMMKV: false
        };
    }

    try {
        // Importación dinámica para evitar crash en Expo Go
        const { MMKV } = require('react-native-mmkv');
        const storage = new MMKV();

        const mmkvAdapter = {
            setItem: (key, value) => {
                storage.set(key, value);
                return Promise.resolve();
            },
            getItem: (key) => {
                const value = storage.getString(key);
                return Promise.resolve(value);
            },
            removeItem: (key) => {
                storage.delete(key);
                return Promise.resolve();
            },
        };

        logger.info('✅ MMKV Storage inicializado correctamente');
        return {
            storageImpl: mmkvAdapter,
            isMMKV: true
        };
    } catch (e) {
        logger.warn('⚠️ Error inicializando MMKV, usando fallback AsyncStorage:', e.message);
        return {
            storageImpl: AsyncStorage,
            isMMKV: false
        };
    }
};

const { storageImpl, isMMKV } = initializeStorage();

// Configuración del Persister
export const asyncStoragePersister = createAsyncStoragePersister({
    storage: storageImpl,
    key: isMMKV ? 'OFFLINE_CACHE_V1' : 'OFFLINE_CACHE_ASYNC_V1', // Usar key diferente por seguridad
});

// Configuración global del QueryClient
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutos
            gcTime: 1000 * 60 * 60 * 24, // 24 horas
            retry: 1, // Reintentar solo una vez
            networkMode: 'offlineFirst', // Fundamental para Offline-First
        },
        mutations: {
            networkMode: 'offlineFirst',
        },
    },
});
