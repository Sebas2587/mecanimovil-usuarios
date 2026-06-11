import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import solicitudesService from '../services/solicitudesService';
import websocketService from '../services/websocketService';
import { useAuth } from '../context/AuthContext';
import {
  useRequests,
  useActiveRequests,
  useCreateRequest,
  usePublishRequest,
  useCancelRequest,
  useSelectOffer,
  invalidateSolicitudesListQueries,
  requestDetailQueryKey,
} from '../hooks/useRequests';

/** Tipos WS (client_status) que implican cambio en lista/detalle de solicitudes públicas. */
const WS_TYPES_REFRESH_SOLICITUDES = new Set([
  'nueva_oferta',
  'solicitud_adjudicada',
  'servicio_completado',
  'servicio_iniciado',
  'pago_expirado',
  'alerta_pago_proximo',
  'rechazo_solicitud',
  'oferta_secundaria_creada',
  'reserva_creditos_expirada',
  // Pago confirmado: la solicitud cambia a pagada o pagada_parcialmente → refrescar lista
  'pago_completado',
]);

function invalidateSolicitudesQueries(queryClient, payload, userId) {
  invalidateSolicitudesListQueries(queryClient, userId);
  const sid = payload?.solicitud_id;
  const rk = requestDetailQueryKey(sid);
  if (rk) {
    queryClient.invalidateQueries({ queryKey: rk });
  }
}

// Crear el contexto
const SolicitudesContext = createContext();

