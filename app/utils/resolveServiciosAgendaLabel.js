/**
 * Resuelve el/los nombres de servicio para el resumen del calendario.
 * Cubre formPayload, servicios_seleccionados, pendingConfirm y respuesta de agenda.
 */

function cleanName(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  return s;
}

function nombreFromItem(item) {
  if (item == null) return null;
  if (typeof item === 'string' || typeof item === 'number') {
    const asStr = String(item).trim();
    // Evitar IDs numéricos como título
    if (/^\d+$/.test(asStr)) return null;
    return cleanName(asStr);
  }
  return (
    cleanName(item.nombre)
    || cleanName(item.servicio_nombre)
    || cleanName(item.nombre_servicio)
    || cleanName(item.titulo)
    || cleanName(item.servicio?.nombre)
    || cleanName(item.servicio_info?.nombre)
    || null
  );
}

function firstArray(...candidates) {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  return [];
}

/**
 * @returns {{ label: string|null, names: string[] }}
 */
export function resolveServiciosAgendaLabel({
  routeParams = {},
  returnParams = {},
  disponibilidadDia = null,
} = {}) {
  const formPayload = returnParams.formPayload || routeParams.formPayload || {};
  const pending = returnParams.pendingConfirmOferta || {};

  const explicit =
    cleanName(routeParams.servicioNombre)
    || cleanName(returnParams.servicioNombre)
    || cleanName(formPayload.servicioNombre)
    || cleanName(pending.nombre_servicio)
    || cleanName(pending.servicio_nombre)
    || cleanName(disponibilidadDia?.servicio_nombre);

  const servicios = firstArray(
    returnParams.servicios_seleccionados,
    formPayload.servicios_seleccionados,
    routeParams.servicios_seleccionados,
    formPayload.servicios,
    pending.servicios,
    pending.servicios_detalle,
  );

  const namesFromList = [];
  const seen = new Set();
  for (const item of servicios) {
    const n = nombreFromItem(item);
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    namesFromList.push(n);
  }

  if (namesFromList.length > 0) {
    return {
      names: namesFromList,
      label: namesFromList.join(' · '),
    };
  }

  if (explicit) {
    return { names: [explicit], label: explicit };
  }

  // Último recurso: un solo servicio genérico en formPayload.servicio
  const single = nombreFromItem(formPayload.servicio || pending.servicio);
  if (single) return { names: [single], label: single };

  return { names: [], label: null };
}
