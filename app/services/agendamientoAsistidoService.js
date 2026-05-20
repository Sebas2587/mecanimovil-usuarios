/**
 * API del asistente de agendamiento IA (consultas stateless en servidor).
 */
import Constants from 'expo-constants';
import { get, post } from './api';

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
    oferta_servicio_id: ofertaServicioId,
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

export function mapCandidatoToOfertaComparador(candidato) {
  if (!candidato) return null;
  const desglose = candidato.desglose || {};
  const total = desglose.precio_publicado_cliente
    ?? (candidato.incluye_repuestos_sugerido
      ? candidato.precio_con_repuestos
      : candidato.precio_sin_repuestos)
    ?? 0;
  return {
    id: `catalogo-${candidato.oferta_servicio_id}`,
    oferta_servicio_id: candidato.oferta_servicio_id,
    origen_catalogo: true,
    precio_total_ofrecido: total,
    costo_mano_obra: desglose.mano_obra ?? 0,
    costo_repuestos: desglose.repuestos ?? 0,
    costo_gestion_compra: desglose.gestion ?? 0,
    incluye_repuestos: Boolean(candidato.incluye_repuestos_sugerido),
    nombre_proveedor: candidato.proveedor?.nombre,
    proveedor_nombre: candidato.proveedor?.nombre,
    tipo_proveedor: candidato.proveedor?.tipo,
    proveedor_id: candidato.proveedor?.proveedor_id,
    rating_proveedor: candidato.proveedor?.rating,
    a_domicilio: candidato.a_domicilio,
    score_match: candidato.score_match,
    explicacion: candidato.explicacion,
    servicios: candidato.servicio ? [candidato.servicio] : [],
    estado: 'catalogo_preview',
  };
}
