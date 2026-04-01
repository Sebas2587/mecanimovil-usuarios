import { useQuery } from '@tanstack/react-query';
import * as providerService from '../services/providers';
import { get } from '../services/api';
import * as userService from '../services/user';
import solicitudesService from '../services/solicitudesService';
import { useAuth } from '../context/AuthContext';

// Cache for concurrent request deduplication
const requestCache = new Map();

/**
 * Batched hook for nearby talleres - groups vehicles by brand to minimize requests
 * Uses strategic caching to prevent excessive refetching
 */
export const useNearbyTalleres = (vehicles, address) => {
    // Only run if we have vehicles and address
    const enabled = vehicles && vehicles.length > 0 && !!address;

    // Create a stable key based on unique brands instead of vehicle IDs
    const uniqueBrands = vehicles
        ? [...new Set(vehicles.map(v => v.marca?.id || v.marca).filter(Boolean))].sort().join(',')
        : '';

    return useQuery({
        queryKey: ['nearbyTalleres', {
            brands: uniqueBrands,
            addressId: address?.id,
            vehicleCount: vehicles?.length || 0
        }],
        queryFn: async ({ signal }) => {
            const cacheKey = `talleres_${uniqueBrands}_${address?.id}`;

            // Check if same request is in-flight
            if (requestCache.has(cacheKey)) {
                console.log('[useNearbyTalleres] Reusing in-flight request');
                return requestCache.get(cacheKey);
            }

            // Create promise and cache it
            const promise = providerService.getWorkshopsForUserVehicles(vehicles, signal);
            requestCache.set(cacheKey, promise);

            try {
                const result = await promise;
                return Array.isArray(result) ? result.slice(0, 5) : [];
            } finally {
                // Clean up cache after request completes
                requestCache.delete(cacheKey);
            }
        },
        enabled: enabled,
        staleTime: 1000 * 60 * 5, // 5 mins - data doesn't change that fast
        cacheTime: 1000 * 60 * 30, // 30 mins - keep in memory
        refetchOnMount: false, // Don't refetch on every mount
        refetchOnWindowFocus: false, // Don't refetch on window focus
        retry: 2, // Retry failed requests
        select: (data) => Array.isArray(data) ? data.slice(0, 5) : [],
    });
};

/**
 * Batched hook for nearby mecanicos - groups vehicles by brand to minimize requests
 * Uses strategic caching to prevent excessive refetching
 */
export const useNearbyMecanicos = (vehicles, address) => {
    const enabled = vehicles && vehicles.length > 0 && !!address;

    // Create a stable key based on unique brands instead of vehicle IDs
    const uniqueBrands = vehicles
        ? [...new Set(vehicles.map(v => v.marca?.id || v.marca).filter(Boolean))].sort().join(',')
        : '';

    return useQuery({
        queryKey: ['nearbyMecanicos', {
            brands: uniqueBrands,
            addressId: address?.id,
            vehicleCount: vehicles?.length || 0
        }],
        queryFn: async ({ signal }) => {
            const cacheKey = `mecanicos_${uniqueBrands}_${address?.id}`;

            // Check if same request is in-flight
            if (requestCache.has(cacheKey)) {
                console.log('[useNearbyMecanicos] Reusing in-flight request');
                return requestCache.get(cacheKey);
            }

            // Create promise and cache it
            const promise = providerService.getMechanicsForUserVehicles(vehicles, signal);
            requestCache.set(cacheKey, promise);

            try {
                const result = await promise;
                return Array.isArray(result) ? result.slice(0, 5) : [];
            } finally {
                // Clean up cache after request completes
                requestCache.delete(cacheKey);
            }
        },
        enabled: enabled,
        staleTime: 1000 * 60 * 5, // 5 mins
        cacheTime: 1000 * 60 * 30, // 30 mins
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: 2,
        select: (data) => Array.isArray(data) ? data.slice(0, 5) : [],
    });
};

// --- New Hooks for Provider Detail ---

