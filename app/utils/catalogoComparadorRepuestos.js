/**
 * Preferencia de repuestos del cliente vs catálogo publicado por proveedor (comparador).
 */

export function solicitudRequiereRepuestos(valor) {
  return valor !== false;
}

function parsePrecioPositivo(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function ofreceRepuestosEnCatalogo(candidatoOrOferta) {
  if (!candidatoOrOferta) return false;
  if (candidatoOrOferta.ofrece_repuestos === true) return true;
  if (candidatoOrOferta.ofrece_repuestos === false) return false;
  if (candidatoOrOferta.tipo_servicio_catalogo === 'sin_repuestos') return false;
  if (candidatoOrOferta.tipo_servicio === 'sin_repuestos') return false;
  if (candidatoOrOferta.coincidencia_repuestos === 'solo_mano_obra_alternativa') return false;

  const lineas = candidatoOrOferta.servicios_ofrecidos;
  if (Array.isArray(lineas) && lineas.length > 0) {
    return lineas.some((svc) => servicioOfreceRepuestosEnCatalogo(svc));
  }

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

/** Un servicio del grupo publica repuestos en catálogo (configuración del proveedor). */
export function servicioOfreceRepuestosEnCatalogo(svc) {
  if (!svc) return false;
  if (svc.ofrece_repuestos_catalogo === true) return true;
  if (svc.ofrece_repuestos_catalogo === false) return false;
  if (Array.isArray(svc.repuestos_info) && svc.repuestos_info.length > 0) return true;
  return false;
}

/** Leyenda del modo de precio mostrado para una línea de servicio. */
export function etiquetaModoPrecioServicio(svc) {
  if (!svc) return null;
  if (svc.incluye_repuestos_efectivo) return 'Con repuestos';
  if (servicioOfreceRepuestosEnCatalogo(svc) && svc.permite_solo_mano_obra) {
    return 'Solo mano de obra';
  }
  if (!servicioOfreceRepuestosEnCatalogo(svc)) return 'Solo mano de obra';
  return null;
}

/**
 * True si el proveedor publica alternativa solo mano de obra para este servicio/grupo.
 * Si solo vende con repuestos, devuelve false y la oferta debe respetarse completa.
 */
export function servicioPermiteSoloManoObra(svcOrOferta) {
  if (!svcOrOferta) return true;
  if (svcOrOferta.permite_solo_mano_obra === true) return true;
  if (svcOrOferta.permite_solo_mano_obra === false) return false;
  if (svcOrOferta.tipo_servicio === 'sin_repuestos') return true;
  if (!servicioOfreceRepuestosEnCatalogo(svcOrOferta)
    && !ofreceRepuestosEnCatalogo(svcOrOferta)) {
    return true;
  }
  const sin = Number(svcOrOferta.precio_sin_repuestos);
  const rep = Number(
    svcOrOferta.precio_con_repuestos
    ?? svcOrOferta.desglose?.precio_publicado_cliente,
  );
  if (Number.isFinite(sin) && sin > 0 && (!Number.isFinite(rep) || rep <= 0 || sin < rep * 0.995)) {
    return true;
  }
  const d = svcOrOferta.desglose || {};
  if (Number(d.repuestos) <= 0 && Number(d.gestion) <= 0) {
    const mo = Number(d.mano_obra);
    const total = parsePrecioPositivo(svcOrOferta.precio ?? d.precio_publicado_cliente);
    if (mo > 0 && total > 0 && total <= Math.round(mo * 1.2)) return true;
  }
  return false;
}

/** Algún servicio del grupo exige repuestos (no hay tarifa solo MO). */
export function grupoRequiereRepuestosObligatorios(candidato) {
  if (!candidato) return false;
  if (candidato.requiere_repuestos_obligatorio === true) return true;
  const lineas = candidato.servicios_ofrecidos;
  if (Array.isArray(lineas) && lineas.length > 0) {
    return lineas.some(
      (svc) => servicioOfreceRepuestosEnCatalogo(svc) && !servicioPermiteSoloManoObra(svc),
    );
  }
  return ofreceRepuestosEnCatalogo(candidato) && !servicioPermiteSoloManoObra(candidato);
}

/** Etiqueta de preferencia del cliente (paso repuestos). */
export function etiquetaSolicitudRepuestos(solicitudConRepuestos) {
  return solicitudConRepuestos ? 'Tu elección: Con repuestos' : 'Tu elección: Solo mano de obra';
}

/** true si lo pedido en la solicitud difiere de lo publicado en catálogo del proveedor. */
export function hayDesajusteRepuestosCatalogo(solicitudConRepuestos, candidato) {
  if (solicitudConRepuestos) {
    return !ofreceRepuestosEnCatalogo(candidato);
  }
  return grupoRequiereRepuestosObligatorios(candidato);
}

/**
 * Badge de catálogo solo cuando hay desajuste (ej. pediste repuestos y el proveedor solo publica MO).
 */
export function etiquetaCatalogoRepuestos(solicitudConRepuestos, candidato) {
  if (!hayDesajusteRepuestosCatalogo(solicitudConRepuestos, candidato)) return null;
  if (solicitudConRepuestos) return 'Catálogo: solo mano de obra';
  return 'Catálogo: incluye repuestos';
}

/** @deprecated Usar etiquetaCatalogoRepuestos */
export function etiquetaCatalogoSinRepuestos(solicitudConRepuestos, candidato) {
  return etiquetaCatalogoRepuestos(solicitudConRepuestos, candidato);
}

/** "Tu elección" solo cuando no hay desajuste y el cliente pidió solo mano de obra. */
export function debeMostrarBadgeTuEleccionRepuestos(solicitudConRepuestos, candidato) {
  if (hayDesajusteRepuestosCatalogo(solicitudConRepuestos, candidato)) return false;
  if (solicitudConRepuestos) return false;
  return true;
}

export function resolveModoPrecioCandidato(candidato, solicitudConRepuestos) {
  if (solicitudConRepuestos) {
    return ofreceRepuestosEnCatalogo(candidato) ? 'con_repuestos' : 'solo_mano_obra';
  }
  if (grupoRequiereRepuestosObligatorios(candidato)) return 'con_repuestos';
  return 'solo_mano_obra';
}

/** Suma precios por línea cuando hay multi-servicio. */
export function sumPreciosServiciosOfrecidos(candidato) {
  const lineas = candidato?.servicios_ofrecidos;
  if (!Array.isArray(lineas) || lineas.length === 0) return 0;
  return lineas.reduce((acc, svc) => acc + parsePrecioPositivo(svc.precio), 0);
}

/** Desglose agregado efectivo (respeta modo por servicio del backend). */
export function buildDesgloseEfectivoCandidato(candidato, requiereRepuestos = true) {
  const lineas = candidato?.servicios_ofrecidos;
  if (Array.isArray(lineas) && lineas.length > 0) {
    let mo = 0;
    let rep = 0;
    let gest = 0;
    let total = 0;
    lineas.forEach((svc) => {
      const d = svc.desglose || {};
      mo += Number(d.mano_obra) || 0;
      rep += Number(d.repuestos) || 0;
      gest += Number(d.gestion) || 0;
      total += parsePrecioPositivo(svc.precio) || parsePrecioPositivo(d.precio_publicado_cliente);
    });
    if (total > 0 || mo > 0 || rep > 0 || gest > 0) {
      return {
        mano_obra: mo,
        repuestos: rep,
        gestion: gest,
        precio_publicado_cliente: total || parsePrecioPositivo(candidato?.precio_total),
      };
    }
  }

  const d = candidato?.desglose || {};
  const modo = resolveModoPrecioCandidato(
    candidato,
    solicitudRequiereRepuestos(requiereRepuestos),
  );
  const usaRep = modo === 'con_repuestos';
  return {
    mano_obra: Number(d.mano_obra) || 0,
    repuestos: usaRep ? (Number(d.repuestos) || 0) : 0,
    gestion: usaRep ? (Number(d.gestion) || 0) : 0,
    precio_publicado_cliente: resolvePrecioTotalCandidato(candidato, requiereRepuestos),
  };
}

/** Total publicado según preferencia del cliente y catálogo por servicio. */
export function resolvePrecioTotalCandidato(candidato, requiereRepuestos = true) {
  if (!candidato) return 0;

  const sumLineas = sumPreciosServiciosOfrecidos(candidato);
  if (sumLineas > 0) return sumLineas;

  const totalBackend = parsePrecioPositivo(candidato.precio_total);
  if (totalBackend > 0) return totalBackend;

  const solicitudConRep = solicitudRequiereRepuestos(requiereRepuestos);
  const modo = resolveModoPrecioCandidato(candidato, solicitudConRep);

  if (modo === 'con_repuestos') {
    return parsePrecioPositivo(
      candidato.precio_con_repuestos
      ?? candidato.precio_total_ofrecido
      ?? candidato.desglose?.precio_publicado_cliente,
    );
  }

  const sinRep = parsePrecioPositivo(candidato.precio_sin_repuestos);
  if (sinRep > 0) return sinRep;

  const desglosePub = parsePrecioPositivo(candidato.desglose?.precio_publicado_cliente);
  if (desglosePub > 0) return desglosePub;

  const mo = Number(candidato.desglose?.mano_obra);
  if (Number.isFinite(mo) && mo > 0) return Math.round(mo * 1.19);

  return parsePrecioPositivo(candidato.precio_total_ofrecido);
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
