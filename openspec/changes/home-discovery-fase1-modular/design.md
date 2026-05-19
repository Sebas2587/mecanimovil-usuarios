# Diseño técnico — Fase 1 modularización home

## Estructura de carpetas

```
app/components/home/
  shared/           # Tokens de layout, formatters, HomePanelCard, HomeSectionHeader
  discovery/        # Bloques del feed (TopBar, vehículo, quick actions, secciones)
  ProviderPreviewCard.js  # (existente)
```

## Responsabilidades

| Módulo | Responsabilidad |
|--------|-----------------|
| `UserPanelScreen` | Queries React Query, viaje GPS, clima, modales, composición |
| `HomeNearbySection` | UI de proveedores cercanos; datos vía props |
| `HomeMarketActivitySection` | UI demanda agregada; datos vía props |
| `homeVehicleUtils` | `resolveVehicleMarcaId`, `coordsFromSavedAddress` |

## Reglas

- Los componentes `discovery/*` no llaman APIs; la pantalla inyecta datos y callbacks.
- Estilos de sección viven en cada componente (`StyleSheet` local).
- Fases siguientes añaden `HomeParaTiSection`, `ExploreProvidersScreen` sin mover de nuevo la lógica de fetch fuera del screen hasta definir hook `useHomeDiscovery`.
