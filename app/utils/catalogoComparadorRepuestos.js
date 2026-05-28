/**
 * Preferencia de repuestos del cliente vs catálogo publicado por proveedor (comparador).
 */

export function solicitudRequiereRepuestos(valor) {
  return valor !== false;
}

export function ofreceRepuestosEnCatalogo(candidatoOrOferta) {
  if (!candidatoOrOferta) return false;
  if (candidatoOrOferta.ofrece_repuestos === true) return true;
  if (candidatoOrOferta.ofrece_repuestos === false) return false;
  const rep = Number(candidatoOrOferta.precio_con_repuestos);
  const desglose = candidatoOrOferta.desglose || {};
  if (Number(desglose.repuestos) > 0) return true;
  return Number.isFinite(rep) && rep > 0;
}

/** Etiqueta fija según lo que eligió el usuario en el paso 3 (no cambia por proveedor). */
export function etiquetaSolicitudRepuestos(solicitudConRepuestos) {
  return solicitudConRepuestos ? 'Con repuestos' : 'Solo mano de obra';
}

/** Aviso en card cuando el catálogo no publica repuestos pero el usuario los pidió. */
export function etiquetaCatalogoSinRepuestos(solicitudConRepuestos, candidato) {
  if (!solicitudConRepuestos) return null;
  if (ofreceRepuestosEnCatalogo(candidato)) return null;
  return 'Sin repuestos en catálogo';
}

/**
 * Precio y desglose a mostrar: respeta solicitud si hay catálogo; si no, solo mano de obra.
 */
export function resolveModoPrecioCandidato(candidato, solicitudConRepuestos) {
  if (!solicitudConRepuestos) return 'solo_mano_obra';
  return ofreceRepuestosEnCatalogo(candidato) ? 'con_repuestos' : 'solo_mano_obra';
}

export function partitionPorRepuestosCatalogo(ofertas) {
  const list = Array.isArray(ofertas) ? ofertas : [];
  const conRepuestos = [];
  const soloManoObra = [];
  list.forEach((o) => {
    if (ofreceRepuestosEnCatalogo(o)) conRepuestos.push(o);
    else soloManoObra.push(o);
  });
  return { conRepuestos, soloManoObra };
}

export function necesitaSeccionarPorRepuestos(ofertas, solicitudConRepuestos) {
  if (!solicitudConRepuestos) return false;
  const { conRepuestos, soloManoObra } = partitionPorRepuestosCatalogo(ofertas);
  return conRepuestos.length > 0 && soloManoObra.length > 0;
}

export function avisoRepuestosCatalogo(ofertas, solicitudConRepuestos) {
  if (!solicitudConRepuestos) return null;
  const { conRepuestos, soloManoObra } = partitionPorRepuestosCatalogo(ofertas);
  if (conRepuestos.length > 0 || soloManoObra.length === 0) return null;
  return 'Ningún proveedor publica repuestos para este servicio. Alternativas solo mano de obra:';
}

export function tituloSubgrupoRepuestos(tipo) {
  if (tipo === 'con_repuestos') return 'Con repuestos en catálogo';
  return 'Solo mano de obra';
}

export function subtituloSubgrupoRepuestos(tipo) {
  if (tipo === 'solo_mano_obra') return 'No incluyen repuestos en su catálogo';
  return null;
}
