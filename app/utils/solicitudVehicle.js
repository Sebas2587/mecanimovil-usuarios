/**
 * Resuelve el id de vehículo de una solicitud pública (objeto plano o GeoJSON normalizado).
 * null/undefined = solicitud sin vehículo en la cuenta del usuario (ej. inspección pre-compra).
 */
export function getSolicitudVehiculoId(solicitud) {
  if (!solicitud) return null;
  const v = solicitud.vehiculo;
  if (v && typeof v === 'object' && v.id != null) return v.id;
  if (v != null && v !== '') return v;
  const fallback =
    solicitud.vehiculo_detail?.id ??
    solicitud.vehiculo_id ??
    solicitud.properties?.vehiculo ??
    solicitud.properties?.vehiculo_id;
  return fallback != null && fallback !== '' ? fallback : null;
}

/** Solicitud creada sin vehículo del usuario (inspección pre-compra, etc.) */
export function isSolicitudSinVehiculoEnCuenta(solicitud) {
  return getSolicitudVehiculoId(solicitud) == null;
}

function sameVehicleId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/**
 * Solicitudes que deben verse en el panel con un vehículo seleccionado:
 * las del vehículo elegido más las sin vehículo en cuenta (p. ej. pre-compra).
 * Si no hay vehículo seleccionado (garaje vacío), solo las sin vehículo en cuenta.
 */
export function solicitudVisibleParaVehiculoDashboard(solicitud, selectedVehicleId) {
  if (selectedVehicleId == null) {
    return isSolicitudSinVehiculoEnCuenta(solicitud);
  }
  if (isSolicitudSinVehiculoEnCuenta(solicitud)) return true;
  return sameVehicleId(getSolicitudVehiculoId(solicitud), selectedVehicleId);
}

/** Estados en los que el cliente puede cancelar la solicitud pública (sin oferta aún elegida). */
const ESTADOS_SOLICITUD_PUBLICA_CANCELABLES = new Set([
  'creada',
  'seleccionando_servicios',
  'publicada',
  'con_ofertas',
]);

/**
 * Espera respuesta del proveedor (confirmación o créditos): el cliente puede cancelar
 * porque no depende de él que el proveedor no responda o no tenga saldo.
 */
const ESTADOS_ESPERA_PROVEEDOR_CANCELABLES = new Set([
  'pendiente_confirmacion',
  'esperando_creditos_proveedor',
]);

/**
 * True si el cliente puede cancelar desde la app (lista o detalle).
 * No aplica si ya está adjudicada, en pago o en ejecución.
 */
export function puedeClienteCancelarSolicitudPublica(solicitud) {
  if (!solicitud || !solicitud.estado) return false;
  if (ESTADOS_ESPERA_PROVEEDOR_CANCELABLES.has(solicitud.estado)) {
    return true;
  }
  if (!ESTADOS_SOLICITUD_PUBLICA_CANCELABLES.has(solicitud.estado)) return false;
  if (solicitud.oferta_seleccionada != null && solicitud.oferta_seleccionada !== '') return false;
  if (solicitud.oferta_seleccionada_detail != null) return false;
  return true;
}
