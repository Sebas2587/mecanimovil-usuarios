# agendamiento-disponibilidad

## Requirements

### REQ-CALENDARIO-PROVEEDOR
Tras seleccionar un proveedor en el flujo de nueva solicitud (paso de proveedores o comparador IA), la app **SHALL** abrir `CalendarioProveedorScreen` antes de continuar.

### REQ-SLOTS-DURACION
Los horarios mostrados **SHALL** provenir de `disponibilidad_con_duracion/` con `oferta_servicio_id` y mostrar fin estimado (`hora_fin_estimada`).

### REQ-ESTADO-OCUPADO
Si el proveedor está en servicio, la pantalla **SHALL** mostrar badge con hora estimada de liberación.
