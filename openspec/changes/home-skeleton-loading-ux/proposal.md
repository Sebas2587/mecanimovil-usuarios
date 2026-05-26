# Propuesta: Skeleton loading en home y listas

## Problema
Varias pantallas del panel de usuario (`UserPanelScreen`, crear solicitud, mis vehículos, marketplace) mostraban `ActivityIndicator` centrados durante la carga. Eso rompe la percepción de continuidad visual y no anticipa el layout final.

## Solución
- Componentes reutilizables en `app/components/utils/HomePanelSkeletons.js` y skeletons de lista dedicados.
- Cada sección del home muestra un placeholder con la misma jerarquía que el contenido real (header, categorías, chips, cards, carrusel de proveedores, clima).
- Datos con TanStack Query (`useQuery` / `useMemo` / `useCallback`) para evitar refetches y re-renders innecesarios.

## Alcance
- `UserPanelScreen` y componentes `home/discovery/*` usados en el panel.
- `CrearSolicitudScreen`, `FormularioSolicitud`, `MisVehiculosScreen`, `MarketplaceScreen` (cambio previo en la misma línea).

## Fuera de alcance
- Spinners en acciones puntuales (submit de formulario, modales de viaje) salvo overlay de creación de solicitud.
