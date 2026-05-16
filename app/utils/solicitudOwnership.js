/**
 * Propiedad de solicitudes públicas: solo el cliente creador debe verlas en Mis solicitudes.
 */

export function getSolicitudClienteId(solicitud) {
  if (!solicitud) return null;
  const c = solicitud.cliente;
  if (c != null && typeof c === 'object' && c.id != null) return c.id;
  if (c != null && c !== '') return c;
  return (
    solicitud.cliente_id ??
    solicitud.properties?.cliente ??
    solicitud.properties?.cliente_id ??
    null
  );
}

/**
 * Filtra solicitudes que pertenecen al cliente autenticado (defensa en cliente).
 */
export function filtrarSolicitudesDelCliente(solicitudes, clienteId) {
  if (clienteId == null || clienteId === '') {
    return [];
  }
  const cid = String(clienteId);
  return (Array.isArray(solicitudes) ? solicitudes : []).filter((s) => {
    const sid = getSolicitudClienteId(s);
    return sid != null && String(sid) === cid;
  });
}
