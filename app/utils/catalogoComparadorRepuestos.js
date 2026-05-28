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
  if (candidatoOrOferta.tipo_servicio_catalogo === 'sin_repuestos') return false;
  if (candidatoOrOferta.tipo_servicio === 'sin_repuestos') return false;
  if (candidatoOrOferta.coincidencia_repuestos === 'solo_mano_obra_alternativa') return false;

  const costoRep = Number(
    candidatoOrOferta.costo_repuestos_sin_iva
    ?? candidatoOrOferta.desglose?.repuestos,
  );
  if (Number.isFinite(costoRep) && costoRep > 0) return true;

  const rep = Number(candidatoOrOferta.precio_con_repuestos);
  const sin = Number(candidatoOrOferta.precio_sin_repuestos);
  if (Number.isFinite(rep) && Number.isFinite(sin) && rep > 0 && sin > 0 && rep > sin * 1.005) {
    return true;
  }

  const repuestosJson = candidatoOrOferta.repuestos_seleccionados;
  if (Array.isArray(repuestosJson) && repuestosJson.length > 0) return true;

  return false;
}

/** Etiqueta fija: lo que eligió el usuario en paso 3 (igual en todas las cards). */
export function etiquetaSolicitudRepuestos(solicitudConRepuestos) {
  return solicitudConRepuestos ? 'Tu elección: Con repuestos' : 'Tu elección: Solo mano de obra';
}

export function etiquetaCatalogoSinRepuestos(solicitudConRepuestos, candidato) {
  if (!solicitudConRepuestos) return null;
  if (ofreceRepuestosEnCatalogo(candidato)) return null;
  return 'Catálogo: solo mano de obra';
}

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

export function avisoRepuestosCatalogo(ofertas, solicitudConRepuestos, mensajeApi = null) {
  if (!solicitudConRepuestos) return null;
  if (mensajeApi && String(mensajeApi).trim()) return String(mensajeApi).trim();
  const { conRepuestos, soloManoObra } = partitionPorRepuestosCatalogo(ofertas);
  if (conRepuestos.length === 0 && soloManoObra.length > 0) {
    return `No hay proveedores con repuestos en catálogo. ${soloManoObra.length} alternativa(s) solo mano de obra.`;
  }
  if (conRepuestos.length > 0 && soloManoObra.length > 0) {
    return `${conRepuestos.length} con repuestos · ${soloManoObra.length} solo mano de obra (alternativa).`;
  }
  if (conRepuestos.length > 0) {
    return `${conRepuestos.length} proveedor(es) con repuestos en catálogo.`;
  }
  return null;
}

export function tituloSubgrupoRepuestos(tipo) {
  if (tipo === 'con_repuestos') return 'Con repuestos en catálogo';
  return 'Solo mano de obra (alternativa)';
}

export function subtituloSubgrupoRepuestos(tipo) {
  if (tipo === 'solo_mano_obra') return 'Sin repuestos publicados en su catálogo';
  return null;
}

export function debeMostrarBloqueRepuestos(ofertas, solicitudConRepuestos) {
  if (!solicitudConRepuestos) return false;
  const { conRepuestos, soloManoObra } = partitionPorRepuestosCatalogo(ofertas);
  return conRepuestos.length > 0 || soloManoObra.length > 0;
}
