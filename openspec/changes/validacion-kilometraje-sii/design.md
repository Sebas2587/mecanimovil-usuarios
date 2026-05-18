# Diseño: Kilometraje vs mileage SII

## Fuentes GetAPI
1. `GET /v1/vehicles/plate/{patente}` → `data.mileage`
2. `GET /v1/vehicles/appraisal/{patente}` → `data.mileage` (si plate no trae)

Campo canónico en respuesta backend: `mileage` + `tiene_mileage_sii` + `kilometraje_api` (alias).

## Reglas SII (prioridad; no mezclar con plausibilidad)
| Condición | Resultado |
|-----------|-----------|
| `tiene_mileage_sii` y `km_usuario < mileage` | Error bloqueante (inconsistencia con SII) |
| `tiene_mileage_sii` y `km_usuario >= mileage` | OK |
| Con `mileage` SII | No se evalúa banda por edad |

## Plausibilidad por edad (solo sin `mileage` SII)
Banda: `años_vida × [3000, 12000, 28000]` km; vehículo del año: máx ~45.000 km.
| Condición | Resultado |
|-----------|-----------|
| km dentro de banda | OK |
| km bajo/alto moderado | Aviso + confirmación |
| km extremo o posible tipeo (×10 / ÷10) | Error o aviso con `km_sugerido` |
| Sin `year` | Aviso informativo; solo km > 0 |

## UX
- Ficha del vehículo muestra "Kilometraje según registro (SII): X km" cuando aplica.
- Sección de ingreso de km referencia el valor SII o el aviso de no disponible.
