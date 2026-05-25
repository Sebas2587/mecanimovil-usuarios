import { resolveDistanciaKmCandidato } from '../services/agendamientoAsistidoService';
import { PROVIDER_RECOMMENDATION_MAX_KM } from './exploreProviderUtils';

/** Pesos del análisis en comparador de catálogo (suman 100). */
export const CRITERIOS_CATALOGO = {
  MATCH_IA: { peso: 30, nombre: 'Compatibilidad', key: 'MATCH_IA' },
  CERCANIA: { peso: 30, nombre: 'Cercanía', key: 'CERCANIA' },
  PRECIO: { peso: 20, nombre: 'Precio', key: 'PRECIO' },
  RATING: { peso: 12, nombre: 'Calificación', key: 'RATING' },
  COBERTURA: { peso: 8, nombre: 'Cobertura', key: 'COBERTURA' },
};

export function getCandidatoCatalogoKey(oferta) {
  if (!oferta) return '';
  return String(oferta.oferta_servicio_id || oferta.id || '');
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
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

function scoreMatchIa(scoreMatch) {
  const s = Number(scoreMatch);
  if (!Number.isFinite(s) || s <= 0) return 50;
  return Math.round(clamp01(s) * 100);
}

function scoreRating(rating) {
  const r = Number(rating);
  if (!Number.isFinite(r) || r <= 0) return 40;
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

/**
 * % mostrado en la card: distingue proveedores por distancia + IA + rating.
 */
export function computeMatchDisplayPct(candidato, userCoords = null, grupo = []) {
  const distKm = resolveDistanciaKmCandidato(candidato, userCoords);
  const porCriterio = buildPuntuacionPorCriterio(candidato, grupo, userCoords);
  const total = Math.round(
    Object.entries(CRITERIOS_CATALOGO).reduce((sum, [, cfg]) => {
      const key = cfg.key;
      const score = porCriterio[key] ?? 50;
      return sum + (score / 100) * cfg.peso;
    }, 0),
  );
  if (total > 0) return Math.max(1, Math.min(99, total));

  const distScore = scoreCercaniaKm(distKm) / 100;
  const ia = clamp01(candidato.score_match) * 0.45;
  const dist = distScore * 0.4;
  const rating = (scoreRating(candidato.proveedor?.rating ?? candidato.rating_proveedor) / 100) * 0.15;
  return Math.max(1, Math.min(99, Math.round((ia + dist + rating) * 100)));
}

export function buildPuntuacionPorCriterio(candidato, grupo = [], userCoords = null, requiereRepuestos = true) {
  const distKm = resolveDistanciaKmCandidato(candidato, userCoords);
  const precios = grupo.map((c) => precioCandidato(c, requiereRepuestos));
  return {
    MATCH_IA: scoreMatchIa(candidato.score_match),
    CERCANIA: scoreCercaniaKm(distKm),
    PRECIO: scorePrecioRelativo(precioCandidato(candidato, requiereRepuestos), precios),
    RATING: scoreRating(candidato.proveedor?.rating ?? candidato.rating_proveedor),
    COBERTURA: scoreCobertura(candidato),
  };
}

export function computePuntuacionTotalCatalogo(candidato, grupo = [], userCoords = null, requiereRepuestos = true) {
  const porCriterio = buildPuntuacionPorCriterio(candidato, grupo, userCoords, requiereRepuestos);
  const total = Object.entries(CRITERIOS_CATALOGO).reduce((sum, [, cfg]) => {
    const score = porCriterio[cfg.key] ?? 50;
    return sum + (score / 100) * cfg.peso;
  }, 0);
  return {
    total: Math.round(total * 10) / 10,
    porCriterio,
    distancia_km: resolveDistanciaKmCandidato(candidato, userCoords),
    matchDisplayPct: Math.max(1, Math.min(99, Math.round(total))),
  };
}

export function rankCandidatosCatalogo(candidatos, userCoords = null, requiereRepuestos = true) {
  const list = (candidatos || []).filter(Boolean);
  return list
    .map((c) => ({
      candidato: c,
      ...computePuntuacionTotalCatalogo(c, list, userCoords, requiereRepuestos),
    }))
    .sort((a, b) => b.total - a.total);
}
