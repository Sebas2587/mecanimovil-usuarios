/**
 * Redondeo a peso entero (half-up), idéntico al que aplica la boleta del SII
 * y al que exige Mercado Pago (CLP no admite decimales). Centraliza el criterio
 * para que app, backend y boleta muestren y cobren exactamente el mismo entero.
 */
export function redondearCLP(monto) {
  const num = Number(monto);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
}

/**
 * Calcula el monto a cobrar en Mercado Pago para una oferta.
 * Devuelve siempre un entero CLP porque el peso chileno no admite decimales:
 * el valor mostrado en la app coincide exactamente con el que cobra Mercado Pago.
 */
export function calcularMontoPagoOferta(tipoPago, {
  costoRepuestos = 0,
  costoGestionCompra = 0,
  costoManoObra = 0,
  precioTotalOfrecido = 0,
} = {}) {
  if (tipoPago === 'repuestos') {
    // IVA aplica sobre repuestos + gestión porque son parte del servicio integral,
    // igual que el total = (rep + gest + mano) × 1.19.
    // Así repuestos_payment + servicio_payment = total_payment exacto.
    return redondearCLP((costoRepuestos + costoGestionCompra) * 1.19);
  }
  if (tipoPago === 'servicio') {
    return redondearCLP(costoManoObra * 1.19);
  }
  // 'total': precio_total_ofrecido ya viene del proveedor.
  return redondearCLP(precioTotalOfrecido);
}

/**
 * Formatea un monto en CLP como peso entero (sin decimales).
 * El peso chileno no tiene centavos: mostrar decimales (p. ej. "2,38") es incorrecto
 * y confunde al usuario, ya que nunca podría cobrarse ni facturarse ese valor.
 */
export function formatearMontoCLP(monto) {
  if (monto == null || Number.isNaN(Number(monto))) return '0';
  return redondearCLP(monto).toLocaleString('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Devuelve los tres montos posibles de pago para una oferta. */
export function calcularMontosPagoOferta(oferta) {
  const costoRepuestos = parseFloat(oferta.costoRepuestos ?? oferta.costo_repuestos ?? 0);
  const costoGestionCompra = parseFloat(oferta.costoGestionCompra ?? oferta.costo_gestion_compra ?? 0);
  const costoManoObra = parseFloat(oferta.costoManoObra ?? oferta.costo_mano_obra ?? 0);
  const precioTotalOfrecido = parseFloat(
    oferta.precioTotalOfrecido ?? oferta.precio_total_ofrecido ?? oferta.monto_total ?? 0,
  );

  const params = { costoRepuestos, costoGestionCompra, costoManoObra, precioTotalOfrecido };

  return {
    repuestos: calcularMontoPagoOferta('repuestos', params),
    servicio: calcularMontoPagoOferta('servicio', params),
    total: calcularMontoPagoOferta('total', params),
    precioTotalOfrecido,
  };
}

/** True cuando repuestos (si aplica) y mano de obra están pagados. */
export function ofertaEstaTotalmentePagada(oferta) {
  if (!oferta) return false;

  const repuestosPagados = oferta.estado_pago_repuestos === 'pagado';
  const servicioPendiente = (oferta.estado_pago_servicio || 'pendiente') === 'pendiente';
  const esParcial =
    oferta.estado === 'pagada_parcialmente' || (repuestosPagados && servicioPendiente);

  if (esParcial) return false;

  const servicioPagado = (oferta.estado_pago_servicio || 'pendiente') === 'pagado';
  const costoRepuestos = parseFloat(oferta.costo_repuestos ?? oferta.costoRepuestos ?? 0);
  const tieneRepuestos = costoRepuestos > 0;

  if (tieneRepuestos) {
    return repuestosPagados && servicioPagado;
  }

  return (
    servicioPagado
    || ['pagada', 'en_ejecucion', 'completada', 'finalizada', 'calificada'].includes(oferta.estado)
  );
}
