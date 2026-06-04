import {
  buildConfirmarCandidatoPayload,
  confirmarCatalogoProveedor,
  mapCandidatoToOfertaComparador,
  obtenerCandidatosProveedor,
} from './agendamientoAsistidoService';
import { resolveCoordenadasServicio } from '../utils/coordenadasServicio';
import { extraerComunasDesdeDireccion } from '../utils/extraerComunasDesdeDireccion';
import { pickCandidatoPreferido, listCandidatosPreferidos } from '../utils/pickCandidatoPreferido';
import {
  proveedorFromCandidato,
  resolveProximoSlotProveedor,
} from '../utils/resolveProximoSlotProveedor';
import { resolveUbicacionConfirmacionFromOferta } from '../utils/solicitudModalidadServicio';
import { resolveOfertaServicioId } from '../components/home/shared/providerCatalogSchedule';

/** Cotización candidatos-proveedor cuando el usuario ya eligió servicio en el wizard. */
export async function fetchWizardCandidatosQuote(formData, { provider, ofertaServicioId } = {}) {
  const servicioIds = (formData.servicios_seleccionados || []).map((s) => s.id).filter(Boolean);
  const coords = resolveCoordenadasServicio(formData);

  if (!formData.vehiculo?.id || !servicioIds.length) {
    return { ok: false, code: 'missing_inputs' };
  }
  if (!coords) {
    return { ok: false, code: 'sin_coordenadas' };
  }

  const data = await obtenerCandidatosProveedor({
    vehiculo_id: formData.vehiculo.id,
    servicio_ids: servicioIds,
    lat: coords.lat,
    lng: coords.lng,
    comunas_extraidas: extraerComunasDesdeDireccion(formData.direccion_usuario),
    direccion_texto:
      formData.direccion_servicio_texto?.trim()
      || formData.direccion_usuario?.direccion?.trim()
      || '',
    requiere_repuestos: formData.requiere_repuestos !== false,
  });

  const pool = [
    ...(data.candidatos_recomendados || data.candidatos || []),
    ...(data.otros_candidatos || []),
  ];

  const ofertaId = ofertaServicioId
    ?? resolveOfertaServicioId(formData.servicios_seleccionados?.[0]);

  const candidato = pickCandidatoPreferido(pool, { provider, ofertaServicioId: ofertaId });
  if (!candidato) {
    return { ok: false, code: 'sin_candidatos', raw: data };
  }

  const alternativas = listCandidatosPreferidos(pool, { provider, ofertaServicioId: ofertaId });

  return {
    ok: true,
    candidato,
    oferta: mapCandidatoToOfertaComparador(candidato),
    alternativas,
    mensajeRepuestos: data.mensaje_repuestos ?? null,
    esExacta: Boolean(candidato.es_coincidencia_exacta || candidato.es_recomendado),
    multiMatch: alternativas.length > 1,
  };
}

/** Primer slot real del calendario del proveedor elegido. */
export async function fetchWizardProximoSlot(candidato, formData) {
  const proveedor = proveedorFromCandidato(candidato);
  const ofertaId = candidato.oferta_servicio_id
    ?? resolveOfertaServicioId(formData.servicios_seleccionados?.[0]);

  return resolveProximoSlotProveedor({
    proveedor,
    tipoProveedor: candidato.tipo_proveedor,
    ofertaServicioId: ofertaId,
    servicios: formData.servicios_seleccionados,
    requireOferta: true,
  });
}

export async function confirmWizardCandidato(formData, candidato, slot, extras = {}) {
  const ubicacion = resolveUbicacionConfirmacionFromOferta(
    mapCandidatoToOfertaComparador(candidato),
  );

  const ofertaIds = Array.isArray(candidato.oferta_servicio_ids) && candidato.oferta_servicio_ids.length
    ? candidato.oferta_servicio_ids
    : candidato.oferta_servicio_id
      ? [candidato.oferta_servicio_id]
      : [];

  const payload = buildConfirmarCandidatoPayload(
    {
      ...formData,
      fecha_preferida: slot?.fecha || formData.fecha_preferida,
      hora_preferida: slot?.hora || formData.hora_preferida || null,
      tipo_proveedor_preseleccionado: candidato.tipo_proveedor,
    },
    ofertaIds[0],
    {
      oferta_servicio_ids: ofertaIds,
      score_match: candidato.score_match,
      tipo_proveedor: candidato.tipo_proveedor,
      direccion_servicio_texto: ubicacion.direccion_servicio_texto,
      lat: ubicacion.lat,
      lng: ubicacion.lng,
      ...extras,
    },
  );

  return confirmarCatalogoProveedor(payload);
}
