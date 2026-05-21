/**
 * Servicio del catálogo por modelo con al menos una oferta de proveedor disponible.
 */
export function servicioTieneProveedoresAsociados(servicio) {
  if (!servicio) return false;
  const total = servicio.ofertas_disponibles?.total;
  if (typeof total === 'number' && total > 0) return true;
  return Boolean(servicio.taller_principal || servicio.mecanico_principal);
}

export function filtrarServiciosConProveedores(servicios) {
  if (!Array.isArray(servicios)) return [];
  return servicios.filter(servicioTieneProveedoresAsociados);
}
