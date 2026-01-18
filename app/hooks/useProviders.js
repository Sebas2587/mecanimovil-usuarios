import { useQuery } from '@tanstack/react-query';
import * as providerService from '../services/providers';
import { get } from '../services/api';
import * as userService from '../services/user';

export const useNearbyTalleres = (vehicles, address) => {
    // Only run if we have vehicles and address
    const enabled = vehicles && vehicles.length > 0 && !!address;

    return useQuery({
        queryKey: ['nearbyTalleres', {
            vehicleIds: vehicles?.map(v => v.id).sort().join(','),
            addressId: address?.id
        }],
        queryFn: () => providerService.getWorkshopsForUserVehicles(vehicles),
        enabled: enabled,
        staleTime: 1000 * 60 * 15, // 15 mins
        select: (data) => Array.isArray(data) ? data.slice(0, 5) : [],
    });
};

export const useNearbyMecanicos = (vehicles, address) => {
    const enabled = vehicles && vehicles.length > 0 && !!address;

    return useQuery({
        queryKey: ['nearbyMecanicos', {
            vehicleIds: vehicles?.map(v => v.id).sort().join(','),
            addressId: address?.id
        }],
        queryFn: () => providerService.getMechanicsForUserVehicles(vehicles),
        enabled: enabled,
        staleTime: 1000 * 60 * 15, // 15 mins
        select: (data) => Array.isArray(data) ? data.slice(0, 5) : [],
    });
};

// --- New Hooks for Provider Detail ---

export const useProviderDetails = (id, type) => {
    return useQuery({
        queryKey: ['provider', type, id],
        queryFn: async () => {
            const endpoint = type === 'taller'
                ? `/usuarios/talleres/${id}/`
                : `/usuarios/mecanicos-domicilio/${id}/`;
            return await get(endpoint);
        },
        enabled: !!id && !!type,
        staleTime: 1000 * 60 * 5, // 5 min
        refetchInterval: 30000, // Poll every 30s
    });
};

export const useProviderServices = (id, type, providerName) => {
    return useQuery({
        queryKey: ['providerServices', type, id],
        queryFn: async () => {
            console.log(`[useProviderServices] Query starting for ${type} ${id}`);
            const endpoint = type === 'taller'
                ? `/servicios/ofertas/por_taller/?taller=${id}`
                : `/servicios/ofertas/por_mecanico/?mecanico=${id}`;

            console.log(`[useProviderServices] Fetching from: ${endpoint}`);
            const response = await get(endpoint);
            console.log(`[useProviderServices] Raw response received for ${type} ${id}:`, response ? 'yes' : 'no');

            // Handle paginated response or direct array
            const ofertas = Array.isArray(response) ? response : (response?.results || []);

            console.log(`[useProviderServices] Fetched ${ofertas.length} offers for ${type} ${id}. Structuring...`);

            // Process offers (logic integrated from ProviderDetailScreen)
            const serviciosMap = new Map();

            // Use Promise.all for parallel fetching of details
            if (ofertas.length === 0) {
                console.log(`[useProviderServices] No offers found for ${type} ${id}`);
                return [];
            }

            await Promise.all(ofertas.map(async (oferta) => {
                // Determine service ID from various possible fields
                const servicioId = oferta.servicio_info?.id || oferta.servicio || oferta.id;

                if (!servicioId) {
                    console.warn('[useProviderServices] Could not determine service ID for offer:', oferta);
                    return;
                }
                let servicioFinal;

                try {
                    const servicioCompleto = await get(`/servicios/servicios/${servicioId}/`);
                    const primeraCategoria = servicioCompleto.categorias_info?.[0]?.nombre || 'General';

                    servicioFinal = {
                        id: servicioId,
                        nombre: servicioCompleto.nombre || oferta.servicio_info.nombre,
                        descripcion: servicioCompleto.descripcion || oferta.servicio_info.descripcion,
                        categoria: primeraCategoria,

                        // Legacy Data
                        precio_con_repuestos: oferta.precio_con_repuestos,
                        precio_sin_repuestos: oferta.precio_sin_repuestos,

                        // New Data
                        tipo_servicio: oferta.tipo_servicio,
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

                        duracion_estimada_base: servicioCompleto.duracion_estimada_base,
                        precio_referencia: servicioCompleto.precio_referencia,
                        foto: servicioCompleto.foto,
                        categorias_completas: servicioCompleto.categorias_info,

                        modelos_info: servicioCompleto.modelos_info || [],
                        modelos_compatibles: servicioCompleto.modelos_info?.map(modelo =>
                            `${modelo.marca_nombre} ${modelo.modelo_nombre}`
                        ) || [],

                        tipo_proveedor: type,
                        [type === 'taller' ? 'taller_id' : 'mecanico_id']: id,
                        [type === 'taller' ? 'taller_info' : 'mecanico_info']: {
                            id: id,
                            nombre: providerName || 'Sin nombre',
                        }
                    };
                } catch (error) {
                    console.warn(`[useProviderServices] Error fetching detail for service ${servicioId}:`, error);
                    // Fallback for failed service details fetch
                    servicioFinal = {
                        id: servicioId,
                        nombre: oferta.servicio_info.nombre,
                        descripcion: oferta.servicio_info.descripcion,
                        categoria: 'General',

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
                        tipo_proveedor: type
                    };
                }

                serviciosMap.set(servicioId, servicioFinal);
            }));

            const finalResult = Array.from(serviciosMap.values());
            console.log(`[useProviderServices] Returning ${finalResult.length} processed services for ${type} ${id}`);
            return finalResult;
        },
        enabled: !!id && !!type,
        staleTime: 1000 * 60 * 5, // 5 min
    });
};

export const useProviderDocuments = (id, type) => {
    return useQuery({
        queryKey: ['providerDocuments', type, id],
        queryFn: async () => {
            return await get(
                `/usuarios/documentos-onboarding/proveedor_documentos/?provider_id=${id}&provider_type=${type}`
            );
        },
        enabled: !!id && !!type,
        staleTime: 1000 * 60 * 60, // 1 hour
        retry: false,
        select: (data) => Array.isArray(data) ? data : [],
    });
};

export const useProviderCompletedJobs = (id, type) => {
    return useQuery({
        queryKey: ['providerJobs', type, id],
        queryFn: async () => {
            const historyResponse = await userService.getServicesHistory({ estado: 'completado' });
            const allCompleted = Array.isArray(historyResponse?.results)
                ? historyResponse.results
                : Array.isArray(historyResponse)
                    ? historyResponse
                    : [];

            // Filter jobs for this provider
            return allCompleted.filter(solicitud => {
                const providerIdStr = id.toString();
                if (type === 'taller') {
                    const tallerId = solicitud.taller?.id || solicitud.taller;
                    return tallerId?.toString() === providerIdStr;
                } else if (type === 'mecanico') {
                    const mecanicoId = solicitud.mecanico?.id || solicitud.mecanico;
                    return mecanicoId?.toString() === providerIdStr;
                }
                return false;
            }).sort((a, b) => {
                const dateA = new Date(a.fecha_servicio || a.fecha_hora_solicitud || 0);
                const dateB = new Date(b.fecha_servicio || b.fecha_hora_solicitud || 0);
                return dateB - dateA;
            });
        },
        enabled: !!id && !!type,
        staleTime: 1000 * 60 * 5,
    });
};
