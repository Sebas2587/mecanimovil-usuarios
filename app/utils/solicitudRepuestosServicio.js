/**
 * Texto de repuestos en solicitud: prioriza configuración de la oferta del proveedor.
 */

import {
  lineasTienenRepuestos,
  resolveLineasServicioConRepuestos,
} from './ofertaRepuestos';

function ofertaIncluyeRepuestosCatalogo(oferta) {
  if (!oferta) return false;
  if (oferta.incluye_repuestos === true) return true;
  const costoRep = parseFloat(oferta.costo_repuestos || 0);
  if (Number.isFinite(costoRep) && costoRep > 0) return true;
  return lineasTienenRepuestos(resolveLineasServicioConRepuestos(oferta));
}

export function resolveRepuestosServicioMeta(solicitud) {
  if (!solicitud) {
    return { label: 'Solo mano de obra', incluye: false, fuente: null };
  }

  const oferta = solicitud.oferta_seleccionada_detail || solicitud.oferta_seleccionada;
  if (oferta != null) {
    const incluye = ofertaIncluyeRepuestosCatalogo(oferta);
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
