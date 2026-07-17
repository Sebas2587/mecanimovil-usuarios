/**
 * Dirección de taller para UI.
 * - full: calle N°, comuna, ciudad (detalle / oferta — saber dónde queda)
 * - short: calle N°, comuna (meta de cards Explore)
 */

const SKIP_NUMERO = new Set(['s/n', 'sn', 's/n.', '-', '0', 'null', 'undefined', '']);

function cleanPart(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  if (lower.startsWith('provincia de ')) return '';
  if (lower.startsWith('región ') || lower.startsWith('region ')) return '';
  if (lower === 'chile') return '';
  return s;
}

/** Placeholders sin número real — no confundir con N° de calle válido. */
function isSkipNumero(n) {
  const t = String(n || '').trim().toLowerCase();
  return !t || SKIP_NUMERO.has(t);
}

function pushUnique(parts, value) {
  const v = cleanPart(value);
  if (!v) return;
  const lower = v.toLowerCase();
  if (parts.some((p) => p.toLowerCase() === lower || p.toLowerCase().includes(lower))) return;
  if (parts.some((p) => lower.includes(p.toLowerCase()) && p.length >= 3)) return;
  parts.push(v);
}

function buildFromStructured(df, variant) {
  if (!df) return null;
  const calle = cleanPart(df.calle);
  const numero = isSkipNumero(df.numero) ? '' : String(df.numero).trim();
  const comuna = cleanPart(df.comuna);
  const ciudad = cleanPart(df.ciudad);
  const street = [calle, numero].filter(Boolean).join(' ').trim();

  const parts = [];
  if (street) parts.push(street);
  pushUnique(parts, comuna);
  if (variant === 'full') {
    pushUnique(parts, ciudad);
    const extras = cleanPart(df.detalles_adicionales);
    if (extras && extras.length <= 48) pushUnique(parts, extras);
  }

  if (parts.length) return parts.join(', ');

  // Fallback: direccion_completa del API/modelo (ya armada en backend).
  const completa = String(df.direccion_completa || '')
    .split(',')
    .map((p) => cleanPart(p))
    .filter(Boolean)
    .filter((p) => !isSkipNumero(p));

  if (!completa.length) return null;
  if (variant === 'short') {
    return completa.length >= 2 ? `${completa[0]}, ${completa[1]}` : completa[0];
  }
  return completa.join(', ');
}

function buildFromRaw(raw, variant) {
  const text = String(raw || '').trim();
  if (!text) return null;

  const segments = text
    .split(',')
    .map((p) => cleanPart(p))
    .filter(Boolean)
    .filter((p) => !isSkipNumero(p));

  const deduped = [];
  for (const seg of segments) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.toLowerCase() === seg.toLowerCase()) continue;
    deduped.push(seg);
  }
  if (!deduped.length) return null;
  if (variant === 'short') {
    return deduped.length >= 2 ? `${deduped[0]}, ${deduped[1]}` : deduped[0];
  }
  return deduped.join(', ');
}

/**
 * @param {object|null|undefined} provider
 * @param {{ variant?: 'full'|'short' }} [options]
 * @returns {string|null}
 */
export function formatProviderStreetAddress(provider, options = {}) {
  if (!provider) return null;
  const variant = options.variant === 'short' ? 'short' : 'full';

  const fromDf = buildFromStructured(provider.direccion_fisica, variant);
  if (fromDf) return fromDf;

  const raw =
    (typeof provider.direccion === 'string' && provider.direccion.trim()) ||
    (typeof provider.usuario?.direccion === 'string' && provider.usuario.direccion.trim()) ||
    (typeof provider.direccion_taller === 'string' && provider.direccion_taller.trim()) ||
    '';

  return buildFromRaw(raw, variant);
}
