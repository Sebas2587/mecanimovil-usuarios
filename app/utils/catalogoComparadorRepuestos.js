/**
 * Preferencia de repuestos del cliente vs catálogo publicado por proveedor (comparador).
 *
 * Regla de visualización: precios y desglose SIEMPRE como publica el proveedor en catálogo.
 * La preferencia del cliente (con/sin repuestos) solo afecta ranking del match y badges.
 */

import {
  esServicioDiagnosticoInspeccion,
  todosServiciosSonDiagnosticoInspeccion,
} from './servicioDiagnosticoInspeccion';

export function solicitudRequiereRepuestos(valor) {
  return valor !== false;
}

/** true si el candidato / oferta es diagnóstico o inspección (no aplica repuestos). */
export function candidatoEsDiagnosticoInspeccion(candidato) {
  if (!candidato) return false;
  if (candidato.es_diagnostico === true) return true;

  const lineas = candidato.servicios_ofrecidos;
  if (Array.isArray(lineas) && lineas.length > 0) {
    return todosServiciosSonDiagnosticoInspeccion(lineas);
  }

  if (candidato.servicio) {
    return esServicioDiagnosticoInspeccion(candidato.servicio);
  }

  const servicios = candidato.servicios;
  if (Array.isArray(servicios) && servicios.length > 0) {
    return todosServiciosSonDiagnosticoInspeccion(servicios);
  }

  return false;
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
  const d = svc.desglose || {};
  if (Number(d.repuestos) > 0 || Number(d.gestion) > 0) return true;
  return false;
}

/** Modo de precio según catálogo del proveedor (no adaptado al cliente). */
export function resolveModoPrecioCatalogo(candidato) {
  return ofreceRepuestosEnCatalogo(candidato) ? 'con_repuestos' : 'solo_mano_obra';
}

/** @deprecated Alias: siempre catálogo. */
export function resolveModoPrecioCandidato(candidato, _solicitudConRepuestos) {
  return resolveModoPrecioCatalogo(candidato);
}

/**
 * True si el proveedor publica alternativa solo mano de obra (tarifa sin repuestos).
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
  return false;
}

/** Algún servicio del grupo solo vende con repuestos en catálogo. */
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

/** Etiqueta de preferencia del cliente (paso repuestos); solo para aviso de desajuste. */
export function etiquetaPreferenciaSolicitudRepuestos(solicitudConRepuestos) {
  return solicitudConRepuestos ? 'Tu solicitud: con repuestos' : 'Tu solicitud: solo mano de obra';
}

/** @deprecated Usar etiquetaPreferenciaSolicitudRepuestos o etiquetaBadgeRepuestosCatalogo */
export function etiquetaSolicitudRepuestos(solicitudConRepuestos) {
  return etiquetaPreferenciaSolicitudRepuestos(solicitudConRepuestos);
}

/**
 * Badge principal del comparador: modo publicado en catálogo (no la preferencia del usuario).
 * Con varios servicios y modos distintos devuelve null (cada línea lleva su etiqueta).
 */
export function etiquetaBadgeRepuestosCatalogo(candidato) {
  if (!candidato) return null;
  const lineas = candidato.servicios_ofrecidos;
  if (Array.isArray(lineas) && lineas.length > 0) {
    const conRep = lineas.map((s) => servicioOfreceRepuestosEnCatalogo(s));
    const todosCon = conRep.every(Boolean);
    const todosSin = conRep.every((v) => !v);
    if (todosCon) return 'Con repuestos';
    if (todosSin) return 'Solo mano de obra';
    return null;
  }
  return ofreceRepuestosEnCatalogo(candidato) ? 'Con repuestos' : 'Solo mano de obra';
}

/** true si el badge principal debe estilarse como oferta con repuestos. */
export function candidatoBadgeIncluyeRepuestos(candidato) {
  const label = etiquetaBadgeRepuestosCatalogo(candidato);
  if (label === 'Con repuestos') return true;
  if (label === 'Solo mano de obra') return false;
  return ofreceRepuestosEnCatalogo(candidato);
}

/** true si lo pedido en la solicitud difiere de lo publicado en catálogo del proveedor. */
export function hayDesajusteRepuestosCatalogo(solicitudConRepuestos, candidato) {
  if (solicitudConRepuestos) {
    return !ofreceRepuestosEnCatalogo(candidato);
  }
  return grupoRequiereRepuestosObligatorios(candidato);
}

