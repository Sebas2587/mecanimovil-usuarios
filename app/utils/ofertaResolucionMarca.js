/**
 * Resolución de ofertas por marca del vehículo (espejo de backend oferta_resolucion).
 * Prioridad: marca exacta > genérica (null) > descartar otras marcas.
 */

import { resolveVehiculoMarcaModelo } from './servicioVehiculoCompat';

function normalizeTipoMotorOferta(value) {
  if (value == null || String(value).trim() === '') return '';
  const upper = String(value).toUpperCase().trim();
  if (upper.includes('DIESEL') || upper.includes('DIÉSEL')) return 'DIESEL';
  if (upper.includes('ELECTR')) return 'ELECTRICO';
  if (upper.includes('HIBR') || upper.includes('HYBR')) return 'HIBRIDO';
  if (upper.includes('BENCINA') || upper.includes('GASOL')) return 'GASOLINA';
  if (['GASOLINA', 'DIESEL', 'ELECTRICO', 'HIBRIDO'].includes(upper)) return upper;
  return '';
}

function normalizeTipoMotorVehiculo(value) {
  return normalizeTipoMotorOferta(value) || 'GASOLINA';
}

/** Prioridad marca + motor: oferta específica al motor del vehículo gana sobre universal. */
export function prioridadOfertaParaVehiculo(oferta, vehicle) {
  const { marcaId } = resolveVehiculoMarcaModelo(vehicle);
  const marcaPrio = prioridadOfertaParaMarca(oferta, marcaId);
  if (marcaPrio < 0) return marcaPrio;
  if (!vehicle?.id) return marcaPrio;

  const motorOferta = normalizeTipoMotorOferta(oferta?.tipo_motor);
  if (!motorOferta) return marcaPrio;
  const motorV = normalizeTipoMotorVehiculo(vehicle.tipo_motor);
  if (motorOferta === motorV) return marcaPrio + 2;
  return -3;
}