// Provider
export function SolicitudesProvider({ children }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Queries
  const {
    data: solicitudes,
    isPending: isRequestsPending,
    isLoading: isRequestsLoading,
    isFetching: isRequestsFetching,
    error: errorAll,
    refetch: refetchAll
  } = useRequests();

  const {
    data: solicitudesActivas,
    isPending: isActivePending,
    isLoading: isActiveLoading,
    isFetching: isActiveFetching,
    error: errorActive,
    refetch: refetchActive
  } = useActiveRequests();

  // Mutations
  const { mutateAsync: crearSolicitudAsync } = useCreateRequest();
  const { mutateAsync: publicarSolicitudAsync } = usePublishRequest();
  const { mutateAsync: cancelarSolicitudAsync } = useCancelRequest();
  const { mutateAsync: seleccionarOfertaAsync } = useSelectOffer();

  // Local State for WebSocket ephemeral data
  const [ofertasNuevas, setOfertasNuevas] = useState([]);
  const [ofertasNuevasPorSolicitud, setOfertasNuevasPorSolicitud] = useState({});
  const [ultimaOfertaRecibida, setUltimaOfertaRecibida] = useState(null);
  const [wsError, setWsError] = useState(null);

  const loading = isRequestsPending || isActivePending;
  const error = errorAll?.message || errorActive?.message || wsError;

  const cargarSolicitudes = useCallback(async () => {
    return await refetchAll();
  }, [refetchAll]);

  const cargarSolicitudesActivas = useCallback(async () => {
    // Check auth explicitly if needed or rely on hook
    const token = await AsyncStorage.getItem('auth_token');
    if (!token || token === "usuario_registrado_exitosamente") return [];
    return await refetchActive();
  }, [refetchActive]);

  const crearSolicitud = useCallback(async (data) => {
    return await crearSolicitudAsync(data);
  }, [crearSolicitudAsync]);

  const publicarSolicitud = useCallback(async (id) => {
    return await publicarSolicitudAsync(id);
  }, [publicarSolicitudAsync]);

  const cancelarSolicitud = useCallback(async (id) => {
    return await cancelarSolicitudAsync(id);
  }, [cancelarSolicitudAsync]);

  const seleccionarOferta = useCallback(async (solicitudId, ofertaId) => {
    return await seleccionarOfertaAsync({ solicitudId, ofertaId });
  }, [seleccionarOfertaAsync]);

  // WebSocket Logic — only connect when authenticated
  useEffect(() => {
    if (!user) return; // Skip WebSocket on public pages without auth

    const initWebSocket = async () => {
      try {
        if (!websocketService.getConnectionStatus()) {
          await websocketService.connect();
        }
      } catch (error) {
        console.error('Error inicializando WebSocket:', error);
        setWsError(error.message);
      }
    };

    initWebSocket();

    const handleWsAny = (data) => {
      if (!data || typeof data.type !== 'string') return;
      if (!WS_TYPES_REFRESH_SOLICITUDES.has(data.type)) return;

      if (data.type === 'nueva_oferta' || data.type === 'oferta_secundaria_creada') {
        setUltimaOfertaRecibida(data);
        setOfertasNuevas((prev) => [...prev, data]);
        if (data.solicitud_id) {
          setOfertasNuevasPorSolicitud((prev) => ({
            ...prev,
            [data.solicitud_id]: [...(prev[data.solicitud_id] || []), data],
          }));
        }
      }

      invalidateSolicitudesQueries(queryClient, data, user?.id);
    };

    const timeoutId = setTimeout(() => {
      websocketService.onAnyMessage(handleWsAny);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      websocketService.offMessage('any', handleWsAny);
    };
  }, [queryClient, user]);

  // Guardrail multi-sesión: al cerrar sesión (user=null) limpiar cache + estado efímero,
  // para que nunca aparezcan solicitudes/ofertas de usuario anterior.
  useEffect(() => {
    if (user) return;
    setOfertasNuevas([]);
    setOfertasNuevasPorSolicitud({});
    setUltimaOfertaRecibida(null);
    setWsError(null);
    queryClient.removeQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'requests',
    });
    queryClient.removeQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'activeRequests',
    });
    queryClient.removeQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'request',
    });
  }, [queryClient, user]);

  const limpiarOfertasNuevas = useCallback(() => {
    setOfertasNuevas([]);
    setOfertasNuevasPorSolicitud({});
  }, []);

  const ofertaNuevasCount = ofertasNuevas.length;

  const obtenerOfertasNuevasPorSolicitud = useCallback((solicitudId) => {
    if (!solicitudId) return [];
    return ofertasNuevasPorSolicitud[solicitudId] || [];
  }, [ofertasNuevasPorSolicitud]);

  const obtenerOfertasNuevasCountPorSolicitud = useCallback((solicitudId) => {
    if (!solicitudId) return 0;
    return (ofertasNuevasPorSolicitud[solicitudId] || []).length;
  }, [ofertasNuevasPorSolicitud]);

  const value = useMemo(() => ({
    solicitudes: solicitudes || [],
    solicitudesActivas: solicitudesActivas || [],
    loading,
    requestsIsPending: isRequestsPending,
    activeRequestsIsPending: isActivePending,
    requestsIsLoading: isRequestsLoading,
    activeRequestsIsLoading: isActiveLoading,
    isRequestsFetching,
    isActiveFetching,
    error,
    ofertasNuevas,
    ofertasNuevasPorSolicitud,
    ultimaOfertaRecibida,
    ofertasNuevasCount: ofertaNuevasCount,
    obtenerOfertasNuevasPorSolicitud,
    obtenerOfertasNuevasCountPorSolicitud,
    cargarSolicitudes,
    cargarSolicitudesActivas,
    crearSolicitud,
    publicarSolicitud,
    seleccionarOferta,
    cancelarSolicitud,
    limpiarOfertasNuevas
  }), [
    solicitudes,
    solicitudesActivas,
    loading,
    isRequestsPending,
    isActivePending,
    isRequestsLoading,
    isActiveLoading,
    isRequestsFetching,
    isActiveFetching,
    error,
    ofertasNuevas,
    ofertasNuevasPorSolicitud,
    ultimaOfertaRecibida,
    ofertaNuevasCount,
    obtenerOfertasNuevasPorSolicitud,
    obtenerOfertasNuevasCountPorSolicitud,
    cargarSolicitudes,
    cargarSolicitudesActivas,
    crearSolicitud,
    publicarSolicitud,
    seleccionarOferta,
    cancelarSolicitud,
    limpiarOfertasNuevas
  ]);

  return (
    <SolicitudesContext.Provider value={value}>
      {children}
    </SolicitudesContext.Provider>
  );
}

// Hook personalizado
export function useSolicitudes() {
  const context = useContext(SolicitudesContext);
  if (!context) {
    throw new Error('useSolicitudes debe usarse dentro de SolicitudesProvider');
  }
  return context;
}
