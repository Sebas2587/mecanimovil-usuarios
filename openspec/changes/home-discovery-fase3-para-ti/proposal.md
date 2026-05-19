# Propuesta: Home discovery — Fase 3 (Para ti)

## Why
El home debe destacar proveedores por relevancia KPI (marca del vehículo), separado del listado «Cerca de ti» ordenado por distancia.

## What Changes
- Sección **Para ti** en el feed (antes de «Cerca de ti») vía `proveedores_filtrados` + orden KPI unificado en cliente.
- Backend: incluir `kpi_badge` en serialización de `proveedores_filtrados`.
- `ExploreProvidersScreen` admite `mode: 'para_ti' | 'cerca'`.
- Carrusel compartido `HomeProvidersCarouselSection`.

## Non-goals
- Endpoint panel único backend (fase futura).
- Mover telemetría/clima fuera del home (fase 4).
