# Propuesta: Validación de kilometraje contra registro SII (GetAPI mileage)

## Why
El usuario puede ingresar un odómetro menor al registrado en el SII vía GetAPI (`mileage` en plate/appraisal), generando datos inconsistentes en salud y marketplace.

## What Changes
- Backend: exponer `mileage`, `tiene_mileage_sii` y validación en `consultar-patente` + `validar-kilometraje` + create vehículo.
- App usuarios: mostrar kilometraje SII en ficha del vehículo y alertas al guardar (web y móvil).

## Alcance
- `VehicleRegistrationScreen`, `vehicle.js`, util `vehicleMileage.js`
- Plausibilidad por edad sin SII: alertas, confirmación y sugerencia de tipeo
- `getapi_client.py`, `kilometraje_validation.py`, `VehiculoViewSet`
