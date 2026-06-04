import {
  horariosSemanalesConfigurados,
  obtenerDiasDisponiblesAgenda,
  obtenerDisponibilidadConDuracion,
  obtenerHorariosSemanalesProveedor,
} from '../services/disponibilidadProveedorService';
import { buildAgendaContext } from './calendarioProveedorNavigation';

export function proveedorFromCandidato(candidato) {
  const p = candidato?.proveedor || {};
  const tipo = candidato.tipo_proveedor || p.tipo;
  const entityId = p.proveedor_id;
  return {
    id: entityId,
    proveedor_entity_id: entityId,
    nombre: p.nombre,
    tipo,
    tipo_proveedor: tipo,
    taller_id: tipo === 'taller' ? entityId : undefined,
    mecanico_id: tipo === 'mecanico' || tipo === 'domicilio' ? entityId : undefined,
  };
}

function normalizeTipo(tipo) {
  if (tipo === 'mecanico' || tipo === 'domicilio') return 'mecanico';
  if (tipo === 'taller') return 'taller';
  return null;
}

/**
 * Primer slot real del calendario del proveedor (agenda API, no fechas sintéticas).
 */
export async function resolveProximoSlotProveedor({
  proveedor,
  tipoProveedor = null,
  ofertaServicioId = null,
  servicios = [],
  requireOferta = true,
}) {
  const built = buildAgendaContext({
    proveedor,
    tipoProveedor: tipoProveedor || proveedor?.tipo || proveedor?.tipo_proveedor,
    servicios,
    ofertaServicioId,
    requireOferta,
  });

  if (!built.valid) {
    return { ok: false, code: 'agenda_context_invalid', detail: built };
  }

  const tipoNorm = normalizeTipo(built.tipoProveedor);
  if (!tipoNorm) {
    return { ok: false, code: 'tipo_proveedor_invalido' };
  }

  const { proveedorId, ofertaServicioId: ofertaId } = built;

  const horarios = await obtenerHorariosSemanalesProveedor({
    tipoProveedor: tipoNorm,
    proveedorId,
  });
  if (horariosSemanalesConfigurados(horarios).length === 0) {
    return { ok: false, code: 'sin_horario_configurado' };
  }

  let fechas = [];
  try {
    const diasRes = await obtenerDiasDisponiblesAgenda({
      tipoProveedor: tipoNorm,
      proveedorId,
      ofertaServicioId: ofertaId,
      dias: 14,
    });
    fechas = (diasRes?.fechas_disponibles || []).slice().sort();
  } catch {
    fechas = [];
  }

  if (!fechas.length) {
    return { ok: false, code: 'sin_dias_disponibles' };
  }

  for (const fecha of fechas) {
    let disp;
    try {
      disp = await obtenerDisponibilidadConDuracion({
        tipoProveedor: tipoNorm,
        proveedorId,
        fecha,
        ofertaServicioId: ofertaId,
      });
    } catch {
      continue;
    }

    const slots = (disp?.slots_disponibles || []).filter(
      (s) => s.disponible !== false && s.hora,
    );
    if (!disp?.proveedor_disponible || !slots.length) continue;

    const slot = slots[0];
    return {
      ok: true,
      fecha,
      hora: slot.hora,
      hora_fin_estimada: slot.hora_fin_estimada,
      duracion_servicio_solicitado: disp.duracion_servicio_solicitado,
      estado_actual: disp.estado_actual ?? null,
      agendaContext: built.agendaContext,
      proveedorId,
      tipoProveedor: tipoNorm,
      ofertaServicioId: ofertaId,
    };
  }

  return { ok: false, code: 'sin_slots' };
}
