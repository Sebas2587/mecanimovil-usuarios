/**
 * Compatibilidad oferta de catálogo ↔ vehículo del cliente (marca/modelo).
 */

import {
  agruparServiciosCatalogoProveedor,
  expandirFilasOferta,
} from './ofertaResolucionMarca';
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

function normalizeTipoMotor(value) {
  if (value == null || value === '') return '';
  const upper = String(value).toUpperCase().trim();
  if (upper.includes('DIESEL') || upper.includes('DIÉSEL')) return 'DIESEL';
  if (upper.includes('ELECTR')) return 'ELECTRICO';
  if (upper.includes('HIBR') || upper.includes('HYBR')) return 'HIBRIDO';
  if (upper.includes('BENCINA') || upper.includes('GASOL')) return 'GASOLINA';
  if (['GASOLINA', 'DIESEL', 'ELECTRICO', 'HIBRIDO'].includes(upper)) return upper;
  return '';
}

function normalizeTipoMotorVehiculo(value) {
  return normalizeTipoMotor(value) || 'GASOLINA';
}

function getMotoresCompatiblesServicio(servicio) {
  const info = servicio?.servicio_info || servicio;
  const raw = info?.motores_info || info?.tipos_motor_compatibles || [];
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return [...new Set(raw.map(normalizeTipoMotor))];
}

function servicioCompatibleConMotorServicio(servicio, vehicle) {
  const motores = getMotoresCompatiblesServicio(servicio);
  if (motores.length === 0) return true;
  return motores.includes(normalizeTipoMotorVehiculo(vehicle?.tipo_motor));
}

/** Oferta con tipo_motor vacío aplica a todos los motores del catálogo; si tiene valor, debe coincidir. */
function ofertaCompatibleConTipoMotorOferta(servicio, vehicle) {
  const raw = servicio?.tipo_motor;
  if (raw == null || String(raw).trim() === '') return true;
  return normalizeTipoMotor(raw) === normalizeTipoMotorVehiculo(vehicle?.tipo_motor);
}

/**
 * true si la oferta aplica al vehículo (marca de la oferta o modelos compatibles).
 * Sin vehículo: no filtra (muestra todo el catálogo).
 */
export function servicioOfertaCompatibleConVehiculo(servicio, vehicle) {
  if (!vehicle?.id) return true;
  if (!servicio) return false;
  if (!servicioCompatibleConMotorServicio(servicio, vehicle)) return false;
  if (!ofertaCompatibleConTipoMotorOferta(servicio, vehicle)) return false;

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
    if (marcaId == null || Number(ofertaMarcaId) !== Number(marcaId)) {
      return false;
    }
  } else if (ofertaMarcaNombre) {
    if (!marcasCoinciden(ofertaMarcaNombre, marcaNombre)) {
      return false;
    }
  } else {
    const marcas = Array.isArray(servicio.marcas_info) ? servicio.marcas_info : [];
    if (marcas.length > 0) {
      if (marcaId != null && marcas.some((m) => Number(m.id) === Number(marcaId))) {
        // marca ok
      } else if (marcaNombre) {
        if (!marcas.some((m) => marcasCoinciden(normalizeMarcaNombre(m.nombre), marcaNombre))) {
          return false;
        }
      } else {
        return false;
      }
    } else {
      const modelos = Array.isArray(servicio.modelos_info) ? servicio.modelos_info : [];
      if (modelos.length > 0) {
        if (modeloId != null && modelos.some((m) => Number(m.id) === Number(modeloId))) {
          // modelo ok via catalog
        } else if (marcaId != null && modelos.some((m) => Number(m.marca_id) === Number(marcaId))) {
          // marca ok via catalog modelos
        } else if (marcaNombre) {
          if (!modelos.some((m) => marcasCoinciden(normalizeMarcaNombre(m.marca_nombre), marcaNombre))) {
            return false;
          }
        } else {
          return false;
        }
      }
    }
  }

  const ofertaModeloId =
    servicio.modelo_vehiculo_id
    ?? servicio.modelo_vehiculo_seleccionado
    ?? servicio.modelo_vehiculo_info?.id
    ?? null;

  if (ofertaModeloId != null) {
    return modeloId != null && Number(ofertaModeloId) === Number(modeloId);
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
 * Servicios visibles en perfil: ofertas activas, agrupadas por catálogo+tipo.
 * Precios solo para vehículos registrados del usuario compatibles con cada oferta.
 */
export function filtrarServiciosCatalogoPerfilProveedor(servicios, { provider, vehicle, vehicles } = {}) {
  const userVehicles = Array.isArray(vehicles) && vehicles.length > 0
    ? vehicles.filter((v) => v?.id && v.is_active !== false)
    : vehicle?.id
      ? [vehicle]
      : [];

  let list = expandirFilasOferta(servicios).filter(esOfertaServicioActiva);

  if (!isProviderMultimarca(provider)) {
    list = list.filter((s) => servicioOfertaPerteneceACatalogoProveedor(s, provider));
  }

  if (userVehicles.length > 0) {
    list = list.filter((s) =>
      userVehicles.some((v) => servicioOfertaCompatibleConVehiculo(s, v)),
    );
  } else if (vehicle?.id) {
    list = list.filter((s) => servicioOfertaCompatibleConVehiculo(s, vehicle));
  }

  return agruparServiciosCatalogoProveedor(list, { vehicle, vehicles: userVehicles });
}
