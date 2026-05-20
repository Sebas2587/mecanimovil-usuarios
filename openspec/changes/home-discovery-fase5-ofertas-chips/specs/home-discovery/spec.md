# home-discovery Specification (delta) — Fase 5

## ADDED Requirements

### Requirement: Ofertas resumidas en listados del panel
Los endpoints `cerca` y `proveedores_filtrados` **SHALL** aceptar `include_panel_servicios=true` y devolver hasta tres ofertas por proveedor con nombre de servicio y precio publicado al cliente.

#### Scenario: Home Para ti con vehículo
- GIVEN un vehículo con marca registrada
- WHEN el cliente carga «Para ti» con `include_panel_servicios=true`
- THEN cada card puede mostrar chips con nombre de servicio y precio en CLP

#### Scenario: Cerca de ti
- GIVEN dirección de servicio con coordenadas
- WHEN se listan proveedores en `cerca` con el flag y filtro de marca
- THEN las ofertas respetan la marca del vehículo o son genéricas (marca null)

### Requirement: Chips en ProviderPreviewCard
Las cards del home y explorar **SHALL** mostrar chips de ofertas cuando `panel_servicios` no está vacío, sin obligar a abrir la ficha para ver precios de referencia.

#### Scenario: Proveedor con ofertas
- WHEN `panel_servicios` tiene al menos un ítem
- THEN la card muestra chips horizontales con nombre y precio
- AND no muestra solo el texto genérico de especialidad

#### Scenario: Sin ofertas publicadas
- WHEN `panel_servicios` está vacío
- THEN la card mantiene la línea de especialidad existente
