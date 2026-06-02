/**
 * Resolución de ofertas por marca del vehículo (espejo de backend oferta_resolucion).
 * Prioridad: marca exacta > genérica (null) > descartar otras marcas.
 */

import { resolveVehiculoMarcaModelo } from './servicioVehiculoCompat';

function ofertaMarcaId(oferta) {
  const raw =
    oferta?.marca_vehiculo_id
    ?? oferta?.marca_vehiculo_seleccionada
    ?? oferta?.marca_vehiculo_info?.id
    ?? null;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
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

export function resolverOfertasPreferidasPorMarca(ofertas, vehicle) {
  const list = Array.isArray(ofertas) ? ofertas : [];
  const { marcaId } = resolveVehiculoMarcaModelo(vehicle);
  const mejores = new Map();

  for (const oferta of list) {
    const servicioId = oferta?.servicio ?? oferta?.id;
    const tipo = oferta?.tipo_servicio || 'sin_repuestos';
    if (!servicioId) continue;
    const key = `${servicioId}|${tipo}`;
    const prio = prioridadOfertaParaMarca(oferta, marcaId);
    if (prio < 0) continue;
    const prev = mejores.get(key);
    if (!prev || prio > prev.prio) {
      mejores.set(key, { oferta, prio });
    }
  }

  return Array.from(mejores.values()).map((x) => x.oferta);
}

/**
 * Agrupa filas de catálogo (una por oferta API) en una tarjeta por servicio+tipo.
 */
export function agruparServiciosCatalogoProveedor(ofertas, { vehicle } = {}) {
  const list = Array.isArray(ofertas) ? ofertas : [];
  const { marcaId } = resolveVehiculoMarcaModelo(vehicle);

  if (marcaId != null) {
    return resolverOfertasPreferidasPorMarca(list, vehicle);
  }

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
    const precios = bucket
      .map((o) => Number(o.precio_publicado_cliente || 0))
      .filter((p) => Number.isFinite(p) && p > 0);
    const minPrecio = precios.length ? Math.min(...precios) : null;
    const marcasNombres = [
      ...new Set(
        bucket
          .map((o) => o.marca_vehiculo_nombre || o.marca_vehiculo_info?.nombre)
          .filter(Boolean),
      ),
    ];
    const representante = bucket.reduce((best, o) => {
      const pb = Number(o.precio_publicado_cliente || 0);
      const bb = Number(best?.precio_publicado_cliente || 0);
      if (!best || (pb > 0 && (bb <= 0 || pb < bb))) return o;
      return best;
    }, bucket[0]);

    resultado.push({
      ...representante,
      _precio_desde: minPrecio,
      _tiene_varios_precios: precios.length > 1 && new Set(precios).size > 1,
      _marcas_precio: marcasNombres,
      _ofertas_grupo: bucket,
    });
  }

  return resultado.sort((a, b) =>
    String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }),
  );
}

export function labelPrecioServicioResuelto(servicio) {
  if (servicio?._tiene_varios_precios && servicio._precio_desde != null) {
    return `Desde ${formatCLP(servicio._precio_desde)}`;
  }
  const p = Number(servicio?.precio_publicado_cliente || 0);
  if (p > 0) return formatCLP(p);
  return null;
}

function formatCLP(valor) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(valor));
}
