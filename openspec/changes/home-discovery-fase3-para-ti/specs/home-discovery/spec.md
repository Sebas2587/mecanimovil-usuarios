# home-discovery Specification (delta) — Fase 3

## ADDED Requirements

### Requirement: Sección Para ti por KPI
El home **SHALL** mostrar una sección «Para ti» / «Destacados» antes de «Cerca de ti» con proveedores compatibles con la marca del vehículo activo, ordenados por relevancia KPI (desc), limitados a la ciudad/comuna de la dirección de servicio y al radar de 5 km.

#### Scenario: Usuario con vehículo registrado
- GIVEN un usuario con vehículo seleccionado
- AND una dirección de servicio con ciudad/comuna resoluble
- WHEN carga el panel principal
- THEN ve la sección «Para ti» con proveedores que atienden su marca en su ciudad
- AND las cards muestran distancia desde la dirección cuando hay coordenadas
- AND las cards muestran insignia KPI cuando el backend la expone

#### Scenario: Ver todos Destacados
- WHEN el usuario pulsa «Ver todos» en «Para ti»
- THEN navega a explorar con `mode=para_ti`
- AND ve todos los proveedores de la marca ordenados por KPI sin filtro ciudad del panel

#### Scenario: Sin proveedores para la marca
- GIVEN un vehículo cuya marca no tiene proveedores en catálogo
- WHEN carga «Para ti»
- THEN ve un mensaje vacío sin bloquear «Cerca de ti»

### Requirement: Cerca de ti por distancia
La sección **SHALL** titularse «Cerca de ti» y usar proveedores geolocalizados ordenados por distancia desde la dirección de servicio.

#### Scenario: Texto de sección
- GIVEN dirección configurada
- WHEN se muestra «Cerca de ti»
- THEN el subtítulo indica orden por cercanía desde la dirección seleccionada

### Requirement: Ver todos Para ti
«Para ti» **SHALL** ofrecer «Ver todos» que abre `ExploreProvidersScreen` en modo `para_ti`.

#### Scenario: Explorar destacados
- WHEN el usuario pulsa «Ver todos» en «Para ti»
- THEN navega a explorar con `mode=para_ti` y el mismo vehículo
