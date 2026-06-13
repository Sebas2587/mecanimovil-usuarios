/**
 * Utilidades de formato y color para métricas de salud vehicular.
 *
 * Umbrales alineados con el HealthEngine del backend (health_engine.py):
 *   OPTIMO  ≥ 70 %   → verde
 *   ATENCION ≥ 40 %  → amarillo/naranja
 *   URGENTE  ≥ 10 %  → naranja oscuro
 *   CRITICO  < 10 %  → rojo
 *
 * Importar desde aquí para garantizar consistencia entre todas las pantallas.
 */

// Tokens del design system (usado como fallback hex cuando COLORS no está disponible
// en contextos donde no se puede importar el módulo de tokens)
const _SUCCESS  = '#049356';  // COLORS.success[600]
const _WARNING  = '#C98F00';  // COLORS.warning.dark
const _ORANGE   = '#F97316';  // naranja intermedio
const _ERROR    = '#D9332A';  // COLORS.error.dark
const _MUTED    = '#9E9E9E';  // sin datos

/**
 * Retorna el color hex correspondiente al porcentaje de salud.
 * Compatible con pantallas que no pueden importar COLORS directamente.
 *
 * @param {number|null|undefined} score  Porcentaje 0-100
 * @returns {string}  Color hex
 */
export function getHealthColor(score) {
  const s = normalizePct(score);
  if (s == null || !Number.isFinite(s)) return _MUTED;
  if (s >= 70) return _SUCCESS;
  if (s >= 40) return _WARNING;
  if (s >= 10) return _ORANGE;
  return _ERROR;
}

/**
 * Retorna el token de color del design system (COLORS.*) para el porcentaje de salud.
 * Usar cuando el componente ya importa COLORS.
 *
 * @param {object} COLORS  Objeto COLORS del design system
 * @param {number|null|undefined} score
 * @returns {string}  Color del design system
 */
export function getHealthColorToken(COLORS, score) {
  const s = normalizePct(score);
  if (s == null || !Number.isFinite(s)) return COLORS?.neutral?.gray?.[400] || _MUTED;
  if (s >= 70) return COLORS?.success?.[600]  || _SUCCESS;
  if (s >= 40) return COLORS?.warning?.dark   || _WARNING;
  if (s >= 10) return COLORS?.warning?.main   || _ORANGE;
  return COLORS?.error?.dark || _ERROR;
}

/**
 * Retorna el nivel de alerta (string) equivalente al del backend.
 *
 * @param {number|null|undefined} score
 * @returns {'OPTIMO'|'ATENCION'|'URGENTE'|'CRITICO'|'SIN_DATOS'}
 */
export function getHealthStatus(score) {
  const s = normalizePct(score);
  if (s == null || !Number.isFinite(s)) return 'SIN_DATOS';
  if (s >= 70) return 'OPTIMO';
  if (s >= 40) return 'ATENCION';
  if (s >= 10) return 'URGENTE';
  return 'CRITICO';
}

/**
 * Retorna la etiqueta legible en español para un porcentaje de salud.
 *
 * @param {number|null|undefined} score
 * @returns {string}
 */
export function getHealthLabel(score) {
  const status = getHealthStatus(score);
  const labels = {
    OPTIMO:    'Óptimo',
    ATENCION:  'Atención',
    URGENTE:   'Urgente',
    CRITICO:   'Crítico',
    SIN_DATOS: 'Sin datos',
  };
  return labels[status] || 'Sin datos';
}

/**
 * Normaliza un valor de salud al rango 0-100.
 * El backend a veces envía valores 0-1 (ratio) en contextos legacy.
 *
 * @param {number|string|null|undefined} value
 * @returns {number}
 */
export function normalizePct(value) {
  if (value == null) return 0;
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return 0;
  if (n > 0 && n <= 1) return n * 100;
  return n;
}

/**
 * Salud global coherente con la pantalla de salud del vehículo: snapshot del motor primero, luego vehículo.
 *
 * @param {object|null|undefined} vehicleLike  Serializer vehículo (lista o detalle).
 * @param {object|null|undefined} healthSummary  Respuesta GET `/vehiculos/health/vehicle/:id/` cuando exista.
 * @returns {number}  Porcentaje 0–100 (ver `normalizePct`)
 */
export function resolveVehicleHealthPct(vehicleLike, healthSummary = null) {
  const raw =
    healthSummary?.salud_general_porcentaje ??
    vehicleLike?.salud_general_porcentaje ??
    vehicleLike?.health_score ??
    0;
  return normalizePct(raw);
}

/**
 * Indica si hay un porcentaje de salud confiable (motor o snapshot en vehículo).
 * Evita mostrar 0 % cuando aún no hay datos.
 */
export function hasVehicleHealthData(vehicleLike, healthSummary = null) {
  if (healthSummary != null && typeof healthSummary === 'object' && !healthSummary.error) {
    if (healthSummary.salud_general_porcentaje != null) return true;
  }
  if (vehicleLike?.salud_general_porcentaje != null) return true;
  if (vehicleLike?.health_score != null) return true;
  return false;
}

/**
 * Normaliza el km restante de un componente desde múltiples campos posibles.
 *
 * @param {object} comp  Objeto componente del backend
 * @returns {number|null}
 */
export function normalizeKmRemaining(comp) {
  if (!comp || typeof comp !== 'object') return null;
  const v =
    comp.km_estimados_restantes ??
    comp.vida_util_restante_km ??
    comp.km_restantes ??
    comp.remaining_km ??
    null;
  if (v == null) return null;
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

/**
 * Kilometraje restante legible (sin símbolos de aproximación).
 * @returns {string|null}  p. ej. "650 km"
 */
export function formatHealthKmRemaining(km) {
  if (km == null || !Number.isFinite(Number(km))) return null;
  const n = Math.round(Number(km));
  if (n <= 0) return null;
  return `${n.toLocaleString('es-CL')} km`;
}

/**
 * Tiempo restante legible (sin símbolos de aproximación).
 * @returns {string|null}  p. ej. "21 días", "2 meses"
 */
export function formatHealthDaysRemaining(days) {
  if (days == null || !Number.isFinite(Number(days))) return null;
  const n = Math.round(Number(days));
  if (n <= 0) return null;
  if (n < 30) return `${n} ${n === 1 ? 'día' : 'días'}`;
  const meses = Math.round(n / 30);
  if (n < 365) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  const años = Number((n / 365).toFixed(1));
  const añosTxt = años % 1 === 0 ? String(Math.round(años)) : años.toFixed(1);
  return `${añosTxt} ${años === 1 ? 'año' : 'años'}`;
}

/**
 * Ventana de acción en una sola línea: km y/o días, separados por ·
 * @returns {string|null}
 */
export function formatHealthActionWindow({ km, days } = {}) {
  const kmPart = formatHealthKmRemaining(km);
  const daysPart = formatHealthDaysRemaining(days);
  const parts = [kmPart, daysPart].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
