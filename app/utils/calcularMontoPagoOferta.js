/**
 * Calcula el monto a cobrar en Mercado Pago para una oferta.
 * Réplica la lógica de crear_preferencia_pago_proveedor en el backend, sin redondear a entero.
 */
export function calcularMontoPagoOferta(tipoPago, {
  costoRepuestos = 0,
  costoGestionCompra = 0,
  costoManoObra = 0,
  precioTotalOfrecido = 0,
} = {}) {
  if (tipoPago === 'repuestos') {
    return costoRepuestos + costoGestionCompra * 1.19;
  }
  if (tipoPago === 'servicio') {
    return costoManoObra * 1.19;
  }
  return precioTotalOfrecido;
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
