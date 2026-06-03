/**
 * Factores ML del backend (motor_match_scoring) para UI del comparador.
 */

export const MATCH_FACTOR_LABELS = {
  proximidad: 'Cercanía',
  rating: 'Calificación',
  marca_oferta: 'Tarifa por marca',
  cobertura_proveedor: 'Cobertura de marca',
  motor: 'Tipo de motor',
  repuestos: 'Repuestos en catálogo',
  historial: 'Tu historial',
  zona_mecanico: 'Zona de servicio',
  catalogo_completo: 'Precio configurado',
  dentro_radio: 'Dentro de tu zona',
};

export const MATCH_FACTOR_ORDER = [
  'cobertura_proveedor',
  'motor',
  'marca_oferta',
  'proximidad',
  'repuestos',
  'rating',
  'historial',
  'zona_mecanico',
  'dentro_radio',
  'catalogo_completo',
];

/** Agrupación visual en modal (sin duplicar CRITERIOS del comparador). */
export const MATCH_FACTOR_GROUPS = [
  {
    id: 'compatibilidad',
    title: 'Compatibilidad con tu vehículo',
    keys: ['cobertura_proveedor', 'motor', 'marca_oferta'],
  },
  {
    id: 'ubicacion',
    title: 'Ubicación y zona',
    keys: ['proximidad', 'dentro_radio', 'zona_mecanico'],
  },
  {
    id: 'servicio',
    title: 'Servicio y precio',
    keys: ['repuestos', 'catalogo_completo'],
  },
  {
    id: 'confianza',
    title: 'Confianza',
    keys: ['rating', 'historial'],
  },
];

export function resolveMatchFactores(candidatoOrOferta) {
  const raw = candidatoOrOferta?.match_factores;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return [];
  }
  return MATCH_FACTOR_ORDER
    .filter((key) => raw[key] != null && raw[key] !== '')
    .map((key) => {
      const value = Number(raw[key]);
      return {
        key,
        label: MATCH_FACTOR_LABELS[key] || key,
        value: Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null,
      };
    })
    .filter((row) => row.value != null);
}

export function hasMatchFactores(candidatoOrOferta) {
  return resolveMatchFactores(candidatoOrOferta).length > 0;
}

export function formatMatchFactorPct(value) {
  return `${Math.round(Number(value) * 100)}%`;
}

/** Pesos alineados con motor_match_scoring.PESOS_COINCIDENCIA (backend). */
export const MATCH_FACTOR_PESOS = {
  proximidad: 0.12,
  rating: 0.08,
  marca_oferta: 0.10,
  cobertura_proveedor: 0.18,
  motor: 0.18,
  repuestos: 0.12,
  historial: 0.08,
  zona_mecanico: 0.05,
  catalogo_completo: 0.04,
  dentro_radio: 0.05,
};

const BONUS_COMPAT_EXACTA = 0.06;

/** Score ponderado 0–100 usando los mismos pesos que el backend. */
export function scoreMatchFactoresPonderado(matchFactores) {
  if (!matchFactores || typeof matchFactores !== 'object') return null;
  const entries = Object.entries(MATCH_FACTOR_PESOS).filter(
    ([key]) => matchFactores[key] != null && matchFactores[key] !== '',
  );
  if (!entries.length) return null;

  let weighted = 0;
  let pesoSum = 0;
  for (const [key, peso] of entries) {
    const value = Number(matchFactores[key]);
    if (!Number.isFinite(value)) continue;
    const clamped = Math.max(0, Math.min(1, value));
    weighted += clamped * peso;
    pesoSum += peso;
  }
  if (pesoSum <= 0) return null;

  let score = weighted / pesoSum;
  const motor = Number(matchFactores.motor);
  const cobertura = Number(matchFactores.cobertura_proveedor);
  if (motor >= 0.99 && cobertura >= 0.99) {
    score = Math.min(0.99, score + BONUS_COMPAT_EXACTA);
  }
  return Math.round(score * 100);
}

/** Promedio simple (legacy); preferir scoreMatchFactoresPonderado. */
export function scorePromedioMatchFactores(matchFactores) {
  return scoreMatchFactoresPonderado(matchFactores);
}
