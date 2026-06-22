/**
 * Técnico preferido/asignado en solicitudes de taller con equipo.
 */
export function resolveTecnicoPreferido(solicitud, oferta = null) {
  const o = oferta || solicitud?.oferta_seleccionada_detail;
  if (o?.miembro_taller_detail?.nombre) {
    return o.miembro_taller_detail;
  }
  if (solicitud?.miembro_taller_preferido_detail?.nombre) {
    return solicitud.miembro_taller_preferido_detail;
  }
  return null;
}

export function especialidadesTecnicoTexto(tecnico) {
  const list = tecnico?.especialidades;
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.map((e) => e.nombre).filter(Boolean).join(' · ');
}
