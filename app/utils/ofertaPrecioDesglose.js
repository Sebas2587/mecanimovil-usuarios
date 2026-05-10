/**
 * Desglose subtotal (sin IVA) + IVA alineado a precio_total_ofrecido.
 * Misma regla que mecanimovil-prov en oferta-detalle: si mo+rep+gest y sum*1.19 cuadran
 * con el total (±2), el IVA es el residuo total − subtotal; si no, se reparte desde total/1.19.
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

  let subSinIvaDisplay;
  let ivaDisplay;

  if (totalCliente <= 0) {
    subSinIvaDisplay = 0;
    ivaDisplay = 0;
  } else if (tieneMontosProveedor && lineasCuadranConTotal) {
    subSinIvaDisplay = Math.round(sumSinIva);
    ivaDisplay = totalCliente - subSinIvaDisplay;
  } else {
    subSinIvaDisplay = Math.round(totalCliente / 1.19);
    ivaDisplay = totalCliente - subSinIvaDisplay;
  }

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
