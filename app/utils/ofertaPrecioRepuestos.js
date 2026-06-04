/**
 * Precio efectivo de una oferta según si la propuesta incluye repuestos o solo mano de obra.
 */

function parseNum(value) {
  const n = parseFloat(String(value ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

/** Modo de la propuesta: prioriza `incluye_repuestos` de la oferta; fallback a la solicitud. */
export function resolveIncluyeRepuestosEfectivo(oferta, solicitud = null) {
  if (oferta != null && typeof oferta.incluye_repuestos === 'boolean') {
    return oferta.incluye_repuestos;
  }
  if (solicitud != null && solicitud.requiere_repuestos === false) return false;
  if (solicitud != null && solicitud.requiere_repuestos !== false) return true;
  return true;
}

/** Total publicado al cliente según el modo con/sin repuestos. */
export function resolvePrecioTotalOfrecidoEfectivo(oferta, solicitud = null) {
  const incluye = resolveIncluyeRepuestosEfectivo(oferta, solicitud);
  const totalOfrecido = parseNum(oferta?.precio_total_ofrecido ?? oferta?.precio_total);
  const conRep = parseNum(oferta?.precio_con_repuestos);
  const sinRep = parseNum(oferta?.precio_sin_repuestos);

  if (incluye) {
    if (conRep > 0) return Math.round(conRep);
    return Math.round(totalOfrecido);
  }
  if (sinRep > 0) return Math.round(sinRep);
  return Math.round(totalOfrecido);
}

/**
 * Costos para UI y desglose IVA: si es solo mano de obra, repuestos y gestión van en 0.
 */
export function resolveCostosOfertaParaDisplay(oferta, solicitud = null) {
  const incluyeRepuestos = resolveIncluyeRepuestosEfectivo(oferta, solicitud);
  const precioTotalOfrecido = resolvePrecioTotalOfrecidoEfectivo(oferta, solicitud);
  let costoManoObra = parseNum(oferta?.costo_mano_obra);
  const costoRepuestosRaw = parseNum(oferta?.costo_repuestos);
  const costoGestionRaw = parseNum(oferta?.costo_gestion_compra);

  if (!incluyeRepuestos) {
    if (costoManoObra <= 0 && precioTotalOfrecido > 0) {
      costoManoObra = Math.round(precioTotalOfrecido / 1.19);
    }
    return {
      incluyeRepuestos: false,
      precioTotalOfrecido,
      costoManoObra,
      costoRepuestos: 0,
      costoGestion: 0,
    };
  }

  return {
    incluyeRepuestos: true,
    precioTotalOfrecido,
    costoManoObra,
    costoRepuestos: costoRepuestosRaw,
    costoGestion: costoGestionRaw,
  };
}
