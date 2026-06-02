/**
 * API del asistente de agendamiento IA (consultas stateless en servidor).
 */
import Constants from 'expo-constants';
import { get, post } from './api';
import { validarCoordenadasChile } from '../utils/coordenadasServicio';
import { calculateDistance } from '../utils/geoUtils';

const BASE = '/ordenes/asistente-agendamiento';

function truthyFlag(value) {
  if (value === true) return true;
  if (value === false || value == null) return false;
  const s = String(value).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

/** Habilitado si EXPO_PUBLIC, EAS env o app.json extra lo indican (alineado con Render API). */
export function isAsistidoHabilitado() {
  if (truthyFlag(process.env.EXPO_PUBLIC_AGENDAMIENTO_IA_ASISTIDO)) {
    return true;
  }
  return truthyFlag(Constants.expoConfig?.extra?.agendamientoIaAsistido);
}

/**
 * @param {{ texto?: string, vehiculo_id?: number, componentes_salud?: Array, origen?: string }} payload
 */
export async function analizarNecesidad(payload) {
  if (!isAsistidoHabilitado()) {
    const err = new Error('Asistente IA no habilitado');
    err.code = 'agendamiento_ia_deshabilitado';
    throw err;
  }
  return post(`${BASE}/analizar-necesidad/`, payload);
}

/**
 * @param {Object} params - vehiculo_id, servicio_ids, lat, lng, comunas_extraidas, requiere_repuestos
 */
export async function obtenerCandidatosProveedor(params) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(`${key}[]`, String(item)));
    } else {
      query.append(key, String(value));
    }
  });
  const qs = query.toString();
  return get(qs ? `${BASE}/candidatos-proveedor/?${qs}` : `${BASE}/candidatos-proveedor/`);
}

export async function confirmarCandidato(payload) {
  if (!isAsistidoHabilitado()) {
    const err = new Error('Asistente IA no habilitado');
    err.code = 'agendamiento_ia_deshabilitado';
    throw err;
  }
  return post(`${BASE}/confirmar-candidato/`, payload);
}

/** Confirmación catálogo desde perfil de proveedor (no depende del flag IA en cliente). */
export async function confirmarCatalogoProveedor(payload) {
  return post(`${BASE}/confirmar-candidato/`, payload);
}

/**
 * Metadatos del análisis IA + salud para persistir al confirmar (alimenta aprendizaje en servidor).
 * No incluye el texto de consultas efímeras.
 */
export function buildMetadataIaEntrada(analisis, componentesSalud) {
  const hasAnalisis = analisis && (
    analisis.motor_analisis
    || analisis.interpretacion
    || analisis.resumen_salud
    || (Array.isArray(analisis.sintomas_detectados) && analisis.sintomas_detectados.length)
    || analisis.coherencia_salud_texto != null
    || (Array.isArray(analisis.servicios_recomendados) && analisis.servicios_recomendados.length)
  );
  const hasSalud = Array.isArray(componentesSalud) && componentesSalud.length > 0;
  if (!hasAnalisis && !hasSalud) return null;

  const meta = {};
  if (analisis?.motor_analisis) meta.motor_analisis = analisis.motor_analisis;
  if (analisis?.interpretacion) {
    meta.interpretacion = String(analisis.interpretacion).slice(0, 600);
  }
  if (analisis?.resumen_salud) {
    meta.resumen_salud = String(analisis.resumen_salud).slice(0, 600);
  }
  if (Array.isArray(analisis?.sintomas_detectados)) {
    meta.sintomas_detectados = analisis.sintomas_detectados.slice(0, 12);
  }
  if (analisis?.coherencia_salud_texto != null) {
    meta.coherencia_salud_texto = analisis.coherencia_salud_texto;
  }
  if (Array.isArray(analisis?.servicios_recomendados)) {
    meta.servicios_recomendados_ids = analisis.servicios_recomendados
      .map((r) => r?.servicio_id)
      .filter(Boolean)
      .slice(0, 12);
  }
  if (hasSalud) {
    meta.componentes_salud = componentesSalud.slice(0, 12).map((c) => ({
      slug: c.slug,
      nombre: String(c.nombre || '').slice(0, 80),
      nivel_alerta: c.nivel_alerta || c.status,
      salud_porcentaje: c.salud_porcentaje ?? c.salud,
    }));
  }
  return Object.keys(meta).length ? meta : null;
}

