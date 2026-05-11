/**
 * Desglose subtotal (sin IVA) + IVA derivados SIEMPRE de precio_total_ofrecido.
 *
 * IVA = total − round(total / 1.19)  — garantiza IVA > 0 cuando total > 0.
 * Los costos individuales (mo, rep, gest) se usan solo como contexto de líneas,
 * nunca para calcular el IVA final.
 */
export function calcularDesgloseIvaOferta({
  costoManoObra = 0,
  costoRepuestos = 0,
  costoGestionCompra = 0,
  precioTotalOfrecido = 0,
} = {}) {
  const mo = parseFloat(String(costoManoObra ?? '0')) || 0;
  const rep = parseFloat(String(costoRepuestos ?? '0')) || 0;
  const gest = parseFloat(String(costoGestionCompra ?? '0')) || 0;
  const totalCliente = Math.round(parseFloat(String(precioTotalOfrecido ?? '0')) || 0);
  const sumSinIva = mo + rep + gest;
  const tieneMontosProveedor = mo > 0 || rep > 0 || gest > 0;
  const TOL = 2;
  const totalDesdeLineas = Math.round(sumSinIva * 1.19);
  const lineasCuadranConTotal =
    sumSinIva > 0 && Math.abs(totalDesdeLineas - totalCliente) <= TOL;

  // IVA y subtotal SIEMPRE derivados del total — única fuente de verdad
  const subSinIvaDisplay = totalCliente > 0 ? Math.round(totalCliente / 1.19) : 0;
  const ivaDisplay = totalCliente > 0 ? totalCliente - subSinIvaDisplay : 0;

  return {
    subSinIvaDisplay,
    ivaDisplay,
    totalCliente,
    lineasCuadranConTotal,
    sumSinIva,
    tieneMontosProveedor,
    mostrarNotaReconciliacion:
      tieneMontosProveedor && totalCliente > 0 && !lineasCuadranConTotal && sumSinIva > 0,
  };
}

/**
 * Resuelve el desglose final a mostrar.
 * Usa el IVA del API solo cuando sea positivo y coherente.
 * En cualquier otro caso usa el cálculo local (siempre > 0 cuando total > 0).
 */
export function resolverDesgloseIvaMostrado(dApi, calc) {
  const apiIva = dApi != null && dApi.iva != null ? Number(dApi.iva) : null;
  const apiSub = dApi != null && dApi.subtotal_sin_iva != null ? Number(dApi.subtotal_sin_iva) : null;
  const apiTotal = dApi != null && dApi.total != null ? Number(dApi.total) : null;

  const apiValida =
    apiIva !== null &&
    Number.isFinite(apiIva) &&
    apiIva > 0 &&
    apiSub !== null &&
    Number.isFinite(apiSub) &&
    apiTotal !== null &&
    Number.isFinite(apiTotal) &&
    apiTotal > 0;

  if (apiValida) {
    return { subSinIva: apiSub, iva: apiIva, total: apiTotal };
  }

  return {
    subSinIva: calc.subSinIvaDisplay,
    iva: calc.ivaDisplay,
    total: calc.totalCliente,
  };
}
