# Diseño — ExploreProviders (Fase 2)

## Navegación

```
UserPanel → HomeNearbySection «Ver todos»
  → ExploreProvidersScreen { vehicle, address, initialTab: 'all' }
```

## Params de ruta

| Param | Uso |
|-------|-----|
| `vehicle` | Marca/modelo para filtro API |
| `address` | Coordenadas y etiqueta UI |
| `initialTab` | `all` \| `taller` \| `mecanico` |

## Datos

- Misma fuente que el panel: `GET talleres/cerca` + `mecanicos-domicilio/cerca` vía `getNearbyProvidersForPanel({ limit: 60 })`.
- Filtrado por tab en cliente (`_panelKind`).

## Componentes

```
app/components/providers/explore/
  ExploreProvidersTabs.js
  ExploreProvidersLocationBar.js
  ExploreProvidersGrid.js
app/hooks/useExploreProvidersNearby.js
app/screens/providers/ExploreProvidersScreen.js
```
