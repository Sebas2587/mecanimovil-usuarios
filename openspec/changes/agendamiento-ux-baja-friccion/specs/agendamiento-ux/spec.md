# agendamiento-ux

## Requirements

### REQ-TICKET-RESUMEN
Cuando `fecha_preferida` proviene de `CalendarioProveedorScreen`, el paso final del formulario **SHALL** mostrar `SolicitudResumenTicket` (vehículo, servicio, proveedor si aplica, fecha/hora, dirección) en lugar del selector genérico de fecha.

### REQ-CALENDARIO-COPY
`CalendarioProveedorScreen` **SHALL** indicar que el horario es preferido y que el proveedor lo confirma al responder.

### REQ-ANTI-DUPLICADO
Antes de avanzar desde el paso de vehículo/servicio, si hay `vehiculo_id` y `servicio_ids`, la app **SHALL** llamar `verificar-servicio-activo` y **SHALL** bloquear el flujo con mensaje accionable si `bloqueado` es true.

### REQ-ANTI-DUPLICADO-BACKEND
Al crear solicitud pública, el backend **SHALL** rechazar duplicados activos (mismo cliente, vehículo, servicio en pipeline activo) con el mismo criterio que el endpoint de verificación.