export const useProviderDetails = (id, type) => {
    const numericId =
        id !== undefined && id !== null && id !== ''
            ? typeof id === 'number'
                ? id
                : parseInt(String(id), 10)
            : NaN;
    const safeId = Number.isFinite(numericId) ? numericId : null;

    return useQuery({
        queryKey: ['provider', type, safeId],
        queryFn: async () => {
            const endpoint = type === 'taller'
                ? `/usuarios/talleres/${safeId}/`
                : `/usuarios/mecanicos-domicilio/${safeId}/`;
            return await get(endpoint, {}, { requiresAuth: false });
        },
        enabled: safeId != null && !!type,
        staleTime: 1000 * 60 * 5,   // 5 min
        gcTime: 1000 * 60 * 30,     // 30 min en memoria
        refetchOnMount: false,       // no refetch si los datos son frescos
        refetchOnWindowFocus: false,
        // refetchInterval eliminado: el polling cada 30s multiplicaba los requests al backend
    });
};

export const useProviderServices = (id, type, providerName) => {
    return useQuery({
        queryKey: ['providerServices', type, id],
        queryFn: async () => {
            const endpoint = type === 'taller'
                ? `/servicios/ofertas/por_taller/?taller=${id}`
                : `/servicios/ofertas/por_mecanico/?mecanico=${id}`;

            const response = await get(endpoint, {}, { requiresAuth: false });
            const ofertas = Array.isArray(response) ? response : (response?.results || []);

            if (ofertas.length === 0) return [];

            // El backend ahora embebe categorias_info y modelos_info directamente
            // en oferta.servicio_info, eliminando la necesidad de N requests adicionales.
            const serviciosMap = new Map();

            ofertas.forEach((oferta) => {
                const info = oferta.servicio_info || {};
                const servicioId = info.id || oferta.servicio || oferta.id;
                if (!servicioId) return;

                const categoriasInfo = info.categorias_info || [];
                const modelosInfo = info.modelos_info || [];

                const servicioFinal = {
                    id: servicioId,
                    nombre: info.nombre || 'Servicio',
                    descripcion: info.descripcion || '',
                    categoria: categoriasInfo[0]?.nombre || 'General',
                    foto: info.foto || null,
                    duracion_estimada_base: info.duracion_estimada_base || null,
                    precio_referencia: info.precio_referencia || null,
                    categorias_completas: categoriasInfo,
                    modelos_info: modelosInfo,
                    modelos_compatibles: modelosInfo.map((m) => {
                        const marca = m.marca_nombre || '';
                        const nom = m.nombre || m.modelo_nombre || '';
                        return `${marca} ${nom}`.trim() || String(m.id || '');
                    }),

                    // Precios y detalles de la oferta
                    precio_con_repuestos: oferta.precio_con_repuestos,
                    precio_sin_repuestos: oferta.precio_sin_repuestos,
                    tipo_servicio: oferta.tipo_servicio || 'sin_repuestos',
                    costo_mano_de_obra_sin_iva: parseFloat(oferta.costo_mano_de_obra_sin_iva || 0),
                    costo_repuestos_sin_iva: parseFloat(oferta.costo_repuestos_sin_iva || 0),
                    precio_real_sin_iva: parseFloat(oferta.costo_mano_de_obra_sin_iva || 0) + parseFloat(oferta.costo_repuestos_sin_iva || 0),
                    precio_publicado_cliente: parseFloat(oferta.precio_publicado_cliente || 0),
                    fotos_servicio: oferta.fotos_servicio || [],
                    desglose_precios: oferta.desglose_precios || {},
                    oferta_id: oferta.id,
                    duracion_estimada: oferta.duracion_estimada,
                    incluye_garantia: oferta.incluye_garantia,
                    duracion_garantia: oferta.duracion_garantia,

                    tipo_proveedor: type,
                    [type === 'taller' ? 'taller_id' : 'mecanico_id']: id,
                    [type === 'taller' ? 'taller_info' : 'mecanico_info']: {
                        id,
                        nombre: providerName || 'Sin nombre',
                    },
                };

                serviciosMap.set(servicioId, servicioFinal);
            });

            return Array.from(serviciosMap.values());
        },
        enabled: !!id && !!type,
        staleTime: 1000 * 60 * 30,  // 30 min — datos de servicios no cambian seguido
        gcTime: 1000 * 60 * 60,     // 1 hora en memoria tras salir del perfil
        refetchOnMount: false,       // si el cache es fresco, no refetch al navegar de vuelta
        refetchOnWindowFocus: false,
    });
};

export const useProviderDocuments = (id, type) => {
    return useQuery({
        queryKey: ['providerDocuments', type, id],
        queryFn: async () => {
            return await get(
                `/usuarios/documentos-onboarding/proveedor_documentos/?provider_id=${id}&provider_type=${type}`,
                {},
                { requiresAuth: false }
            );
        },
        enabled: !!id && !!type,
        staleTime: 1000 * 60 * 60, // 1 hour
        retry: false,
        select: (data) => Array.isArray(data) ? data : [],
    });
};

