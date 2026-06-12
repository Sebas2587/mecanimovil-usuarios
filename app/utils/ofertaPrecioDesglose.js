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
  const totalCliente = parseFloat(String(precioTotalOfrecido ?? '0')) || 0;
  const sumSinIva = mo + rep + gest;
  const tieneMontosProveedor = mo > 0 || rep > 0 || gest > 0;
  const TOL = 0.02;
  const totalDesdeLineas = sumSinIva * 1.19;
  const lineasCuadranConTotal =
    sumSinIva > 0 && Math.abs(totalDesdeLineas - totalCliente) <= TOL;

  // Si las líneas del proveedor no cierran con precio_total, mostrar sub/IVA/total desde las líneas.
  const usarLineasComoBase = tieneMontosProveedor && sumSinIva > 0 && !lineasCuadranConTotal;

  const subSinIvaDisplay = usarLineasComoBase
    ? sumSinIva
    : (totalCliente > 0 ? totalCliente / 1.19 : 0);
  const ivaDisplay = usarLineasComoBase
    ? sumSinIva * 0.19
    : (totalCliente > 0 ? totalCliente - subSinIvaDisplay : 0);
  const totalMostrar = usarLineasComoBase ? totalDesdeLineas : totalCliente;

  return {
    subSinIvaDisplay,
    ivaDisplay,
    totalCliente: totalMostrar,
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
  const TOL = 0.02;
  const apiIva = dApi != null && dApi.iva != null ? Number(dApi.iva) : null;
  const apiSub = dApi != null && dApi.subtotal_sin_iva != null ? Number(dApi.subtotal_sin_iva) : null;
  const apiTotal = dApi != null && dApi.total != null ? Number(dApi.total) : null;

  const apiCoherente =
    apiIva !== null &&
    Number.isFinite(apiIva) &&
    apiIva > 0 &&
    apiSub !== null &&
    Number.isFinite(apiSub) &&
    apiTotal !== null &&
    Number.isFinite(apiTotal) &&
    apiTotal > 0 &&
    Math.abs(apiSub + apiIva - apiTotal) <= TOL;

  if (apiCoherente) {
    return { subSinIva: apiSub, iva: apiIva, total: apiSub + apiIva };
  }

  return {
    subSinIva: calc.subSinIvaDisplay,
    iva: calc.ivaDisplay,
    total: calc.subSinIvaDisplay + calc.ivaDisplay,
  };
}
