import { get } from './api';

/**
 * Disponibilidad de agenda del proveedor según duración del servicio (OfertaServicio).
 */
function basePath(tipoProveedor, proveedorId) {
  if (tipoProveedor === 'taller') {
    return `/usuarios/talleres/${proveedorId}`;
  }
  return `/usuarios/mecanicos-domicilio/${proveedorId}`;
}

export async function obtenerDiasDisponiblesAgenda({
  tipoProveedor,
  proveedorId,
  ofertaServicioId,
  dias = 14,
}) {
  const path = `${basePath(tipoProveedor, proveedorId)}/dias_disponibles_agenda/`;
  const params = { dias };
  if (ofertaServicioId) params.oferta_servicio_id = ofertaServicioId;
  return get(path, params);
}

export async function obtenerDisponibilidadConDuracion({
  tipoProveedor,
  proveedorId,
  fecha,
  ofertaServicioId,
}) {
  const path = `${basePath(tipoProveedor, proveedorId)}/disponibilidad_con_duracion/`;
  const params = { fecha };
  if (ofertaServicioId) params.oferta_servicio_id = ofertaServicioId;
  return get(path, params);
}

/** Genera próximos N días como { fecha, label } */
export function generarDiasCalendario(cantidad = 14) {
  const dias = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const nombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  for (let i = 0; i < cantidad; i += 1) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const fecha = `${yyyy}-${mm}-${dd}`;
    dias.push({
      fecha,
      label: i === 0 ? 'Hoy' : nombres[d.getDay()],
      diaNum: d.getDate(),
    });
  }
  return dias;
}
