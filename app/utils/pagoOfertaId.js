/**
 * Resuelve el UUID de OfertaProveedor para flujos de pago MP.
 * Prioriza id explícito, luego external_reference (oferta_{uuid}_{tipo}).
 */

export function parseOfertaIdFromExternalReference(externalReference) {
  if (!externalReference || typeof externalReference !== 'string') {
    return null;
  }
  const parts = externalReference.split('_');
  if (parts.length >= 2 && parts[0] === 'oferta' && parts[1]) {
    return parts[1];
  }
  return null;
}

/**
 * @param {object} opts
 * @param {string} [opts.ofertaId]
 * @param {string} [opts.externalReference]
 * @param {object} [opts.pagoPendienteData]
 */
export function resolveOfertaIdForPago({
  ofertaId,
  externalReference,
  pagoPendienteData,
} = {}) {
  if (ofertaId) {
    return String(ofertaId);
  }
  const fromRef = parseOfertaIdFromExternalReference(externalReference);
  if (fromRef) {
    return fromRef;
  }
  if (pagoPendienteData?.ofertaId) {
    return String(pagoPendienteData.ofertaId);
  }
  return parseOfertaIdFromExternalReference(pagoPendienteData?.externalReference);
}

export function isOfertaNotFoundError(error) {
  const msg = String(error?.message || '').toLowerCase();
  const status = error?.response?.status ?? error?.status;
  return status === 404 || msg.includes('oferta no encontrada');
}