/**
 * Arma payload para POST confirmar-candidato desde datos del formulario.
 */
export function buildConfirmarCandidatoPayload(formData, ofertaServicioId, extras = {}) {
  const ofertaIds = Array.isArray(extras.oferta_servicio_ids) && extras.oferta_servicio_ids.length
    ? extras.oferta_servicio_ids.filter(Boolean)
    : ofertaServicioId
      ? [ofertaServicioId]
      : [];
  let lng = null;
  let lat = null;
  const ub = formData.ubicacion_servicio;
  if (ub?.coordinates?.length >= 2) {
    lng = parseFloat(ub.coordinates[0]);
    lat = parseFloat(ub.coordinates[1]);
  } else if (formData.direccion_usuario?.ubicacion?.coordinates?.length >= 2) {
    lng = parseFloat(formData.direccion_usuario.ubicacion.coordinates[0]);
    lat = parseFloat(formData.direccion_usuario.ubicacion.coordinates[1]);
  }

  const servicioIds = (formData.servicios_seleccionados || []).map((s) => s.id).filter(Boolean);

  return {
    oferta_servicio_id: ofertaIds[0] ?? ofertaServicioId,
    oferta_servicio_ids: ofertaIds,
    vehiculo_id: formData.vehiculo?.id,
    servicio_ids: servicioIds,
    descripcion_problema:
      (formData.descripcion_problema || '').trim()
      || (formData.servicios_seleccionados || []).map((s) => s.nombre).filter(Boolean).join('. ')
      || 'Servicio solicitado desde catálogo',
    urgencia: formData.urgencia || 'normal',
    requiere_repuestos: formData.requiere_repuestos !== false,
    fecha_preferida: formData.fecha_preferida,
    hora_preferida: formData.hora_preferida || null,
    direccion_servicio_texto:
      formData.direccion_servicio_texto
      || formData.direccion_usuario?.direccion
      || '',
    detalles_ubicacion: formData.detalles_ubicacion || '',
    direccion_usuario: formData.direccion_usuario?.id || null,
    lat,
    lng,
    ubicacion_servicio: ub,
    metadata_ia_entrada: extras.metadata_ia_entrada ?? formData.ia_analisis_snapshot ?? null,
    score_match: extras.score_match,
  };
}

/** Normaliza distancia_km del API (número o string) para UI. */
export function parseDistanciaKmCandidato(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n >= 999) return null;
  if (n === 0) return null;
  return n < 1 ? Math.round(n * 100) / 100 : Math.round(n * 10) / 10;
}

/** Extrae km desde texto de explicación del motor (ej. "12.3 km"). */
function extractKmFromExplicacion(text) {
  if (!text) return null;
  const m = String(text).match(/(\d+(?:[.,]\d+)?)\s*km/i);
  if (!m) return null;
  const n = Number(String(m[1]).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n >= 999) return null;
  return n < 1 ? Math.round(n * 100) / 100 : Math.round(n * 10) / 10;
}

/**
 * Distancia para cards del comparador: API, explicación o cálculo local con coords del usuario.
 */
export function resolveDistanciaKmCandidato(oferta, userCoords = null) {
  const fromApi = parseDistanciaKmCandidato(oferta?.distancia_km);
  if (fromApi != null) return fromApi;

  const fromExpl = extractKmFromExplicacion(oferta?.explicacion);
  if (fromExpl != null) return fromExpl;

  if (!userCoords?.lat || !userCoords?.lng) return null;

  const p = oferta?.proveedor || {};
  const lat = p.lat ?? p.latitude ?? oferta.proveedor_lat;
  const lng = p.lng ?? p.longitude ?? oferta.proveedor_lng;
  if (lat == null || lng == null) return null;

  const prov = validarCoordenadasChile(lat, lng);
  if (!prov) return null;
  const km = calculateDistance(userCoords.lat, userCoords.lng, prov.lat, prov.lng);
  if (!Number.isFinite(km) || km < 0 || km >= 999) return null;
  if (km < 0.05) return 0.1;
  return km < 1 ? Math.round(km * 100) / 100 : Math.round(km * 10) / 10;
}

