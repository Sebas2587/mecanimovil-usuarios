# Diseño: Kilometraje vs mileage SII

## Fuentes GetAPI
1. `GET /v1/vehicles/plate/{patente}` → `data.mileage`
2. `GET /v1/vehicles/appraisal/{patente}` → `data.mileage` (si plate no trae)

Campo canónico en respuesta backend: `mileage` + `tiene_mileage_sii` + `kilometraje_api` (alias).

## Reglas
| Condición | Resultado |
|-----------|-----------|
| `tiene_mileage_sii` y `km_usuario < mileage` | Error bloqueante (inconsistencia con SII) |
| `tiene_mileage_sii` y `km_usuario >= mileage` | OK |
| Sin `mileage` en API | Aviso informativo; registro permitido con validación básica (>0) |

## UX
- Ficha del vehículo muestra "Kilometraje según registro (SII): X km" cuando aplica.
- Sección de ingreso de km referencia el valor SII o el aviso de no disponible.
