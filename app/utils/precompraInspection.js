/**
 * Determina si una solicitud pública sigue "activa" para bloquear otra inspección pre-compra
 * marketplace sobre el mismo vehículo del vendedor (alineado con backend:
 * estados de pipeline + completada con ofertas secundarias pendientes).
 */
const ESTADOS_PIPELINE = new Set([
  'creada',
  'seleccionando_servicios',
  'publicada',
  'con_ofertas',
  'adjudicada',
  'pendiente_pago',
  'pagada',
  'en_ejecucion',
]);

export function solicitudPrecompraConsideradaActiva(solicitud) {
  if (!solicitud) return false;
  if (solicitud.estado_efectivo === 'ofertas_adicionales_pendientes') {
    return true;
  }
  if (ESTADOS_PIPELINE.has(solicitud.estado)) {
    return true;
  }
  if (
    solicitud.estado === 'completada' &&
    solicitud.tiene_ofertas_secundarias_pendientes === true
  ) {
    return true;
  }
  return false;
}

/**
 * @param {Array<object>} solicitudes - Mis solicitudes (normalizadas)
 * @param {string|number} vehiculoId - ID del vehículo del vendedor (marketplace)
 */
export function tieneInspeccionPrecompraActivaParaVehiculo(solicitudes, vehiculoId) {
  if (vehiculoId == null || !Array.isArray(solicitudes)) {
    return false;
  }
  const vid = String(vehiculoId);
  return solicitudes.some((s) => {
    const sVid =
      s.vehiculo_inspeccion_precompra ??
      s.vehiculo_inspeccion_precompra_id ??
      (s.properties && s.properties.vehiculo_inspeccion_precompra);
    if (sVid == null || String(sVid) !== vid) {
      return false;
    }
    return solicitudPrecompraConsideradaActiva(s);
  });
}
