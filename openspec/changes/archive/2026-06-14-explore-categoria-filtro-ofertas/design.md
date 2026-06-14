# Design — explore-categoria-filtro-ofertas (usuarios)

## Flujo

```
HomeDiscoveryHub (chip categoría)
  → ExploreProvidersScreen (categoryId)
  → useExploreProviders
       1. GET por_categoria (servicios de categoría + subcategorías)
       2. GET proveedores_filtrados?servicio_ids[]=…
       3. Filtro cliente: panel_servicios ∩ servicioIds
       4. Orden: match servicio → distancia → KPI
```

## Decisiones

- **No fallback por especialidades en cliente**: alineado con backend estricto; evita falsos positivos.
- **Esperar servicios antes de proveedores**: `enabled` del query de proveedores exige `!servicesQuery.isLoading` cuando hay `categoryId`.
- **Estado vacío**: si tras cargar servicios la lista está vacía, no se llama a proveedores sin filtro; UI muestra vacío con mensaje existente.
