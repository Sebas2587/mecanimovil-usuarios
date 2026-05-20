import { getPanelServicios } from '../../../utils/providerUtils';

export function providerListKey(provider) {
  return `${provider._panelKind || 'p'}-${provider.id}`;
}

export function dedupeProviders(providers = []) {
  const seen = new Set();
  const out = [];
  for (const p of providers) {
    if (!p?.id) continue;
    const key = providerListKey(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export function filterProvidersWithOffers(providers = []) {
  return dedupeProviders(providers).filter((p) => getPanelServicios(p).length > 0);
}

export function shortAddressLabel(address) {
  if (!address) return 'tu zona';
  const etiqueta = address.etiqueta?.trim();
  const dir = address.direccion?.trim() || '';
  if (etiqueta && etiqueta.length <= 24) return etiqueta;
  if (!dir) return 'tu dirección';
  const part = dir.split(',')[0]?.trim();
  return part && part.length <= 32 ? part : dir.slice(0, 32);
}
