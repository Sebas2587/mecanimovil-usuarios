/**
 * El canvas puede devolver `data:image/png;base64,...` pero la UI a veces
 * antepone otro prefijo. Si ya es data URI, usar tal cual; si no, asumir PNG base64 plano.
 */
export function signatureStoredToImageUri(stored) {
  if (stored == null || typeof stored !== 'string') return null;
  const s = stored.trim();
  if (!s) return null;
  if (/^data:image\//i.test(s)) return s;
  return `data:image/png;base64,${s}`;
}
