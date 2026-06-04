/**
 * Mapeo oferta de catálogo del proveedor → nueva solicitud (flujo dirigido + confirmar-candidato).
 */

import {
  elegirOfertaParaMarca,
  labelPrecioServicioResuelto,
} from '../../../utils/ofertaResolucionMarca';
import { normalizeRepuestosInfo } from '../../../utils/ofertaRepuestos';

/** Repuestos detallados desde oferta de catálogo (misma forma que motor_match). */
export function extractRepuestosInfoFromOferta(oferta) {
  if (!oferta) return [];
  const fromApi = normalizeRepuestosInfo(oferta.repuestos_info);
  if (fromApi.length > 0) return fromApi;
  const detallado = normalizeRepuestosInfo(oferta.repuestos_info_detallado);
  if (detallado.length > 0) return detallado;
  return [];
}

/** Campos de repuestos/precios comunes al mapear una fila de oferta de catálogo. */
export function mapOfertaCatalogoRepuestosFields(oferta) {
  const repuestos_info = extractRepuestosInfoFromOferta(oferta);
  return {
    repuestos_seleccionados: oferta?.repuestos_seleccionados || [],
    repuestos_info,
    detalles_servicios: repuestos_info.length
      ? [{
          id: oferta?.servicio ?? oferta?.servicio_info?.id,
          servicio: oferta?.servicio ?? oferta?.servicio_info?.id,
          servicio_nombre: oferta?.servicio_info?.nombre || oferta?.nombre,
          nombre: oferta?.servicio_info?.nombre || oferta?.nombre,
          repuestos_info,
        }]
      : [],
  };
}

export function resolveServicioId(servicio) {
  if (!servicio) return null;
  const raw = servicio.id ?? servicio.servicio_id ?? servicio.servicio;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

export function resolveOfertaServicioId(servicio) {
  if (!servicio) return null;
  const raw =
    servicio._oferta_resuelta_id
    ?? servicio.oferta_id
    ?? servicio.oferta_servicio_id;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

/** true si la oferta de catálogo es variante con repuestos. */
export function catalogoIncluyeRepuestos(servicio) {
  if (!servicio) return true;
  return servicio.tipo_servicio !== 'sin_repuestos';
}

export function resolvePrecioTotalCatalogo(servicio, { conRepuestos } = {}) {
  if (!servicio) return 0;
  const incluye =
    conRepuestos !== undefined ? conRepuestos : catalogoIncluyeRepuestos(servicio);
  const total =
    servicio.precio_publicado_cliente ??
    (incluye ? servicio.precio_con_repuestos : servicio.precio_sin_repuestos) ??
    servicio.precio_sin_repuestos ??
    servicio.precio_con_repuestos;
  const n = Number(total);
  return Number.isFinite(n) ? n : 0;
}

export function formatPrecioCatalogoServicio(servicio, options = {}) {
  const vehicle = options.vehicle ?? null;
  const vehicles = options.vehicles ?? null;
  if (vehicle?.id || (Array.isArray(vehicles) && vehicles.length > 0)) {
    const { principal } = labelPrecioServicioResuelto(servicio, { vehicle, vehicles });
    if (principal) return principal;
  }
  if (servicio?._tiene_varios_precios && servicio._precio_desde > 0) {
    return `Desde $${Math.round(servicio._precio_desde).toLocaleString('es-CL')}`;
  }
  const conRepuestos =
    options.conRepuestos !== undefined
      ? options.conRepuestos
      : catalogoIncluyeRepuestos(servicio);
  const n = resolvePrecioTotalCatalogo(servicio, { conRepuestos });
  if (n <= 0) return null;
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

export function labelTipoServicioCatalogo(servicio) {
  return catalogoIncluyeRepuestos(servicio) ? 'Con repuestos' : 'Sin repuestos';
}

/**
 * Aplica la oferta del bucket `_ofertas_grupo` que corresponde al vehículo (marca/motor).
 * Evita usar `bucket[0]` cuando el agrupado se armó sin vehículo primario.
 */
export function resolverOfertaCatalogoParaVehiculo(servicio, vehicle) {
  if (!servicio) return servicio;
  const bucket = servicio._ofertas_grupo;
  if (!vehicle?.id || !Array.isArray(bucket) || bucket.length === 0) {
    return servicio;
  }
  const oferta = elegirOfertaParaMarca(bucket, vehicle);
  if (!oferta) return servicio;
  return {
    ...servicio,
    ...oferta,
    _ofertas_grupo: bucket,
    _oferta_resuelta_id: oferta.oferta_id ?? oferta.id ?? servicio._oferta_resuelta_id,
  };
}

export function mapOfertaCatalogoParaSolicitud(servicio, provider, providerType, vehicle) {
  const fuente = resolverOfertaCatalogoParaVehiculo(servicio, vehicle);
  const servicioId = resolveServicioId(fuente);
  const ofertaId = resolveOfertaServicioId(fuente);
  const panelKind = providerType === 'taller' ? 'taller' : 'mecanico';
  const providerId = provider?.id ?? provider?.providerId;

  return {
    id: servicioId,
    nombre: fuente.nombre || fuente.servicio_nombre || 'Servicio',
    descripcion: fuente.descripcion || '',
    precio_referencia: fuente.precio_referencia ?? fuente.precio_publicado_cliente,
    categoria_id: fuente.categoria_id ?? fuente.categoria,
    categoria_nombre:
      fuente.categoria_nombre
      || fuente.categoria
      || fuente.categorias_completas?.[0]?.nombre
      || fuente.categorias_info?.[0]?.nombre
      || null,
    es_diagnostico: fuente.es_diagnostico,
    tipo_servicio: fuente.tipo_servicio,
    oferta_id: ofertaId,
    oferta_servicio_id: ofertaId,
    precio_publicado_cliente: fuente.precio_publicado_cliente,
    precio_con_repuestos: fuente.precio_con_repuestos,
    precio_sin_repuestos: fuente.precio_sin_repuestos,
    costo_mano_de_obra_sin_iva: fuente.costo_mano_de_obra_sin_iva,
    costo_repuestos_sin_iva: fuente.costo_repuestos_sin_iva,
    desglose_precios: fuente.desglose_precios,
    duracion_estimada: fuente.duracion_estimada,
    incluye_garantia: fuente.incluye_garantia,
    ...mapOfertaCatalogoRepuestosFields(fuente),
    _proveedorPanelKind: panelKind,
    _providerId: providerId,
  };
}

export function buildProviderForSolicitud(provider, providerType) {
  const panelKind = providerType === 'taller' ? 'taller' : 'mecanico';
  const entityId =
    provider?.proveedor_entity_id
    ?? (panelKind === 'taller'
      ? (provider?.taller_id ?? provider?.id ?? provider?.providerId)
      : (provider?.mecanico_id ?? provider?.id ?? provider?.providerId));
  const usuarioId =
    provider?.usuario?.id ??
    provider?.usuario ??
    provider?.usuario_id;
  return {
    ...provider,
    id: entityId,
    tipo: panelKind,
    tipo_proveedor: panelKind,
    proveedor_entity_id: entityId,
    taller_id: panelKind === 'taller' ? entityId : provider?.taller_id,
    mecanico_id: panelKind === 'mecanico' ? entityId : provider?.mecanico_id,
    usuario_id: usuarioId,
    usuario: provider?.usuario ?? (usuarioId ? { id: usuarioId } : undefined),
    _panelKind: panelKind,
  };
}
