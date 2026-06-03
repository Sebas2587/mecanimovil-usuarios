/**
 * Modalidad del servicio (en taller vs a domicilio) y texto de ubicación en solicitudes públicas.
 */

export function resolveModalidadServicio(solicitud) {
  if (!solicitud) return null;
  if (solicitud.modalidad_servicio?.label) {
    return solicitud.modalidad_servicio;
  }
  const tipo =
    solicitud.tipo_proveedor_servicio
    || solicitud.oferta_seleccionada_detail?.tipo_proveedor
    || solicitud.oferta_seleccionada?.tipo_proveedor;
  if (tipo === 'taller') {
    return { tipo: 'taller', label: 'En taller', a_domicilio: false };
  }
  if (tipo === 'mecanico') {
    return { tipo: 'mecanico', label: 'A domicilio', a_domicilio: true };
  }
  return null;
}

export function getModalidadServicioIcon(modalidad) {
  if (!modalidad) return 'help-circle-outline';
  return modalidad.tipo === 'taller' || modalidad.a_domicilio === false
    ? 'business-outline'
    : 'home-outline';
}

export function resolveUbicacionServicioTexto(solicitud, modalidad) {
  const mod = modalidad || resolveModalidadServicio(solicitud);
  const texto = (solicitud?.direccion_servicio_texto || '').trim();
  if (mod?.tipo === 'taller' && texto) return texto;
  if (mod?.tipo === 'mecanico') return texto || 'Tu domicilio';
  if (texto) return texto;
  return mod?.tipo === 'mecanico' ? 'Tu domicilio' : 'Ubicación no especificada';
}

/** Datos de ubicación al confirmar candidato/oferta de catálogo (taller → dirección del local). */
export function resolveUbicacionConfirmacionFromOferta(oferta) {
  const tipo =
    oferta?.tipo_proveedor
    || oferta?.proveedor?.tipo
    || (oferta?.a_domicilio === true
      ? 'mecanico'
      : oferta?.a_domicilio === false
        ? 'taller'
        : null);
  if (tipo !== 'taller') {
    return { tipo_proveedor: tipo || 'mecanico' };
  }
  const lat = oferta?.proveedor?.lat ?? oferta?.lat ?? null;
  const lng = oferta?.proveedor?.lng ?? oferta?.lng ?? null;
  const direccion =
    oferta?.direccion_proveedor
    || oferta?.proveedor?.direccion
    || oferta?.direccion_servicio_texto
    || '';
  return {
    tipo_proveedor: 'taller',
    direccion_servicio_texto: direccion,
    lat,
    lng,
  };
}
