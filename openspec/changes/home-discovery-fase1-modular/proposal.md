# Propuesta: Home discovery — Fase 1 (modularización)

## Why
`UserPanelScreen.js` concentra header, ubicación, vehículo, acciones rápidas y secciones de proveedores en ~2.400 líneas, dificultando evolucionar el home tipo Uber Eats/Rappi.

## What Changes (Fase 1)
- Extraer componentes modulares en `app/components/home/discovery/` y utilidades en `app/components/home/shared/`.
- `UserPanelScreen` queda como orquestador (datos, queries, modales de viaje/clima); sin cambiar rutas ni comportamiento.
- OpenSpec `home-discovery` con requisitos de composición modular.

## Non-goals (Fase 1)
- Sección «Para ti» por KPI, `ExploreProvidersScreen`, ni cambios de API.
- Mover telemetría, clima o hero fuera del home (Fase 4).

## Alcance
- `UserPanelScreen`, nuevos componentes home discovery, tokens existentes.
