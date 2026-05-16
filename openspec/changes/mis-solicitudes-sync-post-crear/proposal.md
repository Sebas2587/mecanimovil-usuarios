# Propuesta: Sincronización de Mis solicitudes tras crear

## Why
Tras crear y publicar una solicitud, la lista en `MisSolicitudesScreen` no se actualizaba hasta pull-to-refresh manual (React Query sin invalidación + cache HTTP del GET lista).

## What Changes
- Helper central `syncSolicitudesListAfterChange` en `useRequests.js`
- `forceRefresh` en GET de listas en `solicitudesService`
- `CrearSolicitudScreen` y `SeleccionarServiciosScreen` sincronizan cache tras publicar
- `MisSolicitudesScreen` refetch al foco (`refreshList` o datos stale)
