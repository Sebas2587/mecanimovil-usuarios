# home-discovery — Skeleton loading

## Requirements

### REQ-HOME-SKELETON-INITIAL
Cuando `userVehicles` está en estado `pending` (primera carga), `UserPanelScreen` **SHALL** renderizar `UserPanelSkeleton` en lugar de un spinner global, ocupando el viewport del tab Home.

### REQ-HOME-SKELETON-SECTIONS
Cada sección del home que depende de datos asíncronos **SHALL** mostrar un skeleton acorde a su layout mientras `loading`/`isPending` sea verdadero, sin `ActivityIndicator` aislado:

| Componente | Skeleton |
|------------|----------|
| `HomeContextHeader` | `HomeContextHeaderSkeleton` (vehículos) + `VehicleHealthCompactRing` (salud, Coinbase) |
| `HomeCategoryGrid` | `HomeCategoryGridSkeleton` |
| `HomeTrendingServicesRow` | `HomeTrendingChipsSkeleton` |
| `HomeHealthServicesRow` | `HomeHealthCardsSkeleton` |
| `HomeProvidersCarouselSection` | `HomeProvidersCarouselSkeleton` |
| `ExploreProvidersGrid` (categorías / Ver todos) | `ExploreProvidersGridSkeleton` |
| `HomeWeatherPreviewSection` | `HomeWeatherCardSkeleton` |

### REQ-HOME-SKELETON-REFETCH
Un refetch en background (pull-to-refresh o `isFetching` con datos en caché) **SHALL NOT** reemplazar todo el panel por skeleton completo; solo se permiten indicadores inline discretos (p. ej. chip en categorías).

### REQ-EXPLORE-SKELETON
`ExploreProvidersScreen` al cargar proveedores (p. ej. desde `HomeCategoryGrid`) **SHALL** mostrar `ExploreProvidersGridSkeleton` dentro de `ExploreProvidersGrid`, no `ActivityIndicator` centrado con texto.

#### Scenario: Categoría desde el home
- GIVEN el usuario eligió una categoría en el panel
- WHEN `ExploreProvidersGrid` está en carga inicial sin datos
- THEN ve skeleton de sección + grilla 2×N de cards de proveedor
- AND no ve spinner global en el área de listado

### REQ-HOME-QUERY-PERF
Las queries del panel (`userVehicles`, `mainCategoriesForVehicles`, `userPanelNearbyProviders`, `userPanelMarketActivity`, `weatherPrediction`) **SHALL** usar claves estables, `staleTime` acorde al tipo de dato y selectores/memo en el screen para derivar listas filtradas sin recalcular en cada render.