export const useProviderReviews = (providerId, providerType) => {
    return useQuery({
        queryKey: ['providerReviews', providerType, providerId],
        queryFn: () => providerService.getProviderReviews(providerId, providerType),
        enabled: !!providerId && !!providerType,
        staleTime: 1000 * 60 * 5, // 5 min - no refetch if visited recently
        gcTime: 1000 * 60 * 30, // 30 min - keep in cache when navigating away
        refetchOnMount: true, // refetch only when data is stale
    });
};

/**
 * Obtiene los trabajos completados por el cliente con un proveedor específico.
 * Usa obtenerMisSolicitudes (SolicitudServicioPublica, estado 'completada') - misma fuente que
 * MarketplaceVehicleDetailScreen y VehicleHistoryScreen - en lugar de getServicesHistory (historial).
 */
export const useProviderCompletedJobs = (id, type) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['providerJobs', type, id],
        queryFn: async () => {
            const allCompleted = await solicitudesService.obtenerMisSolicitudes({ estado: 'completada' });
            
            // Si el usuario no está logueado, obtenerMisSolicitudes retorna []
            const list = Array.isArray(allCompleted) ? allCompleted : (allCompleted?.results || []);
            
            if (list.length === 0) return [];

            // Filtrar por proveedor: oferta_seleccionada_detail tiene proveedor_id_detail (taller/mecanico id) y tipo_proveedor
            const providerIdStr = id.toString();
            const filtered = list
                .filter(s => s.estado === 'completada' && (s.oferta_seleccionada || s.oferta_seleccionada_detail))
                .filter(solicitud => {
                    const offer = solicitud.oferta_seleccionada_detail || solicitud.oferta_seleccionada;
                    if (!offer) return false;
                    const offerTipo = (offer.tipo_proveedor || '').toLowerCase();
                    if (offerTipo !== type) return false;
                    const providerId = offer.proveedor_id_detail || offer.proveedor_id || offer.proveedor_info?.id;
                    return providerId != null && providerId.toString() === providerIdStr;
                })
                .map(s => normalizarJobParaProviderDetail(s))
                .sort((a, b) => {
                    const dateA = new Date(a.fecha_servicio || a.fecha_hora_solicitud || 0);
                    const dateB = new Date(b.fecha_servicio || b.fecha_hora_solicitud || 0);
                    return dateB - dateA;
                });

            return filtered;
        },
        enabled: !!id && !!type, // Habilitado siempre si tenemos id y type
        staleTime: 1000 * 60 * 5,
    });
};

/** Normaliza SolicitudServicioPublica a formato esperado por ProviderCompletedJobsSection */
function normalizarJobParaProviderDetail(s) {
    const offer = s.oferta_seleccionada_detail || s.oferta_seleccionada || {};
    const detalles = offer.detalles_servicios || [];
    let lineas_detail = detalles.map(d => ({
        servicio_nombre: d.servicio_nombre || d.servicio?.nombre || d.nombre || 'Servicio',
        nombre: d.servicio_nombre || d.servicio?.nombre || d.nombre || 'Servicio',
    }));
    if (lineas_detail.length === 0 && (s.servicio_nombre || s.nombre_servicio)) {
        lineas_detail = [{ servicio_nombre: s.servicio_nombre || s.nombre_servicio, nombre: s.servicio_nombre || s.nombre_servicio }];
    }
    if (lineas_detail.length === 0 && s.servicios_solicitados_detail?.length > 0) {
        lineas_detail = s.servicios_solicitados_detail.map(svc => ({ servicio_nombre: svc.nombre, nombre: svc.nombre }));
    }
    if (lineas_detail.length === 0) {
        lineas_detail = [{ servicio_nombre: 'Servicio general', nombre: 'Servicio general' }];
    }
    const vehiculoDetail = s.vehiculo_detail || s.vehiculo_info || s.vehiculo;
    return {
        ...s,
        lineas_detail,
        lineas: lineas_detail,
        vehiculo_detail: vehiculoDetail,
        vehiculo: vehiculoDetail,
        fecha_servicio: s.fecha_servicio || s.fecha_creacion || s.fecha_hora_solicitud,
    };
}
