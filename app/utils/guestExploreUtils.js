export function mapPublicDataToPrefill(data, patente) {
  if (!data) return null;
  return {
    patente: data.patente || patente,
    marca: data.marca_nombre,
    marca_nombre: data.marca_nombre,
    marca_id: data.marca_id,
    modelo: data.modelo_nombre,
    modelo_nombre: data.modelo_nombre,
    modelo_id: data.modelo_id,
    year: data.year,
    color: data.color,
    motor: data.motor,
    tipo_motor: data.tipo_motor,
    cilindraje: data.cilindraje,
    precio_mercado_promedio: data.precio_mercado_promedio,
    precio_mercado_min: data.precio_mercado_min,
    precio_mercado_max: data.precio_mercado_max,
    tasacion_fiscal: data.tasacion_fiscal,
    tiene_tasacion_mercado: data.tiene_tasacion_mercado,
  };
}

export function formatGuestValorLabel(vehicleData) {
  if (!vehicleData) return null;
  if (vehicleData.precio_mercado_min && vehicleData.precio_mercado_max) {
    return `$${Number(vehicleData.precio_mercado_min).toLocaleString('es-CL')} – $${Number(vehicleData.precio_mercado_max).toLocaleString('es-CL')}`;
  }
  if (vehicleData.precio_mercado_promedio) {
    return `~$${Number(vehicleData.precio_mercado_promedio).toLocaleString('es-CL')}`;
  }
  return null;
}
