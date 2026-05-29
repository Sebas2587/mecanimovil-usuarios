/**
 * Compatibilidad oferta de catálogo ↔ vehículo del cliente (marca/modelo).
 */

import { isProviderMultimarca } from './providerUtils';

function normalizeMarcaNombre(value) {
  if (value == null || value === '') return '';
  return String(value).trim().toLowerCase();
}

export function resolveVehiculoMarcaModelo(vehicle) {
  if (!vehicle) {
    return { marcaId: null, marcaNombre: '', modeloId: null };
  }
  const marcaRaw = vehicle.marca?.id ?? vehicle.marca_id ?? vehicle.marca;
  const marcaId =
    marcaRaw != null && marcaRaw !== '' && !Number.isNaN(Number(marcaRaw))
      ? Number(marcaRaw)
      : null;
  const marcaNombre = normalizeMarcaNombre(
    vehicle.marca_nombre || vehicle.marca?.nombre || vehicle.marca,
  );
  const modeloRaw = vehicle.modelo?.id ?? vehicle.modelo_id ?? vehicle.modelo;
  const modeloId =
    modeloRaw != null && modeloRaw !== '' && !Number.isNaN(Number(modeloRaw))
      ? Number(modeloRaw)
      : null;
  return { marcaId, marcaNombre, modeloId };
}

function marcasCoinciden(nombreA, nombreB) {
  if (!nombreA || !nombreB) return false;
  return nombreA.includes(nombreB) || nombreB.includes(nombreA);
}

/**
 * true si la oferta aplica al vehículo (marca de la oferta o modelos compatibles).
 * Sin vehículo: no filtra (muestra todo el catálogo).
 */
export function servicioOfertaCompatibleConVehiculo(servicio, vehicle) {
  if (!vehicle?.id) return true;
  if (!servicio) return false;

  const { marcaId, marcaNombre, modeloId } = resolveVehiculoMarcaModelo(vehicle);

  const ofertaMarcaId =
    servicio.marca_vehiculo_id
    ?? servicio.marca_vehiculo_seleccionada
    ?? servicio.marca_vehiculo_info?.id
    ?? null;
  const ofertaMarcaNombre = normalizeMarcaNombre(
    servicio.marca_vehiculo_nombre
    || servicio.marca_vehiculo_info?.nombre,
  );

  if (ofertaMarcaId != null) {
    return marcaId != null && Number(ofertaMarcaId) === Number(marcaId);
  }
  if (ofertaMarcaNombre) {
    return marcasCoinciden(ofertaMarcaNombre, marcaNombre);
  }

  const marcas = Array.isArray(servicio.marcas_info) ? servicio.marcas_info : [];
  if (marcas.length > 0) {
    if (marcaId != null && marcas.some((m) => Number(m.id) === Number(marcaId))) {
      return true;
    }
    if (marcaNombre) {
      return marcas.some((m) => marcasCoinciden(normalizeMarcaNombre(m.nombre), marcaNombre));
    }
    return false;
  }

  const modelos = Array.isArray(servicio.modelos_info) ? servicio.modelos_info : [];
  if (modelos.length > 0) {
    if (modeloId != null && modelos.some((m) => Number(m.id) === Number(modeloId))) {
      return true;
    }
    if (marcaId != null && modelos.some((m) => Number(m.marca_id) === Number(marcaId))) {
      return true;
    }
    if (marcaNombre) {
      return modelos.some((m) => marcasCoinciden(normalizeMarcaNombre(m.marca_nombre), marcaNombre));
    }
    return false;
  }

  return true;
}

export function filtrarServiciosPorVehiculo(servicios, vehicle) {
  const list = Array.isArray(servicios) ? servicios : [];
  if (!vehicle?.id) return list;
  return list.filter((s) => servicioOfertaCompatibleConVehiculo(s, vehicle));
}

/** Oferta publicada y disponible en catálogo del proveedor. */
export function esOfertaServicioActiva(servicio) {
  if (!servicio) return false;
  const disponible = servicio.disponible;
  if (disponible === false || disponible === 0 || disponible === '0' || disponible === 'false') {
    return false;
  }
  const activo = servicio.activo;
  if (activo === false || activo === 0 || activo === '0' || activo === 'false') {
    return false;
  }
  return true;
}

/** Especialista: la oferta debe alinear con las marcas del proveedor (si la oferta declara marca). */
export function servicioOfertaPerteneceACatalogoProveedor(servicio, provider) {
  if (!servicio || isProviderMultimarca(provider)) return true;

  const marcasNombres = (provider?.marcas_atendidas_nombres || [])
    .map((m) => normalizeMarcaNombre(m))
    .filter(Boolean);
  if (marcasNombres.length === 0) return true;

  const ofertaMarcaId =
    servicio.marca_vehiculo_id
    ?? servicio.marca_vehiculo_seleccionada
    ?? servicio.marca_vehiculo_info?.id
    ?? null;
  const ofertaMarcaNombre = normalizeMarcaNombre(
    servicio.marca_vehiculo_nombre || servicio.marca_vehiculo_info?.nombre,
  );

  if (ofertaMarcaId != null) {
    const ids = provider?.marcas_atendidas || provider?.marcas_atendidas_ids || [];
    if (Array.isArray(ids) && ids.length > 0) {
      return ids.some((m) => Number(m?.id ?? m) === Number(ofertaMarcaId));
    }
    if (ofertaMarcaNombre) {
      return marcasNombres.some((m) => marcasCoinciden(m, ofertaMarcaNombre));
    }
    return true;
  }

  if (ofertaMarcaNombre) {
    return marcasNombres.some((m) => marcasCoinciden(m, ofertaMarcaNombre));
  }

  const marcasServicio = Array.isArray(servicio.marcas_info) ? servicio.marcas_info : [];
  if (marcasServicio.length > 0) {
    return marcasServicio.some((mc) => {
      const mn = normalizeMarcaNombre(mc.nombre);
      return mn && marcasNombres.some((m) => marcasCoinciden(m, mn));
    });
  }

  const modelos = Array.isArray(servicio.modelos_info) ? servicio.modelos_info : [];
  if (modelos.length > 0) {
    return modelos.some((mod) => {
      const mn = normalizeMarcaNombre(mod.marca_nombre);
      return mn && marcasNombres.some((m) => marcasCoinciden(m, mn));
    });
  }

  return true;
}

/**
 * Servicios visibles en perfil: solo ofertas activas/disponibles.
 * Multimarca → catálogo completo (agendar cualquier marca).
 * Especialista → marcas del proveedor + compatibilidad con vehículo si hay uno.
 */
export function filtrarServiciosCatalogoPerfilProveedor(servicios, { provider, vehicle } = {}) {
  const list = (Array.isArray(servicios) ? servicios : []).filter(esOfertaServicioActiva);

  if (isProviderMultimarca(provider)) {
    return list;
  }

  let filtered = list.filter((s) => servicioOfertaPerteneceACatalogoProveedor(s, provider));
  if (vehicle?.id) {
    filtered = filtered.filter((s) => servicioOfertaCompatibleConVehiculo(s, vehicle));
  }
  return filtered;
}