export function mapCandidatoToOfertaComparador(candidato) {
  if (!candidato) return null;
  const desglose = candidato.desglose || {};
  const total = candidato.precio_total
    ?? desglose.precio_publicado_cliente
    ?? (candidato.incluye_repuestos_sugerido
      ? candidato.precio_con_repuestos
      : candidato.precio_sin_repuestos)
    ?? 0;
  const serviciosOfrecidos = Array.isArray(candidato.servicios_ofrecidos)
    ? candidato.servicios_ofrecidos
    : candidato.servicio
      ? [{
          id: candidato.servicio.id,
          nombre: candidato.servicio.nombre,
          precio: total,
          oferta_servicio_id: candidato.oferta_servicio_id,
        }]
      : [];
  const ofertaIds = Array.isArray(candidato.oferta_servicio_ids) && candidato.oferta_servicio_ids.length
    ? candidato.oferta_servicio_ids
    : candidato.oferta_servicio_id
      ? [candidato.oferta_servicio_id]
      : serviciosOfrecidos.map((s) => s.oferta_servicio_id).filter(Boolean);
  return {
    id: `catalogo-${ofertaIds.join('-') || candidato.oferta_servicio_id}`,
    oferta_servicio_id: candidato.oferta_servicio_id,
    oferta_servicio_ids: ofertaIds,
    origen_catalogo: true,
    precio_total_ofrecido: total,
    precio_total: total,
    servicios_ofrecidos: serviciosOfrecidos,
    servicios_cubiertos: candidato.servicios_cubiertos,
    servicios_pedidos: candidato.servicios_pedidos,
    cobertura_pct: candidato.cobertura_pct,
    costo_mano_obra: desglose.mano_obra ?? 0,
    costo_repuestos: desglose.repuestos ?? 0,
    costo_gestion_compra: desglose.gestion ?? 0,
    incluye_repuestos: Boolean(candidato.incluye_repuestos_sugerido),
    nombre_proveedor: candidato.proveedor?.nombre,
    proveedor_nombre: candidato.proveedor?.nombre,
    tipo_proveedor: candidato.proveedor?.tipo,
    proveedor_id: candidato.proveedor?.proveedor_id,
    foto_perfil_url: candidato.proveedor?.foto_perfil_url || candidato.proveedor?.foto_perfil,
    proveedor_foto_url: candidato.proveedor?.foto_perfil_url || candidato.proveedor?.foto_perfil,
    proveedor: candidato.proveedor,
    tipo_cobertura_marca:
      candidato.tipo_cobertura_marca ?? candidato.proveedor?.tipo_cobertura_marca,
    ofrece_repuestos: candidato.ofrece_repuestos,
    ofrece_solo_mano_obra: candidato.ofrece_solo_mano_obra,
    tipo_servicio_catalogo: candidato.tipo_servicio_catalogo,
    coincidencia_repuestos: candidato.coincidencia_repuestos,
    solicitud_requiere_repuestos: candidato.solicitud_requiere_repuestos,
    rating_proveedor: candidato.proveedor?.rating,
    a_domicilio: candidato.a_domicilio,
    score_match: candidato.score_match,
    explicacion: candidato.explicacion,
    distancia_km: parseDistanciaKmCandidato(candidato.distancia_km),
    dentro_radio_km: candidato.dentro_radio_km,
    es_recomendado: candidato.es_recomendado,
    es_coincidencia_exacta: candidato.es_coincidencia_exacta,
    nivel_coincidencia: candidato.nivel_coincidencia,
    servicios: serviciosOfrecidos.length
      ? serviciosOfrecidos.map((s) => ({ id: s.id, nombre: s.nombre }))
      : candidato.servicio
        ? [candidato.servicio]
        : [],
    estado: 'catalogo_preview',
    detalles_servicios: Array.isArray(candidato.detalles_servicios)
      ? candidato.detalles_servicios
      : (Array.isArray(candidato.servicios_ofrecidos)
        ? candidato.servicios_ofrecidos.map((s) => ({
            id: s.oferta_servicio_id ?? s.id,
            servicio: s.id,
            servicio_nombre: s.nombre,
            precio_servicio: s.precio,
            repuestos_info: s.repuestos_info || [],
          }))
        : []),
    repuestos_info: candidato.repuestos_info || [],
  };
}
