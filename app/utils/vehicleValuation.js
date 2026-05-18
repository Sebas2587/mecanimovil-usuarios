/**
 * Valor de mercado / tasación devuelto por consultar-patente (GetAPI appraisal).
 */

export function tieneValorMercadoDesdeApi(vehicleData) {
  if (!vehicleData) return false;
  if (vehicleData.tiene_tasacion_mercado === true) return true;
  if (vehicleData.tiene_tasacion_mercado === false) return false;

  const keys = [
    'precio_mercado_promedio',
    'precio_mercado_min',
    'precio_mercado_max',
    'tasacion_fiscal',
  ];
  return keys.some((key) => {
    const n = Number(vehicleData[key]);
    return Number.isFinite(n) && n > 0;
  });
}

export function necesitaValorMercadoManual(vehicleData) {
  return !tieneValorMercadoDesdeApi(vehicleData);
}
