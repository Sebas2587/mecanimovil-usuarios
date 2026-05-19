# home-discovery Specification (delta) — Fase 3

## ADDED Requirements

### Requirement: Sección Para ti por KPI
El home **SHALL** mostrar una sección «Para ti» antes de «Cerca de ti» con proveedores compatibles con la marca del vehículo activo, ordenados por relevancia KPI (desc).

#### Scenario: Usuario con vehículo registrado
- GIVEN un usuario con vehículo seleccionado
- WHEN carga el panel principal
- THEN ve la sección «Para ti» con proveedores que atienden su marca
- AND las cards muestran insignia KPI cuando el backend la expone

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
