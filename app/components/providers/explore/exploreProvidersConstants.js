/** Modos de ExploreProvidersScreen */
export const EXPLORE_MODE_CERCA = 'cerca';
export const EXPLORE_MODE_PARA_TI = 'para_ti';

export const EXPLORE_MODE_SEGMENTS_HOME = [
  { id: EXPLORE_MODE_PARA_TI, label: 'Para ti' },
  { id: EXPLORE_MODE_CERCA, label: 'Cerca de ti' },
];

/** En categoría: deja claro que es ordenación, no otra pantalla. */
export const EXPLORE_MODE_SEGMENTS_CATEGORY = [
  { id: EXPLORE_MODE_PARA_TI, label: 'Recomendados' },
  { id: EXPLORE_MODE_CERCA, label: 'Más cercanos' },
];

/**
 * Filtro Explore: por categoría de servicio (no taller vs domicilio).
 * `all` = sin filtro de categoría.
 */
export const EXPLORE_FILTER_ALL = 'all';

/** @deprecated Usar EXPLORE_FILTER_ALL */
export const EXPLORE_TAB_ALL = EXPLORE_FILTER_ALL;
/** @deprecated Ya no hay filtro por tipo de proveedor */
export const EXPLORE_TAB_TALLER = 'taller';
/** @deprecated Ya no hay filtro por tipo de proveedor */
export const EXPLORE_TAB_MECANICO = 'mecanico';

/** Label corto estilo Airbnb (1–2 palabras) a partir del nombre de categoría. */
export function shortCategoryLabel(nombre) {
  const raw = String(nombre || '').trim();
  if (!raw) return 'Categoría';
  const head = raw.split(/\s+y\s+|\s+e\s+/i)[0].trim();
  if (head.length <= 16) return head;
  return `${head.slice(0, 14)}…`;
}

/**
 * @deprecated Prefer filterProvidersByServicioIds — el eje es categoría de servicio.
 * Conservado por compat con redirects legacy (taller/mecanico → sin filtro).
 */
export function filterProvidersByExploreTab(providers, tabId) {
  const list = Array.isArray(providers) ? providers : [];
  if (tabId === EXPLORE_TAB_TALLER) {
    return list.filter((p) => p._panelKind === 'taller');
  }
  if (tabId === EXPLORE_TAB_MECANICO) {
    return list.filter((p) => p._panelKind === 'mecanico');
  }
  return list;
}
