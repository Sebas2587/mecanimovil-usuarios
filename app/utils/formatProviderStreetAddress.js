/**
 * Formato corto y legible de dirección de taller para UI (detalle / cards).
 * Evita "s/n", "Provincia de…", regiones largas de reverse-geocode.
 */

const SKIP_NUMERO = new Set(['s/n', 'sn', 's/n.', '-', '0', 'null', 'undefined']);

function cleanPart(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  if (lower.startsWith('provincia de ')) return '';
  if (lower.startsWith('región ') || lower.startsWith('region ')) return '';
  if (lower === 'chile') return '';
  return s;
}

function isUselessNumero(n) {
  const t = String(n || '').trim().toLowerCase();
  if (!t || SKIP_NUMERO.has(t)) return true;
  // Segmento que es solo número de calle (p. ej. reverse-geocode "Longaví, 1499, Santiago")
  return /^\d+[a-z]?$/.test(t);
}

/**
 * @param {object|null|undefined} provider
 * @returns {string|null} p.ej. "Manuel de Amat 2960, Santiago" o "Pucará, Salamanca"
 */
export function formatProviderStreetAddress(provider) {
  if (!provider) return null;

  const df = provider.direccion_fisica;
  if (df && (df.calle || df.comuna)) {
    const calle = cleanPart(df.calle);
    const numero = isUselessNumero(df.numero) ? '' : String(df.numero).trim();
    const comuna = cleanPart(df.comuna);
    const ciudad = cleanPart(df.ciudad);
    const street = [calle, numero].filter(Boolean).join(' ').trim();
    const place =
      comuna ||
      (ciudad && !street.toLowerCase().includes(ciudad.toLowerCase()) ? ciudad : '');
    const parts = [];
    if (street) parts.push(street);
    if (place && (!street || !street.toLowerCase().includes(place.toLowerCase()))) {
      parts.push(place);
    }
    if (parts.length) return parts.join(', ');
  }

  const raw =
    (typeof provider.direccion === 'string' && provider.direccion.trim()) ||
    (typeof provider.usuario?.direccion === 'string' && provider.usuario.direccion.trim()) ||
    (typeof provider.direccion_taller === 'string' && provider.direccion_taller.trim()) ||
    (df?.direccion_completa && String(df.direccion_completa).trim()) ||
    '';

  if (!raw) return null;

  const segments = raw
    .split(',')
    .map((p) => cleanPart(p))
    .filter(Boolean)
    .filter((p) => !isUselessNumero(p) && p.toLowerCase() !== 's/n');

  // Quitar duplicados consecutivos / ruido
  const deduped = [];
  for (const seg of segments) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.toLowerCase() === seg.toLowerCase()) continue;
    deduped.push(seg);
  }

  // Máximo calle(+nro) + comuna
  if (deduped.length >= 2) return `${deduped[0]}, ${deduped[1]}`;
  return deduped[0] || null;
}
