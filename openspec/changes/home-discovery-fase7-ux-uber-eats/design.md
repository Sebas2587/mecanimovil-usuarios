# Diseño — Fase 7

## Orden del scroll (UserPanelScreen)
1. HomeContextHeader
2. HomeSearchBar
3. HomeCategoryGrid
4. HomeContextualBanner (condicional)
5. HomeOffersRow (condicional)
6. HomeHighlightedRow (KPI / Para ti)
7. HomeNearbyRow (distancia)
8. HomeTrendingServicesRow
9. HomeQuickActions (3 ítems)
10. HomeVehicleDashboardCard (vitality + fold, colapsado)

## Datos
- Ofertas: filtro cliente `getPanelServicios(p).length > 0` sobre Para ti ∪ Cerca (dedupe).
- Banner: primera solicitud visible del vehículo; umbrales salud 60/75; clima ≥ 65.
- Categorías: `getMainCategories` + chip Salud; navegación igual que fase 6.

## Componentes
| Nuevo | Rol |
|-------|-----|
| `HomeContextHeader` | TopBar + selector vehículo |
| `HomeSearchBar` | CTA búsqueda fullwidth |
| `HomeCategoryGrid` | Grilla íconos 4×N |
| `HomeContextualBanner` | Alerta contextual |
| `HomeOffersRow` | Carrusel con `panel_servicios` |
| `HomeHighlightedRow` | Destacados KPI |
| `HomeNearbyRow` | Cercanos por distancia |
| `HomeTrendingServicesRow` | Chips demanda agregada |
| `HomeVehicleDashboardCard` | Patrimonio al fondo |
