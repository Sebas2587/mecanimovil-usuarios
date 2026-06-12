/**
 * Calcula el monto a cobrar en Mercado Pago para una oferta.
 * Devuelve siempre un entero CLP (Math.ceil) para que el valor mostrado en la app
 * sea idéntico al que cobra Mercado Pago, que exige unit_price entero en CLP.
 */
export function calcularMontoPagoOferta(tipoPago, {
  costoRepuestos = 0,
  costoGestionCompra = 0,
  costoManoObra = 0,
  precioTotalOfrecido = 0,
} = {}) {
  if (tipoPago === 'repuestos') {
    return Math.ceil(costoRepuestos + costoGestionCompra * 1.19);
  }
  if (tipoPago === 'servicio') {
    return Math.ceil(costoManoObra * 1.19);
  }
  // 'total': precio_total_ofrecido ya viene del proveedor; aplicar ceil por seguridad.
  return Math.ceil(precioTotalOfrecido);
}

/** Formatea un monto CLP con hasta 2 decimales (sin redondear a entero). */
export function formatearMontoCLP(monto) {
  if (monto == null || Number.isNaN(monto)) return '0';
  const num = Number(monto);
  const hasFraction = Math.abs(num - Math.trunc(num)) > 0.0001;
  return num.toLocaleString('es-CL', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
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
