/** Estados de OfertaVehiculo que bloquean otra oferta al mismo vendedor (alineado con backend). */
const ESTADOS_BLOQUEANTES = new Set(['pendiente', 'contraoferta', 'aceptada']);

/**
 * @param {Array<object>} sentOffers - mis_ofertas_enviadas
 * @param {number|string} vendedorUsuarioId - usuario.id del dueño del listing
 */
export function tieneOfertaActivaConVendedor(sentOffers, vendedorUsuarioId) {
  if (vendedorUsuarioId == null || !Array.isArray(sentOffers)) {
    return false;
  }
  const vid = String(vendedorUsuarioId);
  return sentOffers.some((o) => {
    const estado = (o.estado || '').toLowerCase();
    if (!ESTADOS_BLOQUEANTES.has(estado)) {
      return false;
    }
    const sellerId = o.vendedor_id ?? o.vendedorId;
    return sellerId != null && String(sellerId) === vid;
  });
}

/**
 * Extrae mensaje de error de creación de oferta (DRF).
 */
export function parseCreateOfferError(error) {
  const d = error?.response?.data;
  if (!d) {
    return error?.message || null;
  }
  if (typeof d.detail === 'string') {
    return d.detail;
  }
  if (Array.isArray(d.non_field_errors) && d.non_field_errors[0]) {
    return String(d.non_field_errors[0]);
  }
  if (typeof d.non_field_errors === 'string') {
    return d.non_field_errors;
  }
  if (d.mensaje) {
    return String(d.mensaje);
  }
  if (d.code === 'oferta_activa_mismo_vendedor') {
    return null;
  }
  return null;
}
