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

/** 0=Lunes … 6=Domingo (mismo criterio que HorarioProveedor en backend). */
export function diaSemanaDesdeFecha(fechaYmd) {
  const d = new Date(`${fechaYmd}T12:00:00`);
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
}

/** Solo filas persistidas en BD (id presente), no horarios sintéticos. */
export function horariosSemanalesConfigurados(horarios) {
  if (!Array.isArray(horarios)) return [];
  return horarios.filter((h) => {
    if (h?.id == null && h?.id !== 0) return false;
    const activo = h.activo;
    if (activo === false || activo === 0 || activo === '0' || activo === 'false') return false;
    return true;
  });
}

export async function obtenerHorariosSemanalesProveedor({
  tipoProveedor,
  proveedorId,
}) {
  const path = `${basePath(tipoProveedor, proveedorId)}/horarios_semanales/`;
  const res = await get(path, {}, { requiresAuth: false });
  return Array.isArray(res) ? res : (res?.horarios || res?.results || []);
}

export async function obtenerDiasDisponiblesAgenda({
  tipoProveedor,
  proveedorId,
  ofertaServicioId,
  miembroTallerId,
  dias = 14,
}) {
  const path = `${basePath(tipoProveedor, proveedorId)}/dias_disponibles_agenda/`;
  const params = { dias };
  if (ofertaServicioId) params.oferta_servicio_id = ofertaServicioId;
  if (miembroTallerId) params.miembro_taller = miembroTallerId;
  return get(path, params);
}

export async function obtenerDisponibilidadConDuracion({
  tipoProveedor,
  proveedorId,
  fecha,
  ofertaServicioId,
  miembroTallerId,
}) {
  const path = `${basePath(tipoProveedor, proveedorId)}/disponibilidad_con_duracion/`;
  const params = { fecha };
  if (ofertaServicioId) params.oferta_servicio_id = ofertaServicioId;
  if (miembroTallerId) params.miembro_taller = miembroTallerId;
  return get(path, params);
}

/** Mecánicos aptos para el picker de agenda (solo talleres con equipo). */
export async function obtenerMecanicosAptosAgenda({
  tallerId,
  ofertaServicioId,
  modalidad,
}) {
  const params = {};
  if (ofertaServicioId) params.oferta_servicio_id = ofertaServicioId;
  if (modalidad) params.modalidad = modalidad;
  const res = await get(
    `/usuarios/talleres/${tallerId}/mecanicos-aptos-agenda/`,
    params,
    { requiresAuth: false },
  );
  return Array.isArray(res?.miembros) ? res.miembros : [];
}

/**
 * Días con al menos un slot libre: cruza horario semanal real del proveedor
 * con disponibilidad_con_duracion por fecha y duración de la oferta.
 */
export async function resolverFechasAgendaReales({
  tipoProveedor,
  proveedorId,
  ofertaServicioId,
  miembroTallerId,
  diasCalendario = [],
}) {
  // Con técnico elegido, la API filtra por su agenda (no usar horario genérico del taller).
  if (miembroTallerId) {
    try {
      const diasRes = await obtenerDiasDisponiblesAgenda({
        tipoProveedor,
        proveedorId,
        ofertaServicioId,
        miembroTallerId,
        dias: diasCalendario.length || 14,
      });
      const fechasApi = Array.isArray(diasRes?.fechas_disponibles)
        ? diasRes.fechas_disponibles
        : [];
      return {
        fechas: fechasApi.sort(),
        sinHorarioConfigurado: false,
        diasLaborables: new Set(),
      };
    } catch {
      return { fechas: [], sinHorarioConfigurado: true, diasLaborables: new Set() };
    }
  }

  const horarios = await obtenerHorariosSemanalesProveedor({
    tipoProveedor,
    proveedorId,
  });
  const semanaReal = horariosSemanalesConfigurados(horarios);
  if (semanaReal.length === 0) {
    return {
      fechas: [],
      sinHorarioConfigurado: true,
      diasLaborables: new Set(),
    };
  }

  const diasLaborables = new Set(
    semanaReal.map((h) => Number(h.dia_semana)).filter((n) => Number.isFinite(n)),
  );

  // API agregada (menos llamadas; mismo criterio que disponibilidad_con_duracion)
  try {
    const diasRes = await obtenerDiasDisponiblesAgenda({
      tipoProveedor,
      proveedorId,
      ofertaServicioId,
      miembroTallerId,
      dias: diasCalendario.length || 14,
    });
    const fechasApi = Array.isArray(diasRes?.fechas_disponibles)
      ? diasRes.fechas_disponibles
      : [];
    if (fechasApi.length > 0) {
      return {
        fechas: fechasApi.sort(),
        sinHorarioConfigurado: false,
        diasLaborables,
      };
    }
  } catch {
    /* fallback por día */
  }

  const candidatos = diasCalendario.filter((d) =>
    diasLaborables.has(diaSemanaDesdeFecha(d.fecha)),
  );

  const fechas = [];
  await Promise.all(
    candidatos.map(async (dia) => {
      try {
        const data = await obtenerDisponibilidadConDuracion({
          tipoProveedor,
          proveedorId,
          fecha: dia.fecha,
          ofertaServicioId,
          miembroTallerId,
        });
        if (
          data?.proveedor_disponible
          && Array.isArray(data.slots_disponibles)
          && data.slots_disponibles.length > 0
        ) {
          fechas.push(dia.fecha);
        }
      } catch {
        /* omitir día con error puntual */
      }
    }),
  );

  fechas.sort();
  return {
    fechas,
    sinHorarioConfigurado: false,
    diasLaborables,
  };
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
