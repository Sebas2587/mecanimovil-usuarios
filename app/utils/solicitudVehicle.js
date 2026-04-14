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
