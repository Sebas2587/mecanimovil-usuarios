export function normalizePct(value) {
  if (value == null) return 0;
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return 0;
  // Backend sometimes sends 0..1 ratio; UI expects 0..100.
  if (n > 0 && n <= 1) return n * 100;
  return n;
}

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

