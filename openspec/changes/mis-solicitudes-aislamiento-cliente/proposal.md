# Propuesta: Aislamiento de Mis solicitudes por cliente

## Why
En `MisSolicitudesScreen`, usuarios ven solicitudes activas/en proceso que no crearon (no son `cliente` de la solicitud). El listado usaba `GET /ordenes/solicitudes-publicas/`, que para cuentas sin perfil `Cliente` devolvía el feed de proveedor (solicitudes públicas de terceros).

## What Changes
- Backend: endpoint `mis-solicitudes` y `list` restringidos al `cliente` autenticado; corrección en queryset de ofertas (`vehiculo__cliente`).
- Frontend: consumir `mis-solicitudes`, filtro defensivo por `cliente` y limpieza de cache al cambiar usuario.

## Alcance
- `MisSolicitudesScreen`, `useRequests`, `solicitudesService`, `SolicitudesContext`
- `SolicitudPublicaViewSet`, `OfertaProveedorViewSet` (backend)

## Non-goals
- No cambia el feed de proveedores (`disponibles` en app prov).
