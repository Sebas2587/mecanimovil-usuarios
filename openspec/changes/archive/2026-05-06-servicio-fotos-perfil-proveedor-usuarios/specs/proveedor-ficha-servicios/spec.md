# proveedor-ficha-servicios Specification (delta)

## ADDED Requirements

### Requirement: Fotos asociadas a servicios profesionales
La ficha del proveedor en la app de usuarios **SHALL** mostrar las fotos asociadas a cada servicio/oferta publicado por el proveedor.

#### Scenario: Servicio con una foto
- GIVEN un proveedor con un servicio profesional que tiene 1 foto asociada (`fotos_servicio`)
- WHEN el usuario abre la ficha del proveedor
- THEN la card del servicio muestra esa imagen dentro del bloque visual del servicio

#### Scenario: Servicio con múltiples fotos
- GIVEN un proveedor con un servicio profesional que tiene múltiples fotos asociadas (`fotos_servicio`)
- WHEN el usuario abre la ficha del proveedor
- THEN la card del servicio muestra un carrusel horizontal con todas las fotos del servicio

#### Scenario: Servicio sin fotos
- GIVEN un servicio profesional sin fotos asociadas
- WHEN el usuario abre la ficha del proveedor
- THEN la card del servicio se muestra sin carrusel (solo título/categoría y resto de metadata)

