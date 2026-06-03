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

/** Promedio de features ML (0–100) para complementar score_match del backend. */
export function scorePromedioMatchFactores(matchFactores) {
  if (!matchFactores || typeof matchFactores !== 'object') return null;
  const vals = Object.values(matchFactores)
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
}
