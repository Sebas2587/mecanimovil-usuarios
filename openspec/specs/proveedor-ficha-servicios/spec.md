# proveedor-ficha-servicios Specification

## Purpose
Definir el comportamiento de la ficha pública/privada del proveedor en la app de usuarios
para mostrar evidencia visual (fotos) asociada a cada servicio/oferta del proveedor dentro
de “Servicios Profesionales”, incluyendo carrusel cuando existan múltiples fotos.
## Requirements
### Requirement: Fotos asociadas a servicios profesionales
La ficha del proveedor en la app de usuarios **SHALL** mostrar las fotos asociadas a cada servicio/oferta publicado por el proveedor.

#### Scenario: Servicio con una o más fotos (layout)
- GIVEN un servicio profesional con `fotos_servicio.length >= 1`
- WHEN el usuario visualiza la card del servicio en “Servicios Profesionales”
- THEN el carrusel de fotos se muestra en la parte superior de la card (antes del título/categoría)

