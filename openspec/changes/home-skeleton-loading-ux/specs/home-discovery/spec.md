# home-discovery — Skeleton loading

## Requirements

### REQ-HOME-SKELETON-INITIAL
Cuando `userVehicles` está en estado `pending` (primera carga), `UserPanelScreen` **SHALL** renderizar `UserPanelSkeleton` en lugar de un spinner global, ocupando el viewport del tab Home.

### REQ-HOME-SKELETON-SECTIONS
Cada sección del home que depende de datos asíncronos **SHALL** mostrar un skeleton acorde a su layout mientras `loading`/`isPending` sea verdadero, sin `ActivityIndicator` aislado:

| Componente | Skeleton |
|------------|----------|
| `HomeContextHeader` | `HomeContextHeaderSkeleton` (vehículos) |
| `HomeCategoryGrid` | `HomeCategoryGridSkeleton` |
| `HomeTrendingServicesRow` | `HomeTrendingChipsSkeleton` |
| `HomeHealthServicesRow` | `HomeHealthCardsSkeleton` |
| `HomeProvidersCarouselSection` | `HomeProvidersCarouselSkeleton` |
| `HomeWeatherPreviewSection` | `HomeWeatherCardSkeleton` |

### REQ-HOME-SKELETON-REFETCH
Un refetch en background (pull-to-refresh o `isFetching` con datos en caché) **SHALL NOT** reemplazar todo el panel por skeleton completo; solo se permiten indicadores inline discretos (p. ej. chip en categorías).

### REQ-HOME-QUERY-PERF
Las queries del panel (`userVehicles`, `mainCategoriesForVehicles`, `userPanelNearbyProviders`, `userPanelMarketActivity`, `weatherPrediction`) **SHALL** usar claves estables, `staleTime` acorde al tipo de dato y selectores/memo en el screen para derivar listas filtradas sin recalcular en cada render.