export function ofertaMarcaId(oferta) {
  const raw =
    oferta?.marca_vehiculo_id
    ?? oferta?.marca_vehiculo_seleccionada
    ?? oferta?.marca_vehiculo_info?.id
    ?? null;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function etiquetaMarcaOferta(oferta) {
  const mid = ofertaMarcaId(oferta);
  if (mid == null) return 'Precio base';
  const nombre = oferta?.marca_vehiculo_nombre || oferta?.marca_vehiculo_info?.nombre;
  return nombre?.trim() || `Marca #${mid}`;
}

export function montoPrecioPublicoOferta(oferta) {
  const d = oferta?.desglose_precios?.precio_final_cliente;
  if (typeof d === 'number' && Number.isFinite(d) && d >= 0) {
    return d;
  }
  const p = Number(oferta?.precio_publicado_cliente || 0);
  return Number.isFinite(p) && p > 0 ? p : null;
}

export function prioridadOfertaParaMarca(oferta, marcaId) {
  const oid = ofertaMarcaId(oferta);
  if (marcaId == null) {
    return oid == null ? 1 : 0;
  }
  if (oid === marcaId) return 2;
  if (oid == null) return 0;
  return -2;
}

export function elegirOfertaParaMarca(ofertas, vehicle) {
  const list = Array.isArray(ofertas) ? ofertas : [];
  const { marcaId } = resolveVehiculoMarcaModelo(vehicle);
  let mejor = null;
  let mejorPrio = -4;
  for (const oferta of list) {
    const prio = vehicle?.id
      ? prioridadOfertaParaVehiculo(oferta, vehicle)
      : prioridadOfertaParaMarca(oferta, marcaId);
    if (prio > mejorPrio) {
      mejor = oferta;
      mejorPrio = prio;
    }
  }
  return mejorPrio >= 0 ? mejor : null;
}

export function resolverOfertasPreferidasPorMarca(ofertas, vehicle) {
  const list = Array.isArray(ofertas) ? ofertas : [];
  const { marcaId } = resolveVehiculoMarcaModelo(vehicle);
  const mejores = new Map();

  for (const oferta of list) {
    const servicioId = oferta?.servicio ?? oferta?.id;
    const tipo = oferta?.tipo_servicio || 'sin_repuestos';
    if (!servicioId) continue;
    const key = `${servicioId}|${tipo}`;
    const prio = vehicle?.id
      ? prioridadOfertaParaVehiculo(oferta, vehicle)
      : prioridadOfertaParaMarca(oferta, marcaId);
    if (prio < 0) continue;
    const prev = mejores.get(key);
    if (!prev || prio > prev.prio) {
      mejores.set(key, { oferta, prio });
    }
  }

  return Array.from(mejores.values()).map((x) => x.oferta);
}

export function buildTarifasPorMarca(ofertas) {
  const list = Array.isArray(ofertas) ? ofertas : [];
  const rows = list.map((o) => ({
    ofertaId: o.oferta_id ?? o.id,
    marcaId: ofertaMarcaId(o) ?? 0,
    marcaLabel: etiquetaMarcaOferta(o),
    precioPublico: montoPrecioPublicoOferta(o),
    disponible: o.disponible !== false,
  }));

  return rows.sort((a, b) => {
    if (a.marcaId === 0 && b.marcaId !== 0) return -1;
    if (b.marcaId === 0 && a.marcaId !== 0) return 1;
    return a.marcaLabel.localeCompare(b.marcaLabel, 'es', { sensitivity: 'base' });
  });
}

/** Etiqueta legible del vehículo del cliente (marca, modelo, patente). */
export function etiquetaVehiculoUsuario(vehicle) {
  if (!vehicle) return 'Tu vehículo';
  const marca = vehicle.marca_nombre || vehicle.marca?.nombre || '';
  const modelo = vehicle.modelo_nombre || vehicle.modelo?.nombre || '';
  const patente = vehicle.patente || vehicle.placa || '';
  const base = [marca, modelo].filter(Boolean).join(' ').trim();
  if (patente && base) return `${base} · ${patente}`;
  if (patente) return patente;
  return base || 'Tu vehículo';
}

/**
 * Precios del servicio solo para vehículos registrados del usuario (compatibles con el bucket).
 */
export function buildTarifasParaVehiculosUsuario(ofertas, vehicles) {
  const bucket = Array.isArray(ofertas) ? ofertas : [];
  const list = Array.isArray(vehicles) ? vehicles.filter((v) => v?.id) : [];
  const rows = [];

  for (const vehicle of list) {
    const oferta = elegirOfertaParaMarca(bucket, vehicle);
    if (!oferta) continue;
    const precioPublico = montoPrecioPublicoOferta(oferta);
    if (precioPublico == null) continue;

    rows.push({
      vehicleId: vehicle.id,
      ofertaId: oferta.oferta_id ?? oferta.id,
      marcaId: ofertaMarcaId(oferta) ?? 0,
      marcaLabel: etiquetaVehiculoUsuario(vehicle),
      precioPublico,
      disponible: oferta.disponible !== false,
    });
  }

  return rows.sort((a, b) =>
    a.marcaLabel.localeCompare(b.marcaLabel, 'es', { sensitivity: 'base' }),
  );
}

/**
 * Agrupa filas de catálogo (una por oferta API) en una tarjeta por servicio+tipo.
 */
export function agruparServiciosCatalogoProveedor(ofertas, { vehicle, vehicles } = {}) {
  const list = Array.isArray(ofertas) ? ofertas : [];
  const userVehicles = Array.isArray(vehicles) && vehicles.length > 0
    ? vehicles.filter((v) => v?.id && v.is_active !== false)
    : vehicle?.id
      ? [vehicle]
      : [];

  const primaryVehicle = vehicle?.id
    ? vehicle
    : userVehicles.length === 1
      ? userVehicles[0]
      : null;

  const { marcaId, marcaNombre } = resolveVehiculoMarcaModelo(primaryVehicle);

  const grupos = new Map();
  for (const oferta of list) {
    const servicioId = oferta?.servicio ?? oferta?.id;
    const tipo = oferta?.tipo_servicio || 'sin_repuestos';
    if (!servicioId) continue;
    const key = `${servicioId}|${tipo}`;
    const bucket = grupos.get(key) || [];
    bucket.push(oferta);
    grupos.set(key, bucket);
  }

  const resultado = [];
  for (const bucket of grupos.values()) {
    const tarifasUsuario = buildTarifasParaVehiculosUsuario(bucket, userVehicles);
    const montos = tarifasUsuario
      .map((t) => t.precioPublico)
      .filter((p) => p != null && p > 0);
    const minPrecio = montos.length ? Math.min(...montos) : null;
    const maxPrecio = montos.length ? Math.max(...montos) : null;
    const tieneVariosPrecios =
      montos.length > 1 && new Set(montos.map((m) => Math.round(m))).size > 1;

    const ofertaResuelta = primaryVehicle
      ? elegirOfertaParaMarca(bucket, primaryVehicle)
      : null;
    const representante = ofertaResuelta ?? bucket[0];

    const marcaResueltaLabel = ofertaResuelta
      ? etiquetaVehiculoUsuario(primaryVehicle)
      : null;

    resultado.push({
      ...representante,
      _precio_desde: minPrecio,
      _precio_hasta: maxPrecio,
      _tiene_varios_precios: tieneVariosPrecios,
      _tarifas_usuario: tarifasUsuario,
      _tarifas_por_marca: tarifasUsuario,
      _ofertas_grupo: bucket,
      _oferta_resuelta_id:
        ofertaResuelta?.oferta_id ?? ofertaResuelta?.id ?? representante.oferta_id,
      _marca_precio_label: marcaResueltaLabel,
      _marca_precio_nombre: marcaId != null ? marcaNombre : null,
    });
  }

  return resultado
    .filter((s) => {
      if (userVehicles.length === 0) return true;
      return Array.isArray(s._tarifas_usuario) && s._tarifas_usuario.length > 0;
    })
    .sort((a, b) =>
      String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }),
    );
}

