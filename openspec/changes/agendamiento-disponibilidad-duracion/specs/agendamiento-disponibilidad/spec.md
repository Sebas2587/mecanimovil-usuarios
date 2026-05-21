# agendamiento-disponibilidad (change)

> Spec canónica actualizada: `openspec/specs/agendamiento-calendario-proveedor/spec.md`

## Requirements

### REQ-CALENDARIO-PROVEEDOR
Tras seleccionar un proveedor en el flujo de nueva solicitud (paso de proveedores, **perfil catálogo** o comparador), la app **SHALL** abrir `CalendarioProveedorScreen` antes de continuar, usando `buildAgendaContext`.

### REQ-SLOTS-DURACION
Los horarios mostrados **SHALL** provenir de `disponibilidad_con_duracion/` con `oferta_servicio_id` cuando exista oferta, y mostrar `hora_fin_estimada`.

### REQ-AGENDA-MISMO-CRITERIO-PERFIL
El calendario desde perfil **SHALL** usar las mismas APIs y parámetros que el flujo normal (tipo + entidad + oferta).

### REQ-ESTADO-OCUPADO
Si el proveedor está en servicio, la pantalla **SHALL** mostrar badge con hora estimada de liberación.
