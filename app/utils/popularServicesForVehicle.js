/**
 * Servicios más solicitados (grupos públicos) ordenados por compatibilidad con el vehículo activo.
 */

import { resolveVehiculoMarcaModelo } from './servicioVehiculoCompat';

function normalizeMarcaNombre(value) {
  if (value == null || value === '') return '';
  return String(value).trim().toLowerCase();
}

function marcasCoinciden(a, b) {
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

/** Oferta pública (`mas_solicitados` / `buscar`) ↔ vehículo vía `cobertura_vehiculo`. */
export function ofertaPublicaCompatibleConVehiculo(oferta, vehicle) {
  if (!vehicle?.id) return true;
  const cob = oferta?.cobertura_vehiculo;
  if (!cob) return true;

  const { marcaNombre } = resolveVehiculoMarcaModelo(vehicle);
  const modeloNombreNorm = normalizeMarcaNombre(
    vehicle.modelo_nombre || vehicle.modelo?.nombre || vehicle.modelo,
  );

  if (cob.alcance === 'multimarca') return true;

  if (cob.alcance === 'marca') {
    const cobMarca = normalizeMarcaNombre(cob.marca_nombre);
    if (!cobMarca) return true;
    if (!marcasCoinciden(cobMarca, marcaNombre)) return false;
    if (cob.modelo_nombre) {
      const cobModelo = normalizeMarcaNombre(cob.modelo_nombre);
      return !modeloNombreNorm || marcasCoinciden(cobModelo, modeloNombreNorm);
    }
    return true;
  }

  if (cob.alcance === 'especialista') {
    const marcas = (cob.marcas_nombres || []).map(normalizeMarcaNombre).filter(Boolean);
    if (marcas.length === 0) return true;
    if (!marcaNombre) return false;
    return marcas.some((m) => marcasCoinciden(m, marcaNombre));
  }

  return true;
}

export function countCompatibleOfertas(group, vehicle) {
  const ofertas = group?.ofertas || [];
  if (!vehicle?.id) return ofertas.length;
  return ofertas.filter((o) => ofertaPublicaCompatibleConVehiculo(o, vehicle)).length;
}

/** Shape de grupo para `GuestServicesSection` (paridad con guest landing). */
export function mapMasSolicitadosToOffers(items) {
  return (items || [])
    .filter((item) => Array.isArray(item?.ofertas) && item.ofertas.length > 0)
    .map((item) => ({
      servicio_id: item.servicio_id,
      nombre: item.nombre,
      fotos_servicio: item.foto ? [{ imagen_url: item.foto }] : [],
      precio_desde: item.precio_desde,
      precio_hasta: item.precio_hasta,
      total_proveedores: item.total_proveedores,
      total_solicitudes: item.total_solicitudes,
      ofertas: item.ofertas || [],
    }));
}

/**
 * Filtra + ordena servicios por ofertas realmente compatibles con el vehículo.
 * Usuario logueado con vehículo activo: SOLO servicios con al menos un taller/mecánico
 * compatible (especialista de su marca o multimarca) — nunca el ranking genérico que
 * ven los invitados sin auto.
 */
export function sortPopularServicesForVehicle(rawItems, vehicle, { limit = 12 } = {}) {
  const offers = mapMasSolicitadosToOffers(rawItems);
  if (!vehicle?.id) return offers.slice(0, limit);

  const scored = offers
    .map((group, index) => ({
      group,
      index,
      compatibleCount: countCompatibleOfertas(group, vehicle),
      demand: Number(group.total_solicitudes) || offers.length - index,
    }))
    .filter((s) => s.compatibleCount > 0);

  scored.sort((a, b) => {
    if (b.compatibleCount !== a.compatibleCount) return b.compatibleCount - a.compatibleCount;
    return b.demand - a.demand;
  });

  return scored.slice(0, limit).map((s) => ({
    ...s.group,
    ofertas: s.group.ofertas.filter((o) => ofertaPublicaCompatibleConVehiculo(o, vehicle)),
  }));
}
