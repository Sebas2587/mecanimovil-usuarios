# Diseño — Para ti (Fase 3)

## Orden de secciones en home

1. Para ti → `proveedores_filtrados` + `compareProvidersByKpiRelevance`
2. Cerca de ti → `getNearbyProvidersForPanel` (distancia)
3. Qué piden otros… (sin cambios)

## Datos

| Sección | API | Orden |
|---------|-----|--------|
| Para ti | `/proveedores_filtrados/` ×2 | KPI unificado en cliente |
| Cerca de ti | `/cerca/` ×2 | Distancia |

Distancia en cards «Para ti»: enriquecimiento opcional vía mapa de `/cerca/` cuando hay dirección.

## Explore

`route.params.mode`: `para_ti` | `cerca` (default `cerca`).
