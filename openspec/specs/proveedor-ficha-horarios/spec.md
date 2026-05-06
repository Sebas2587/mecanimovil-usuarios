# proveedor-ficha-horarios Specification

## Purpose
TBD - created by archiving change proveedor-ficha-servicios-fotos-arriba-y-horarios. Update Purpose after archive.
## Requirements
### Requirement: Horarios disponibles visibles
La ficha del proveedor en la app de usuarios **SHALL** mostrar los horarios semanales configurados por el proveedor para atención de servicios.

#### Scenario: Proveedor con horarios configurados
- GIVEN un proveedor con horarios semanales configurados (por día de semana)
- WHEN el usuario abre la ficha del proveedor
- THEN ve una sección “Horarios disponibles” después de “Especialidad en Marcas”
- AND se muestra por día si está activo y su rango horario (inicio/fin)

#### Scenario: Proveedor sin horarios configurados
- GIVEN un proveedor sin horarios configurados
- WHEN el usuario abre la ficha del proveedor
- THEN la sección “Horarios disponibles” muestra un estado informativo (por ejemplo: “Horarios no disponibles”)

