# listas-usuario — Skeleton loading (delta)

## Requirements

### REQ-LISTAS-SKELETON-VEHICULOS
`MisVehiculosScreen` **SHALL** mostrar `VehiclesListSkeleton` en la carga inicial (`isLoading` sin datos en caché), no un spinner centrado.

### REQ-LISTAS-SKELETON-MARKETPLACE
`MarketplaceScreen` pestaña Explorar **SHALL** mostrar `MarketplaceListSkeleton` en carga inicial de publicaciones.

### REQ-LISTAS-QUERY-MARKETPLACE
Listados y ofertas del marketplace **SHALL** obtenerse con `useQuery` (`marketplaceListings`, `marketplaceOffers`); filtros y `renderItem` memoizados con `useMemo` / `useCallback`.

### REQ-LISTAS-QUERY-VEHICULOS
`MisVehiculosScreen` **SHALL** usar `useVehicles()` y map de salud por `vehicleId` con `useMemo` para el `FlatList`.
