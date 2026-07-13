# Plan aprobado — Destacados / descubrimiento de talleres

Fecha: 2026-07-13  
Estado: **APROBADO** (orden: distancia pura)

## Modelo de negocio

Todos los proveedores son **talleres** (`modalidad_atencion`: `en_taller` | `a_domicilio` | `ambas`).

| Regla | Detalle |
|-------|---------|
| Dirección física | Obligatoria para todos (geo real en `ubicacion` + texto). Sin pin Santiago inventado. |
| Elegibilidad | Compatibles con **marca** (y modelo cuando la oferta lo restringe) del vehículo del usuario; incluye servicios de diagnóstico. |
| Exclusión por distancia | **Home Destacados:** tope blando 50 km (evita otra región con km mal parseados). **Explore / Ver todos:** sin tope. |
| Orden | **Distancia pura** (ascendente). Sin “especialista primero”. Sin empate por KPI como criterio primario. |
| Cupo home Destacados | Máx. 12 cards; “Ver todos” → Explore (~40). |
| Distancia en UI | El API envía **km**. No interpretar 50–500 como metros (bug: 189 km → “190m”). |
| Dirección en UI | Formato corto: `Calle [nº], Comuna`. Sin `s/n`, sin “Provincia/Región…”. |

## Cambios técnicos

### Backend
1. `TallerViewSet.cerca` y `MecanicoDomicilioViewSet.cerca`: anotar distancia y ordenar; **quitar** `ubicacion__distance_lte` / radio duro.
2. Dejar de asignar `Point(-70.6693, -33.4489)` al crear taller / mecánico; `ubicacion` queda `null` hasta confirmar mapa/dirección.
3. `proveedores_filtrados` sigue siendo la fuente de elegibilidad por `vehiculo_id` (marca/multimarca + ofertas).

### App usuarios
1. Pipeline Destacados: `brandEligible` → **sortByDistance** → `takeLimit` (eliminar corte ciudad/radar).
2. Enrich con coords del usuario para Haversine cuando `/cerca` o serializer no traigan distancia.
3. No mostrar “X km” si no hay geo real (o es pin default conocido).

### App proveedores
1. Alerta / gate de configuración si falta ubicación confirmada (todas las modalidades).
2. Flujo existente `actualizar-ubicacion` es la vía canónica.

## Fuera de alcance (por ahora)
- Reescribir ranking Explore unificado completo.
- Migración masiva que limpie pins Santiago ya guardados (se puede hacer en follow-up).
- Unificar endpoints legacy `mecanicos-domicilio` (tabla ya migrada a taller; API aún existe).
