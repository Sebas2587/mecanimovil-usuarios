# Propuesta: Home discovery — Fase 2 (Explorar proveedores)

## Why
El carrusel «Cerca de ti» trunca a 18 proveedores; el usuario necesita profundidad tipo Rappi («Ver todos») sin duplicar pantallas `Talleres` / `Mecánicos` desconectadas del home.

## What Changes
- Ruta `ExploreProviders` en el stack Home con tabs Todos | Talleres | A domicilio.
- Listado unificado reutilizando `getNearbyProvidersForPanel` (límite ampliado) y contexto vehículo + dirección.
- CTA «Ver todos» en `HomeNearbySection` (y header reutilizable).
- Constante `ROUTES.EXPLORE_PROVIDERS`.

## Non-goals (Fase 2)
- Sección «Para ti» por KPI (Fase 3).
- Unificar código interno de `TalleresScreen` / `MecanicosScreen` (deprecación gradual).
