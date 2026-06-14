# home-discovery Specification

## Purpose
TBD - created by archiving change explore-categoria-filtro-ofertas. Update Purpose after archive.
## Requirements
### Requirement: Explore filtrado por categoría
Cuando el usuario elige una categoría principal en el home, `ExploreProvidersScreen` **SHALL** listar únicamente proveedores que tengan al menos una `OfertaServicio` activa para un servicio de esa categoría (incluyendo subcategorías).

- **SHALL NOT** incluir proveedores solo por `especialidades` de perfil sin oferta de servicio.
- **SHALL NOT** solicitar proveedores sin `servicio_ids` mientras la categoría está seleccionada y los servicios aún cargan.
- El orden dentro del radar **SHALL** priorizar proveedores con oferta del servicio, luego distancia, luego KPI.

#### Scenario: Categoría con servicios configurados
- GIVEN el usuario selecciona «Frenos y Seguridad» y existen servicios en esa categoría
- WHEN se carga `ExploreProvidersScreen`
- THEN solo aparecen proveedores con `panel_servicios` que incluya un `servicio_id` de esa categoría
- AND no aparecen proveedores cercanos que solo tengan la especialidad de perfil

#### Scenario: Categoría sin servicios en catálogo
- GIVEN una categoría sin servicios asociados en API
- WHEN el usuario abre explore con esa categoría
- THEN no se muestra el listado genérico por marca
- AND se muestra estado vacío acorde

