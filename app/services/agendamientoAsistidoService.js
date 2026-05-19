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
  if (!isAsistidoHabilitado()) {
    const err = new Error('Asistente IA no habilitado');
    err.code = 'agendamiento_ia_deshabilitado';
    throw err;
  }
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
    proveedor_nombre: candidato.proveedor?.nombre,
    tipo_proveedor: candidato.proveedor?.tipo,
    rating_proveedor: candidato.proveedor?.rating,
    a_domicilio: candidato.a_domicilio,
    score_match: candidato.score_match,
    explicacion: candidato.explicacion,
    servicios: candidato.servicio ? [candidato.servicio] : [],
    estado: 'catalogo_preview',
  };
}
