# Diseño: Aislamiento Mis solicitudes

## Causa raíz
`SolicitudPublicaViewSet.get_queryset()` en acción `list` caía en la rama de proveedor cuando el usuario no tenía `Cliente`, exponiendo solicitudes globales/dirigidas de otros clientes en la app de usuarios.

## Solución
1. **API**: acciones `list`, `activas`, `puede_crear_solicitud` y `mis_solicitudes` solo devuelven `SolicitudServicioPublica` con `cliente=request.user.cliente`. Feed proveedor queda en `disponibles`.
2. **Ofertas**: quitar `vehiculo__cliente` del filtro de ofertas del cliente (evita ver ofertas de solicitudes ajenas por vehículo comprado).
3. **App**: `obtenerMisSolicitudes` → `GET .../mis-solicitudes/`; `filtrarSolicitudesDelCliente` como defensa en `useRequests`.

## Cambio de usuario
`setCurrentUserCacheId` ya limpia cache HTTP; React Query usa clave `['requests', userId]` y se purga en logout.
