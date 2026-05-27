# registrar-viaje-gps Specification

## Purpose
Herramienta GPS para registrar kilometraje mientras el usuario conduce. No es contenido de descubrimiento del home.

## Requirements

### REQ-TRIP-PROVIDER
El estado del viaje **SHALL** vivir en `TripTrackingProvider` (app autenticada), compartido entre pantallas.

### REQ-TRIP-BARRA-ACTIVA
Con `tripActive`, la app **SHALL** mostrar `TripActiveBar` fija encima del tab bar (tabs) o sobre el safe area (pantallas stack), con km, tiempo, velocidad y **Detener**.

### REQ-TRIP-PANTALLA
`RegistrarViajeScreen` **SHALL** ser la pantalla principal de la herramienta (iniciar/detener viaje, selector de vehículo si hay varios).

### REQ-TRIP-ENTRADAS
Entradas **SHALL** incluir:
- Acción rápida en `UserPanelScreen` («Registrar viaje» / «Viaje activo»).
- Enlace en card de `MisVehiculosScreen`.
- Tap en barra activa → `RegistrarViaje`.

### REQ-TRIP-HOME-CLIMA
El home **SHALL** mostrar solo clima al final del scroll; la telemetría **MUST NOT** permanecer fija en el panel de descubrimiento.

### REQ-TRIP-CIERRE
Al detener con km > 0, **SHALL** mostrarse `HomeTripCompletionModal` y registrar odómetro vía API existente.
