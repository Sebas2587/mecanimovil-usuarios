# Diseño — Para ti (Fase 3)

## Orden de secciones en home

1. Para ti → `proveedores_filtrados` + `compareProvidersByKpiRelevance`
2. Cerca de ti → `getNearbyProvidersForPanel` (distancia)
3. Qué piden otros… (sin cambios)

## Datos

| Sección | API | Orden | Alcance home (panel) |
|---------|-----|--------|----------------------|
| Para ti / Destacados | `/proveedores_filtrados/` ×2 | KPI (desc) | Misma ciudad/comuna que la dirección + radar 5 km |
| Cerca de ti | `/cerca/` ×2 | Distancia | Radio 5 km |

Distancia en cards «Para ti»: enriquecimiento vía mapa `/cerca/` + Haversine (solo display).

**Ver todos (Explore `mode=para_ti`)**: todos los proveedores de la marca por KPI, sin filtro ciudad/radar.

**Ver todos (Explore `mode=cerca`)**: todos los cercanos por distancia (misma API que panel, más límite).

Ciudad del usuario: reverse geocode de `ubicacion` o parseo de `direccion` guardada; match con `direccion_fisica` / `zonas_servicio` del proveedor.

## Explore

`route.params.mode`: `para_ti` | `cerca` (default `cerca`).
