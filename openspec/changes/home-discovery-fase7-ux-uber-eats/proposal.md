# Propuesta: Home discovery — Fase 7 (UX tipo Uber Eats)

## Why
El home aún no sigue la jerarquía visual de marketplaces (dirección → búsqueda → categorías → rails temáticos). El segmento único Para ti/Cerca y el bloque de auto al inicio compiten con el discovery.

## What Changes
- `HomeContextHeader`: vehículo + dirección + acciones en header compacto.
- `HomeSearchBar` + `HomeCategoryGrid` (íconos) reemplazan el hub de chips.
- `HomeContextualBanner`: solicitud activa, salud baja o clima de riesgo (prioridad única).
- Rails separados: `HomeOffersRow`, `HomeHighlightedRow`, `HomeNearbyRow`.
- `HomeTrendingServicesRow` sustituye lista vertical de actividad de mercado.
- Quick actions reducidas y al final; dashboard del auto colapsable al fondo.
- Eliminar `HomeProvidersFeedSection` del home.

## Non-goals
- Hero banners patrocinados backend.
- Cambios en ExploreProvidersScreen más allá de reutilizar navegación existente.