/** Badge secundario cuando la solicitud del usuario no coincide con el catálogo publicado. */
export function etiquetaCatalogoRepuestos(solicitudConRepuestos, candidato) {
  if (!hayDesajusteRepuestosCatalogo(solicitudConRepuestos, candidato)) return null;
  return etiquetaPreferenciaSolicitudRepuestos(solicitudConRepuestos);
}

/** @deprecated Usar etiquetaCatalogoRepuestos */
export function etiquetaCatalogoSinRepuestos(solicitudConRepuestos, candidato) {
  return etiquetaCatalogoRepuestos(solicitudConRepuestos, candidato);
}

/** @deprecated El badge principal siempre refleja catálogo vía etiquetaBadgeRepuestosCatalogo */
export function debeMostrarBadgeTuEleccionRepuestos(_solicitudConRepuestos, candidato) {
  return Boolean(etiquetaBadgeRepuestosCatalogo(candidato));
}

/** Leyenda del modo publicado en catálogo para una línea de servicio. */
export function etiquetaModoPrecioServicio(svc) {
  if (!svc) return null;
  if (servicioOfreceRepuestosEnCatalogo(svc)) return 'Con repuestos';
  return 'Solo mano de obra';
}

/**
 * Subtítulo contextual del comparador: ubicación real + tipo de servicio vs preferencia.
 * Sustituye la `explicacion` genérica del API cuando hay datos locales.
 *
 * @param {{ locationLabel?: string|null, aDomicilio?: boolean, solicitudConRepuestos?: boolean, candidato: object }} opts
 */
export function buildExplicacionCandidatoContextual({
  locationLabel = null,
  aDomicilio = false,
  solicitudConRepuestos = true,
  candidato,
} = {}) {
  const parts = [];

  const loc = locationLabel != null ? String(locationLabel).trim() : '';
  if (loc) {
    parts.push(loc);
  } else if (aDomicilio) {
    parts.push('Atiende a domicilio en tu zona');
  }

  if (candidatoEsDiagnosticoInspeccion(candidato)) {
    parts.push('Diagnóstico · no incluye repuestos');
    return parts.join(' · ');
  }

  const catalogoCon = ofreceRepuestosEnCatalogo(candidato);
  const quiereRep = solicitudRequiereRepuestos(solicitudConRepuestos);

  if (quiereRep && catalogoCon) {
    parts.push('Incluye repuestos en catálogo');
  } else if (quiereRep && !catalogoCon) {
    parts.push('Solo mano de obra en catálogo');
  } else if (!quiereRep && !catalogoCon) {
    parts.push('Solo mano de obra, como pediste');
  } else {
    parts.push('Catálogo con repuestos · pediste solo mano de obra');
  }

  return parts.length ? parts.join(' · ') : null;
}

export function sumPreciosServiciosOfrecidos(candidato) {
  const lineas = candidato?.servicios_ofrecidos;
  if (!Array.isArray(lineas) || lineas.length === 0) return 0;
  return lineas.reduce((acc, svc) => acc + parsePrecioPositivo(svc.precio), 0);
}

/** Desglose agregado tal como publica el proveedor (sin adaptar a preferencia del cliente). */
export function buildDesgloseCatalogoCandidato(candidato) {
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
  return {
    mano_obra: Number(d.mano_obra) || 0,
    repuestos: Number(d.repuestos) || 0,
    gestion: Number(d.gestion) || 0,
    precio_publicado_cliente: resolvePrecioTotalCandidato(candidato),
  };
}

/** @deprecated Alias */
export function buildDesgloseEfectivoCandidato(candidato, _requiereRepuestos) {
  return buildDesgloseCatalogoCandidato(candidato);
}

/** Total publicado en catálogo (suma de líneas o precio_con/sin según configuración del proveedor). */
export function resolvePrecioTotalCandidato(candidato, _requiereRepuestos) {
  if (!candidato) return 0;

  const sumLineas = sumPreciosServiciosOfrecidos(candidato);
  if (sumLineas > 0) return sumLineas;

  const totalBackend = parsePrecioPositivo(candidato.precio_total);
  if (totalBackend > 0) return totalBackend;

  if (ofreceRepuestosEnCatalogo(candidato)) {
    return parsePrecioPositivo(
      candidato.precio_con_repuestos
      ?? candidato.precio_total_ofrecido
      ?? candidato.desglose?.precio_publicado_cliente,
    );
  }

  return parsePrecioPositivo(
    candidato.precio_sin_repuestos
    ?? candidato.precio_total_ofrecido
    ?? candidato.desglose?.precio_publicado_cliente,
  );
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
