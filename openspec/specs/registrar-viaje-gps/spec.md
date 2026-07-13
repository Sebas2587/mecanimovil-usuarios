# registrar-viaje-gps Specification

## Purpose
Herramienta GPS para registrar kilometraje mientras el usuario conduce. No es contenido del home (rediseño Airbnb).

## Requirements

### REQ-TRIP-PROVIDER
El estado del viaje **SHALL** vivir en `TripTrackingProvider` (app autenticada), compartido entre pantallas.

### REQ-TRIP-BARRA-ACTIVA
Con `tripActive`, la app **SHALL** mostrar `TripActiveBar` fija encima del tab bar (tabs) o sobre el safe area (pantallas stack), con km, tiempo, velocidad y **Detener**.

### REQ-TRIP-PANTALLA
`RegistrarViajeScreen` **SHALL** ser la pantalla principal de la herramienta (iniciar/detener viaje, selector de vehículo si hay varios), plantilla Focus.

### REQ-TRIP-ENTRADAS
Entradas **SHALL** incluir:
- Acceso desde ficha del vehículo (`VehicleProfile` / `QuickActionGrid` «Viaje GPS»).
- Enlace en `MisVehiculosScreen`.
- Tap en barra activa → `RegistrarViaje`.

**SHALL NOT** aparecer como quick action en `UserPanelScreen` (Inicio).

### REQ-TRIP-HOME
El home **SHALL NOT** mostrar clima ni telemetría de viaje en el feed de descubrimiento.

### REQ-TRIP-CIERRE
Al detener con km > 0, **SHALL** mostrarse `HomeTripCompletionModal` y registrar odómetro vía API existente.
