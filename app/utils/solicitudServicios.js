/**
 * Resuelve la lista de servicios de una solicitud pública (detalle, cards, modales).
 */

export function resolveServiciosSolicitud(solicitud) {
  if (!solicitud) return [];

  const detail = solicitud.servicios_solicitados_detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((s) => ({
      id: s.id,
      nombre: s.nombre || s.nombre_servicio || 'Servicio',
      categoria: s.categoria,
    }));
  }

  const raw = solicitud.servicios_solicitados;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((s) => {
      if (typeof s === 'number' || typeof s === 'string') {
        return { id: s, nombre: solicitud.servicio_nombre || 'Servicio' };
      }
      return {
        id: s.id,
        nombre: s.nombre || s.nombre_servicio || 'Servicio',
      };
    });
  }

  if (solicitud.servicio_nombre) {
    return [{ id: null, nombre: solicitud.servicio_nombre }];
  }

  return [];
}

/** Título principal: un nombre o resumen de varios. */
export function formatServiciosTitulo(servicios) {
  if (!servicios?.length) return 'Servicio Mecánico';
  if (servicios.length === 1) return servicios[0].nombre;
  return `${servicios.length} servicios solicitados`;
}

/** Texto corto para listados (todos los nombres, separados por coma). */
export function formatServiciosListaTexto(servicios, max = 4) {
  if (!servicios?.length) return 'Sin servicios';
  const nombres = servicios.map((s) => s.nombre).filter(Boolean);
  if (nombres.length <= max) return nombres.join(', ');
  const visibles = nombres.slice(0, max).join(', ');
  return `${visibles} y ${nombres.length - max} más`;
}

/**
 * Líneas de servicio con precio para oferta (catálogo multi-servicio o oferta manual).
 */
export function resolveLineasServicioOferta(oferta, solicitud = null) {
  const detalles = oferta?.detalles_servicios_detail || oferta?.detalles_servicios;
  if (Array.isArray(detalles) && detalles.length > 0) {
    return detalles.map((d) => ({
      id: d.id ?? d.servicio,
      nombre: d.servicio_nombre || d.servicio?.nombre || d.nombre || 'Servicio',
      precio: parseFloat(d.precio_servicio || 0),
    }));
  }

  const solicitados = resolveServiciosSolicitud(solicitud);
  if (solicitados.length > 0) {
    return solicitados.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      precio: 0,
    }));
  }

  return [];
}

export function formatCLPServicio(n) {
  const v = Math.round(Number(n) || 0);
  return `$${v.toLocaleString('es-CL')}`;
}
