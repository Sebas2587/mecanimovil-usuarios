/**
 * Normaliza líneas de servicio con repuestos desde ofertas (postulación o catálogo).
 */

const CALIDAD_REPUESTO_LABELS = {
  original: 'Original',
  oem: 'OEM',
  alternativo: 'Alternativo',
};

function normalizeRepuesto(rep) {
  if (!rep || typeof rep !== 'object') return null;
  const cantidad = rep.cantidad ?? rep.cantidad_estimada ?? 1;
  const marcaRepuesto = (rep.marca_repuesto ?? '').trim();
  const marcaCatalogo = (rep.marca_catalogo ?? rep.marca ?? '').trim();
  const calidad = rep.calidad_repuesto ?? '';
  const calidadLabel =
    rep.calidad_repuesto_label
    || CALIDAD_REPUESTO_LABELS[calidad]
    || '';
  const marcaDisplay = marcaRepuesto || marcaCatalogo;

  return {
    ...rep,
    cantidad,
    cantidad_estimada: rep.cantidad_estimada ?? cantidad,
    marca_repuesto: marcaRepuesto,
    marca_catalogo: marcaCatalogo,
    marca: marcaDisplay,
    calidad_repuesto: calidad,
    calidad_repuesto_label: calidadLabel,
  };
}

export function normalizeRepuestosInfo(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeRepuesto).filter(Boolean);
}

/**
 * @returns {Array<{ id?: *, nombre: string, precio?: number, repuestos_info: object[] }>}
 */
export function resolveLineasServicioConRepuestos(oferta) {
  if (!oferta) return [];

  const detalles = oferta.detalles_servicios_detail || oferta.detalles_servicios;
  if (Array.isArray(detalles) && detalles.length > 0) {
    return detalles.map((d) => ({
      id: d.id ?? d.servicio,
      nombre: d.servicio_nombre || d.servicio?.nombre || d.nombre || 'Servicio',
      precio: parseFloat(d.precio_servicio || 0),
      repuestos_info: normalizeRepuestosInfo(d.repuestos_info),
    }));
  }

  if (Array.isArray(oferta.servicios_ofrecidos) && oferta.servicios_ofrecidos.length > 0) {
    return oferta.servicios_ofrecidos.map((s) => ({
      id: s.id ?? s.oferta_servicio_id,
      nombre: s.nombre || 'Servicio',
      precio: parseFloat(s.precio || 0),
      repuestos_info: normalizeRepuestosInfo(s.repuestos_info),
    }));
  }

  const flat = normalizeRepuestosInfo(oferta.repuestos_info);
  if (flat.length > 0) {
    return [{
      id: oferta.oferta_servicio_id,
      nombre: oferta.servicio?.nombre || oferta.servicio_nombre || null,
      precio: parseFloat(oferta.precio_total_ofrecido || oferta.precio_total || 0),
      repuestos_info: flat,
    }];
  }

  return [];
}

export function lineasTienenRepuestos(lineas) {
  return Array.isArray(lineas) && lineas.some((l) => l.repuestos_info?.length > 0);
}

export function ofertaDebeMostrarRepuestos(oferta, solicitud = null) {
  if (!oferta) return false;
  const costoRep = parseFloat(oferta.costo_repuestos || 0);
  const incluye = Boolean(oferta.incluye_repuestos);
  const tieneLineas = lineasTienenRepuestos(resolveLineasServicioConRepuestos(oferta));
  if (costoRep > 0 || incluye || tieneLineas) {
    return true;
  }
  if (solicitud?.requiere_repuestos === false) return false;
  const ofrece = oferta.ofrece_repuestos !== false;
  if (solicitud == null) {
    return costoRep > 0 || incluye || tieneLineas;
  }
  if (solicitud.requiere_repuestos === false) return false;
  return costoRep > 0 || incluye || (ofrece && tieneLineas);
}
