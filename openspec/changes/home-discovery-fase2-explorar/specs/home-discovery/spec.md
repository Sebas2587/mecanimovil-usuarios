# home-discovery Specification (delta) — Fase 2

## ADDED Requirements

### Requirement: Ver todos desde Cerca de ti
La sección «Cerca de ti» del home **SHALL** mostrar un enlace «Ver todos» cuando exista al menos un proveedor o la dirección esté configurada y no esté cargando.

#### Scenario: Usuario abre listado completo
- GIVEN un usuario con vehículo seleccionado y dirección con coordenadas válidas
- WHEN pulsa «Ver todos» en «Cerca de ti»
- THEN navega a `ExploreProvidersScreen` con el mismo vehículo y dirección de contexto

### Requirement: Explorar con tabs
`ExploreProvidersScreen` **SHALL** ofrecer pestañas «Todos», «Talleres» y «A domicilio» que filtran la misma lista unificada por tipo de proveedor.

#### Scenario: Filtrar por talleres
- GIVEN el usuario en Explorar con proveedores de ambos tipos cargados
- WHEN selecciona la pestaña «Talleres»
- THEN solo ve proveedores con `_panelKind` taller

### Requirement: Cambio de dirección en explorar
La pantalla explorar **SHALL** permitir cambiar la dirección de servicio y recargar proveedores cercanos.

#### Scenario: Nueva dirección
- GIVEN el usuario en Explorar
- WHEN selecciona otra dirección guardada
- THEN la lista se actualiza según las nuevas coordenadas
