/**
 * Compatibilidad oferta de catálogo ↔ vehículo del cliente (marca/modelo).
 */

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
