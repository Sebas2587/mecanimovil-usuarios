# Propuesta: Explore por categoría — filtro estricto por OfertaServicio

## Why
Al elegir una categoría en el home (p. ej. «Frenos y Seguridad»), el listado mostraba proveedores cercanos sin verificar que tuvieran el servicio configurado en su catálogo (`OfertaServicio`). El backend incluía proveedores solo por `especialidades` de perfil y, si `servicio_ids` llegaba vacío, devolvía todos los compatibles con la marca.

## What Changes
- `useExploreProviders`: esperar resolución de servicios de la categoría antes de pedir proveedores; no listar sin filtro si hay `categoryId`.
- Filtro defensivo en cliente: solo proveedores con `panel_servicios` que incluya un `servicio_id` de la categoría.
- Orden en explore por categoría: priorizar quienes ofrecen el servicio, luego distancia, luego KPI.
- `providerMatchesCategory`: eliminar fallback por `especialidades`; solo `OfertaServicio` reflejada en `panel_servicios`.
