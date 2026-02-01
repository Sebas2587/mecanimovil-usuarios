import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

const STORAGE_KEY_PREFIX = 'favorites_providers_';

/**
 * Mapea un proveedor al formato mínimo para persistencia y listado
 */
const toFavoriteItem = (provider, providerType) => {
  const type = providerType || (provider?.tipo === 'taller' ? 'taller' : 'mecanico');
  const id = provider?.id;
  if (!id) return null;
  return {
    id,
    type,
    nombre: provider?.nombre || 'Proveedor',
    foto_perfil: provider?.foto_perfil || provider?.usuario?.foto_perfil || provider?.foto_perfil_url || null,
    marcas_atendidas_nombres: provider?.marcas_atendidas_nombres || [],
    especialidades_nombres: provider?.especialidades_nombres || [],
    calificacion_promedio: provider?.calificacion_promedio ?? null,
    numero_de_calificaciones: provider?.numero_de_calificaciones ?? 0,
    verificado: provider?.verificado ?? false,
    // Objeto completo para initialProvider en ProviderDetailScreen
    ...provider,
  };
};

export const FavoritesProvider = ({ children }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const storageKey = user?.id ? `${STORAGE_KEY_PREFIX}${user.id}` : null;

  useEffect(() => {
    if (!storageKey) {
      setFavorites([]);
      setLoaded(true);
      return;
    }
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setFavorites(Array.isArray(parsed) ? parsed : []);
        } else {
          setFavorites([]);
        }
      } catch (err) {
        console.warn('[FavoritesContext] Error loading favorites:', err);
        setFavorites([]);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !loaded) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(favorites)).catch((err) =>
      console.warn('[FavoritesContext] Error saving favorites:', err)
    );
  }, [storageKey, favorites, loaded]);

  const addFavorite = useCallback((provider, providerType) => {
    const item = toFavoriteItem(provider, providerType);
    if (!item) return;
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === item.id && f.type === item.type);
      if (exists) return prev;
      return [...prev, item];
    });
  }, []);

  const removeFavorite = useCallback((providerId, providerType) => {
    setFavorites((prev) =>
      prev.filter((f) => !(String(f.id) === String(providerId) && f.type === providerType))
    );
  }, []);

  const isFavorite = useCallback(
    (providerId, providerType) =>
      favorites.some((f) => String(f.id) === String(providerId) && f.type === providerType),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (provider, providerType) => {
      const id = provider?.id;
      const type = providerType || (provider?.tipo === 'taller' ? 'taller' : 'mecanico');
      if (!id) return;
      if (isFavorite(id, type)) {
        removeFavorite(id, type);
      } else {
        addFavorite(provider, type);
      }
    },
    [isFavorite, addFavorite, removeFavorite]
  );

  const value = {
    favorites,
    loaded,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return ctx;
};
