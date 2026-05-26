# solicitudes-crear — Skeleton loading (delta)

## Requirements

### REQ-SOLICITUD-SKELETON-BOOT
`CrearSolicitudScreen` **SHALL** mostrar `CrearSolicitudScreenSkeleton` mientras cargan vehículos, direcciones o preload de servicios por ID, en lugar de `ActivityIndicator` con texto.

### REQ-SOLICITUD-SKELETON-PASO1
`FormularioSolicitud` paso 1 **SHALL** usar `SolicitudPaso1ServiciosSkeleton` al cargar servicios del vehículo (`vehicleServices` query pending).

### REQ-SOLICITUD-QUERY
Vehículos del flujo **SHALL** compartir `queryKey: ['userVehicles']` con el panel; direcciones y servicios por vehículo con `useQuery` + `useMemo` para listas derivadas.
