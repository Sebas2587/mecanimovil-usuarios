/**
 * Métricas del modal: factores ML completos + extras sin duplicar CRITERIOS.
 */
import {
  MATCH_FACTOR_GROUPS,
  resolveMatchFactores,
} from './catalogoMatchFactores';
import { CRITERIOS_CATALOGO, RATING_NEUTRO_SIN_RESENAS } from './catalogoComparadorScoring';

function clamp01(n) {
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

function scoreTo01(score) {
  if (score == null || !Number.isFinite(Number(score))) return null;
  return clamp01(Number(score) / 100);
}

/** CRITERIOS que no se muestran si ya hay factores ML equivalentes. */
const CRITERIO_SUPRIMIDO_SI_ML = {
  MATCH_IA: ['cobertura_proveedor', 'motor', 'marca_oferta'],
  CERCANIA: ['proximidad', 'dentro_radio', 'zona_mecanico'],
  RATING: ['rating'],
};

function criterioSuprimidoPorMl(criterioKey, mlKeys) {
  const deps = CRITERIO_SUPRIMIDO_SI_ML[criterioKey];
  if (!deps?.length) return false;
  return deps.some((k) => mlKeys.has(k));
}

/**
 * @returns {{ id: string, title: string | null, metricas: { key: string, label: string, value: number, displayValue?: string }[] }[]}
 */
export function resolveMetricasComparadorModalSecciones(candidato, porCriterio = {}) {
  const filasMl = resolveMatchFactores(candidato);
  const mlKeys = new Set(filasMl.map((f) => f.key));
  const byKey = Object.fromEntries(filasMl.map((f) => [f.key, f]));
  const secciones = [];
  const sinResenas = Boolean(porCriterio.rating_sin_resenas);

  if (filasMl.length > 0) {
    for (const grupo of MATCH_FACTOR_GROUPS) {
      const metricas = grupo.keys
        .map((key) => byKey[key])
        .filter(Boolean)
        .map((f) => ({
          key: f.key,
          label: f.label,
          value: f.value,
          sinDato: f.key === 'rating' && sinResenas,
          displayValue:
            f.key === 'rating' && sinResenas ? 'N/D' : undefined,
        }));
      if (metricas.length > 0) {
        secciones.push({
          id: grupo.id,
          title: grupo.title,
          metricas,
        });
      }
    }
  }

  const extras = [];

  if (porCriterio.PRECIO != null) {
    const v = scoreTo01(porCriterio.PRECIO);
    if (v != null) {
      extras.push({
        key: 'precio_grupo',
        label: 'Precio en comparación',
        value: v,
      });
    }
  }

  const pedidos = candidato?.servicios_pedidos;
  const cubiertos = candidato?.servicios_cubiertos;
  if (pedidos != null && pedidos > 1) {
    const cob = scoreTo01(porCriterio.COBERTURA)
      ?? (cubiertos != null && pedidos > 0 ? clamp01(cubiertos / pedidos) : null);
    if (cob != null) {
      extras.push({
        key: 'servicios_cubiertos',
        label: 'Servicios del pedido',
        value: cob,
        displayValue: cubiertos != null ? `${cubiertos}/${pedidos}` : undefined,
      });
    }
  }

  if (extras.length > 0) {
    secciones.push({
      id: 'comparacion',
      title: 'Comparación de ofertas',
      metricas: extras,
    });
  }

  if (filasMl.length === 0 && secciones.length === 0) {
    const fallback = [];
    for (const cfg of Object.values(CRITERIOS_CATALOGO)) {
      const score = porCriterio[cfg.key];
      if (score == null) continue;
      fallback.push({
        key: cfg.key,
        label: cfg.nombre,
        value: scoreTo01(score),
        sinDato: cfg.key === 'RATING' && sinResenas,
        displayValue:
          cfg.key === 'RATING' && sinResenas ? 'N/D' : undefined,
      });
    }
    if (fallback.length > 0) {
      secciones.push({ id: 'fallback', title: null, metricas: fallback });
    }
  } else if (filasMl.length > 0) {
    for (const cfg of Object.values(CRITERIOS_CATALOGO)) {
      if (cfg.key === 'PRECIO' || cfg.key === 'COBERTURA') continue;
      if (criterioSuprimidoPorMl(cfg.key, mlKeys)) continue;
      const v = scoreTo01(porCriterio[cfg.key]);
      if (v == null) continue;
      const ultima = secciones[secciones.length - 1];
      const row = {
        key: `criterio_${cfg.key}`,
        label: cfg.nombre,
        value: v,
        sinDato: cfg.key === 'RATING' && sinResenas,
        displayValue:
          cfg.key === 'RATING' && sinResenas ? 'N/D' : undefined,
      };
      if (ultima?.id === 'comparacion') {
        ultima.metricas.push(row);
      } else {
        secciones.push({
          id: 'complemento',
          title: 'Otros criterios',
          metricas: [row],
        });
      }
    }
  }

  return secciones;
}

/** Lista plana (compat tests / uso simple). */
export function resolveMetricasComparadorModal(candidato, porCriterio = {}) {
  return resolveMetricasComparadorModalSecciones(candidato, porCriterio).flatMap(
    (s) => s.metricas,
  );
}

export function formatMetricaPct(value) {
  return `${Math.round(Number(value) * 100)}%`;
}

export { RATING_NEUTRO_SIN_RESENAS };
