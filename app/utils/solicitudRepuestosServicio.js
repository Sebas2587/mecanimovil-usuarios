/**
 * Texto de repuestos en solicitud: prioriza configuración de la oferta del proveedor.
 */

export function resolveRepuestosServicioMeta(solicitud) {
  if (!solicitud) {
    return { label: 'Solo mano de obra', incluye: false, fuente: null };
  }

  const oferta = solicitud.oferta_seleccionada_detail || solicitud.oferta_seleccionada;
  if (oferta != null && typeof oferta.incluye_repuestos === 'boolean') {
    const incluye = Boolean(oferta.incluye_repuestos);
    return {
      label: incluye ? 'Con repuestos' : 'Solo mano de obra',
      incluye,
      fuente: 'proveedor',
    };
  }

  const incluye = solicitud.requiere_repuestos !== false;
  return {
    label: incluye ? 'Con repuestos' : 'Solo mano de obra',
    incluye,
    fuente: 'solicitud',
  };
}

export function getRepuestosServicioIcon(incluye) {
  return incluye ? 'construct-outline' : 'hammer-outline';
}
