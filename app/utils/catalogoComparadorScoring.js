import { resolveDistanciaKmCandidato } from '../services/agendamientoAsistidoService';
import { PROVIDER_RECOMMENDATION_MAX_KM } from './exploreProviderUtils';
import { isCandidatoCatalogoMultimarca } from './catalogoComparadorCobertura';
import { ofreceRepuestosEnCatalogo, solicitudRequiereRepuestos } from './catalogoComparadorRepuestos';
import { scoreAjusteMotor, normalizeTipoMotorVehiculo } from './catalogoComparadorMotor';
import { scorePromedioMatchFactores } from './catalogoMatchFactores';

/** Pesos del análisis en comparador de catálogo (suman 100). */
export const CRITERIOS_CATALOGO = {
  MATCH_IA: { peso: 48, nombre: 'Compatibilidad', key: 'MATCH_IA' },
  CERCANIA: { peso: 22, nombre: 'Cercanía', key: 'CERCANIA' },
  PRECIO: { peso: 15, nombre: 'Precio', key: 'PRECIO' },
  RATING: { peso: 10, nombre: 'Calificación', key: 'RATING' },
  COBERTURA: { peso: 5, nombre: 'Cobertura', key: 'COBERTURA' },
};

/** Puntuación neutra cuando el proveedor aún no tiene reseñas (no penaliza ni premia). */
export const RATING_NEUTRO_SIN_RESENAS = 50;

