/**
 * Extrae mensaje legible de errores API (DRF 400 con campos).
 */
export function formatApiErrorMessage(error, fallback = 'Ocurrió un error. Intenta nuevamente.') {
  const d = error?.response?.data ?? error?.data;
  if (typeof d === 'string' && d.trim()) {
    return d.trim();
  }
  if (!d || typeof d !== 'object') {
    return error?.message || fallback;
  }

  const pick = (val) => {
    if (Array.isArray(val) && val.length > 0) {
      return String(val[0]);
    }
    if (typeof val === 'string' && val.trim()) {
      return val.trim();
    }
    return null;
  };

  const direct =
    pick(d.detail) ||
    pick(d.error) ||
    pick(d.message) ||
    pick(d.non_field_errors);
  if (direct) {
    return direct;
  }

  const fieldLabels = {
    descripcion_problema: 'Descripción',
    ubicacion_servicio: 'Ubicación',
    fecha_preferida: 'Fecha',
    direccion_servicio_texto: 'Dirección',
    vehiculo: 'Vehículo',
    servicios_solicitados: 'Servicios',
    fotos_necesidad_data: 'Fotos',
    cliente: 'Cliente',
  };

  for (const [key, val] of Object.entries(d)) {
    const msg = pick(val);
    if (msg) {
      const label = fieldLabels[key] || key;
      return `${label}: ${msg}`;
    }
  }

  return error?.message || fallback;
}
