/**
 * Mapeo oferta de catálogo del proveedor → nueva solicitud (flujo dirigido + confirmar-candidato).
 */

import { labelPrecioServicioResuelto } from '../../../utils/ofertaResolucionMarca';
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

export function mapOfertaCatalogoParaSolicitud(servicio, provider, providerType) {
  const servicioId = resolveServicioId(servicio);
  const ofertaId = resolveOfertaServicioId(servicio);
  const panelKind = providerType === 'taller' ? 'taller' : 'mecanico';
  const providerId = provider?.id ?? provider?.providerId;

  return {
    id: servicioId,
    nombre: servicio.nombre || servicio.servicio_nombre || 'Servicio',
    descripcion: servicio.descripcion || '',
    precio_referencia: servicio.precio_referencia ?? servicio.precio_publicado_cliente,
    categoria_id: servicio.categoria_id ?? servicio.categoria,
    categoria_nombre:
      servicio.categoria_nombre
      || servicio.categoria
      || servicio.categorias_completas?.[0]?.nombre
      || servicio.categorias_info?.[0]?.nombre
      || null,
    es_diagnostico: servicio.es_diagnostico,
    tipo_servicio: servicio.tipo_servicio,
    oferta_id: ofertaId,
    oferta_servicio_id: ofertaId,
    precio_publicado_cliente: servicio.precio_publicado_cliente,
    precio_con_repuestos: servicio.precio_con_repuestos,
    precio_sin_repuestos: servicio.precio_sin_repuestos,
    costo_mano_de_obra_sin_iva: servicio.costo_mano_de_obra_sin_iva,
    costo_repuestos_sin_iva: servicio.costo_repuestos_sin_iva,
    desglose_precios: servicio.desglose_precios,
    duracion_estimada: servicio.duracion_estimada,
    incluye_garantia: servicio.incluye_garantia,
    ...mapOfertaCatalogoRepuestosFields(servicio),
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
