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

/** Pestañas de ExploreProvidersScreen */
export const EXPLORE_TAB_ALL = 'all';
export const EXPLORE_TAB_TALLER = 'taller';
export const EXPLORE_TAB_MECANICO = 'mecanico';

export const EXPLORE_TABS = [
  { id: EXPLORE_TAB_ALL, label: 'Todos' },
  { id: EXPLORE_TAB_TALLER, label: 'Talleres' },
  { id: EXPLORE_TAB_MECANICO, label: 'A domicilio' },
];

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
