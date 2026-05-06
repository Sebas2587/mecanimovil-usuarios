# ordenes-seguimiento Specification

## Purpose
Pantalla de seguimiento de una orden activa. El usuario sigue el estado en tiempo
real, ve los datos del proveedor asignado y puede comunicarse por WebSocket.

## Requirements

### Requirement: Ver estado de la orden en tiempo real
El usuario sigue el avance de su orden desde que es confirmada hasta completada.

#### Scenario: Orden confirmada visible
- GIVEN una solicitud aceptada que generó una orden
- CUANDO el usuario abre el seguimiento
- THEN ve el estado actual (confirmada/en_progreso/completada)
- AND los datos del proveedor asignado (nombre, foto, calificación)

#### Scenario: Actualización de estado en tiempo real
- GIVEN una orden en seguimiento con WebSocket activo
- CUANDO el proveedor cambia el estado a en_progreso
- THEN la pantalla del usuario actualiza el estado sin necesidad de refrescar

### Requirement: Comunicación en tiempo real
El usuario puede enviar mensajes al proveedor durante la orden.

#### Scenario: Usuario envía mensaje al proveedor
- GIVEN una orden activa con WebSocket conectado
- CUANDO el usuario escribe y envía un mensaje
- THEN el proveedor recibe el mensaje en tiempo real en su app

### Requirement: Historial de órdenes completadas
El usuario puede ver el historial de servicios pasados.

#### Scenario: Ver historial de órdenes
- GIVEN un usuario con órdenes completadas
- CUANDO accede a "Mis órdenes" o "Historial"
- THEN ve lista paginada: fecha, servicio, proveedor, monto y estado final

#### Scenario: Calificar al proveedor
- GIVEN una orden recién completada
- CUANDO el usuario abre el detalle de esa orden
- THEN puede dejar una calificación (1-5 estrellas) y comentario
- AND solo puede calificar una vez por orden