export function getCandidatoCatalogoKey(oferta) {
  if (!oferta) return '';
  return String(oferta.oferta_servicio_id || oferta.id || '');
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeScoringContext(ctx) {
  if (typeof ctx === 'boolean') {
    return {
      requiereRepuestos: ctx !== false,
      marcaVehiculoNombre: null,
      tipoProveedorPreferido: null,
      tipoMotorVehiculo: null,
    };
  }
  const raw = ctx && typeof ctx === 'object' ? ctx : {};
  const pref = raw.tipoProveedorPreferido ?? raw.tipo_proveedor_preferido ?? null;
  const tipo =
    pref === 'mecanico' || pref === 'taller' ? pref : null;
  const motorRaw =
    raw.tipoMotorVehiculo
    ?? raw.tipo_motor_vehiculo
    ?? raw.vehiculo?.tipo_motor
    ?? null;
  return {
    requiereRepuestos: raw.requiereRepuestos !== false,
    marcaVehiculoNombre: raw.marcaVehiculoNombre?.trim() || null,
    tipoProveedorPreferido: tipo,
    tipoMotorVehiculo: normalizeTipoMotorVehiculo(motorRaw) || null,
  };
}

export function resolveRatingProveedor(candidato) {
  const r = Number(
    candidato?.proveedor?.rating
    ?? candidato?.rating_proveedor
    ?? candidato?.proveedor?.calificacion_promedio
    ?? candidato?.calificacion_promedio,
  );
  return Number.isFinite(r) && r > 0 ? r : null;
}

export function candidatoTieneResenas(candidato) {
  return resolveRatingProveedor(candidato) != null;
}

function scoreCercaniaKm(distKm) {
  if (distKm == null) return 45;
  if (distKm <= 0.1) return 100;
  const radar = PROVIDER_RECOMMENDATION_MAX_KM;
  if (distKm <= 1) return 95;
  if (distKm <= 2) return 88;
  if (distKm <= 3) return 78;
  if (distKm <= radar) return Math.max(35, Math.round(100 - (distKm / radar) * 55));
  return Math.max(15, Math.round(45 - (distKm - radar) * 4));
}

function scoreMatchIaBackend(scoreMatch, matchFactores = null) {
  const fromFactores = scorePromedioMatchFactores(matchFactores);
  const s = Number(scoreMatch);
  const fromBackend = Number.isFinite(s) && s > 0 ? Math.round(clamp01(s) * 100) : null;
  if (fromFactores != null && fromBackend != null) {
    return Math.round(fromBackend * 0.55 + fromFactores * 0.45);
  }
  if (fromBackend != null) return fromBackend;
  if (fromFactores != null) return fromFactores;
  return 50;
}

function resolveTipoProveedorCandidato(candidato) {
  const t = candidato?.tipo_proveedor || candidato?.proveedor?.tipo;
  if (t === 'mecanico' || t === 'taller') return t;
  if (candidato?.a_domicilio) return 'mecanico';
  return 'taller';
}

/**
 * A domicilio vs taller: neutro si el usuario no preseleccionó tipo (comparación abierta).
 */
function scoreModalidadProveedor(candidato, tipoProveedorPreferido) {
  const tipo = resolveTipoProveedorCandidato(candidato);
  if (!tipoProveedorPreferido) {
    return 74;
  }
  return tipo === tipoProveedorPreferido ? 100 : 56;
}

/** Especialista en la marca vs multimarca (complementa el match del backend). */
function scoreAjusteMarca(candidato, marcaVehiculoNombre) {
  if (isCandidatoCatalogoMultimarca(candidato)) {
    return marcaVehiculoNombre ? 88 : 84;
  }
  return marcaVehiculoNombre ? 98 : 92;
}

function scoreAjusteRepuestos(candidato, requiereRepuestos) {
  if (!solicitudRequiereRepuestos(requiereRepuestos)) {
    return 78;
  }
  if (ofreceRepuestosEnCatalogo(candidato)) return 100;
  if (
    candidato?.coincidencia_repuestos === 'solo_mano_obra_alternativa'
    || candidato?.ofrece_solo_mano_obra === true
  ) {
    return 54;
  }
  return 62;
}

/**
 * Compatibilidad: match IA + marca + motor + modalidad (taller/domicilio) + repuestos si aplica.
 */
function scoreCompatibilidadCatalogo(candidato, scoringContext) {
  const ia = scoreMatchIaBackend(candidato?.score_match, candidato?.match_factores);
  const marca = scoreAjusteMarca(candidato, scoringContext.marcaVehiculoNombre);
  const motor = scoreAjusteMotor(candidato, scoringContext.tipoMotorVehiculo);
  const modalidad = scoreModalidadProveedor(
    candidato,
    scoringContext.tipoProveedorPreferido,
  );
  const repuestos = scoreAjusteRepuestos(candidato, scoringContext.requiereRepuestos);
  const usaMotor = Boolean(scoringContext.tipoMotorVehiculo);

  if (scoringContext.requiereRepuestos) {
    if (usaMotor) {
      return Math.round(
        ia * 0.28 + marca * 0.22 + motor * 0.18 + modalidad * 0.16 + repuestos * 0.16,
      );
    }
    return Math.round(ia * 0.34 + marca * 0.26 + modalidad * 0.22 + repuestos * 0.18);
  }
  if (usaMotor) {
    return Math.round(ia * 0.32 + marca * 0.26 + motor * 0.22 + modalidad * 0.2);
  }
  return Math.round(ia * 0.4 + marca * 0.32 + modalidad * 0.28);
}

function scoreRating(rating) {
  const r = Number(rating);
  if (!Number.isFinite(r) || r <= 0) {
    return RATING_NEUTRO_SIN_RESENAS;
  }
  if (r >= 4.8) return 100;
  if (r >= 4.5) return 90;
  if (r >= 4.0) return 75;
  if (r >= 3.5) return 58;
  return Math.max(25, Math.round((r / 5) * 100));
}

function scoreCobertura(candidato) {
  const pedidos = candidato.servicios_pedidos;
  const cubiertos = candidato.servicios_cubiertos;
  if (pedidos != null && cubiertos != null && pedidos > 0) {
    return Math.round(clamp01(cubiertos / pedidos) * 100);
  }
  const pct = candidato.cobertura_pct;
  if (pct != null && Number.isFinite(Number(pct))) {
    return Math.round(clamp01(Number(pct)) * 100);
  }
  if (candidato.es_coincidencia_exacta || candidato.es_recomendado) return 100;
  return 65;
}

function scorePrecioRelativo(precio, preciosGrupo) {
  const p = Number(precio) || 0;
  const valid = (preciosGrupo || []).filter((x) => x > 0);
  if (p <= 0 || valid.length === 0) return 60;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (max === min) return 75;
  return Math.max(20, Math.round(100 - ((p - min) / (max - min)) * 80));
}

function precioCandidato(candidato, requiereRepuestos = true) {
  return Number(
    candidato.precio_total
    ?? candidato.precio_total_ofrecido
    ?? (requiereRepuestos ? candidato.precio_con_repuestos : candidato.precio_sin_repuestos)
    ?? 0,
  );
}

function computeTotalFromCriterios(porCriterio) {
  return Object.entries(CRITERIOS_CATALOGO).reduce((sum, [, cfg]) => {
    const score = porCriterio[cfg.key] ?? 50;
    return sum + (score / 100) * cfg.peso;
  }, 0);
}

/**
 * % mostrado en la card: distancia + compatibilidad compuesta + rating + precio.
 */
export function computeMatchDisplayPct(
  candidato,
  userCoords = null,
  grupo = [],
  scoringContext = null,
) {
  const ctx = normalizeScoringContext(
    scoringContext ?? { requiereRepuestos: true },
  );
  const porCriterio = buildPuntuacionPorCriterio(candidato, grupo, userCoords, ctx);
  const total = computeTotalFromCriterios(porCriterio);
  if (total > 0) return Math.max(1, Math.min(99, Math.round(total)));

  const distKm = resolveDistanciaKmCandidato(candidato, userCoords);
  const distScore = scoreCercaniaKm(distKm) / 100;
  const compat = scoreCompatibilidadCatalogo(candidato, ctx) / 100;
  const ratingVal = resolveRatingProveedor(candidato);
  const rating = (scoreRating(ratingVal) / 100) * 0.15;
  return Math.max(1, Math.min(99, Math.round((compat * 0.45 + distScore * 0.4 + rating) * 100)));
}

export function buildPuntuacionPorCriterio(
  candidato,
  grupo = [],
  userCoords = null,
  scoringContext = null,
) {
  const ctx = normalizeScoringContext(
    scoringContext ?? { requiereRepuestos: true },
  );
  const distKm = resolveDistanciaKmCandidato(candidato, userCoords);
  const precios = grupo.map((c) => precioCandidato(c, ctx.requiereRepuestos));
  const ratingVal = resolveRatingProveedor(candidato);

  return {
    MATCH_IA: scoreCompatibilidadCatalogo(candidato, ctx),
    CERCANIA: scoreCercaniaKm(distKm),
    PRECIO: scorePrecioRelativo(precioCandidato(candidato, ctx.requiereRepuestos), precios),
    RATING: scoreRating(ratingVal),
    COBERTURA: scoreCobertura(candidato),
    rating_sin_resenas: !candidatoTieneResenas(candidato),
  };
}

export function computePuntuacionTotalCatalogo(
  candidato,
  grupo = [],
  userCoords = null,
  scoringContext = null,
) {
  const ctx = normalizeScoringContext(
    scoringContext ?? { requiereRepuestos: true },
  );
  const porCriterio = buildPuntuacionPorCriterio(candidato, grupo, userCoords, ctx);
  const total = computeTotalFromCriterios(porCriterio);
  return {
    total: Math.round(total * 10) / 10,
    porCriterio,
    distancia_km: resolveDistanciaKmCandidato(candidato, userCoords),
    matchDisplayPct: Math.max(1, Math.min(99, Math.round(total))),
    scoringContext: ctx,
  };
}

export function rankCandidatosCatalogo(
  candidatos,
  userCoords = null,
  scoringContext = null,
) {
  const ctx = normalizeScoringContext(
    scoringContext ?? { requiereRepuestos: true },
  );
  const list = (candidatos || []).filter(Boolean);
  return list
    .map((c) => ({
      candidato: c,
      ...computePuntuacionTotalCatalogo(c, list, userCoords, ctx),
    }))
    .sort((a, b) => b.total - a.total);
}

export function buildScoringContextFromForm({
  requiereRepuestos,
  marcaVehiculoNombre,
  tipoProveedorPreferido,
  tipoMotorVehiculo,
  formPayload,
} = {}) {
  const fp = formPayload || {};
  const pref =
    tipoProveedorPreferido
    ?? fp.tipoProveedor
    ?? fp.tipo_proveedor_preseleccionado
    ?? fp.tipoProveedorPreseleccionado;
  const motorRaw =
    tipoMotorVehiculo
    ?? fp.vehiculo?.tipo_motor
    ?? fp.tipo_motor
    ?? null;
  return {
    requiereRepuestos: requiereRepuestos ?? fp.requiere_repuestos !== false,
    marcaVehiculoNombre: marcaVehiculoNombre ?? fp.vehiculo?.marca?.nombre ?? null,
    tipoProveedorPreferido:
      pref === 'mecanico' || pref === 'taller' ? pref : null,
    tipoMotorVehiculo: motorRaw,
  };
}