export function labelPrecioServicioResuelto(servicio, { vehicle, vehicles } = {}) {
  const userVehicles = Array.isArray(vehicles) && vehicles.length > 0
    ? vehicles.filter((v) => v?.id && v.is_active !== false)
    : vehicle?.id
      ? [vehicle]
      : [];

  const tarifasUsuario = servicio?._tarifas_usuario ?? servicio?._tarifas_por_marca ?? [];

  if (userVehicles.length > 0 && tarifasUsuario.length > 0) {
    if (tarifasUsuario.length === 1) {
      const t = tarifasUsuario[0];
      return {
        principal: formatCLP(t.precioPublico),
        subtitulo: t.marcaLabel ? `Para ${t.marcaLabel}` : null,
      };
    }

    const montos = tarifasUsuario
      .map((t) => t.precioPublico)
      .filter((p) => p != null && p > 0);
    const unicoPrecio =
      montos.length > 0 && new Set(montos.map((m) => Math.round(m))).size === 1;

    if (unicoPrecio) {
      return {
        principal: formatCLP(montos[0]),
        subtitulo: `Para tus ${tarifasUsuario.length} vehículos`,
      };
    }

    return { principal: null, subtitulo: null };
  }

  if (userVehicles.length > 0) {
    return { principal: null, subtitulo: null };
  }

  const precioResuelto = montoPrecioPublicoOferta(servicio);
  if (precioResuelto != null && !servicio?._tiene_varios_precios) {
    return { principal: formatCLP(precioResuelto), subtitulo: null };
  }

  return {
    principal: null,
    subtitulo: 'Registra un vehículo para ver el precio de tu marca',
  };
}

function formatCLP(valor) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(valor));
}

/** Expande filas ya agregadas (con _ofertas_grupo) a ofertas crudas para re-agregar. */
export function expandirFilasOferta(servicios) {
  const list = Array.isArray(servicios) ? servicios : [];
  const out = [];
  for (const s of list) {
    if (Array.isArray(s._ofertas_grupo) && s._ofertas_grupo.length > 0) {
      const first = s._ofertas_grupo[0];
      if (first && typeof first === 'object' && 'precio_publicado_cliente' in first) {
        out.push(...s._ofertas_grupo);
        continue;
      }
    }
    out.push(s);
  }
  return out;
}
