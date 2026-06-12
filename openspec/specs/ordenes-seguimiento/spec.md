# ordenes-seguimiento Specification

## Purpose
Pantalla de seguimiento de una orden activa. El usuario sigue el estado en tiempo
real, ve los datos del proveedor asignado y puede comunicarse por WebSocket.

## Requirements

### Requirement: Ver estado de la orden en tiempo real
El usuario SHALL seguir el avance de su orden desde que es confirmada hasta completada.

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
El usuario SHALL poder enviar mensajes al proveedor durante la orden.

#### Scenario: Usuario envía mensaje al proveedor
- GIVEN una orden activa con WebSocket conectado
- CUANDO el usuario escribe y envía un mensaje
- THEN el proveedor recibe el mensaje en tiempo real en su app

### Requirement: Historial de órdenes completadas
El usuario SHALL poder ver el historial de servicios pasados.

#### Scenario: Ver historial de órdenes
- GIVEN un usuario con órdenes completadas
- CUANDO accede a "Mis órdenes" o "Historial"
- THEN ve lista paginada: fecha, servicio, proveedor, monto y estado final

#### Scenario: Calificar al proveedor
- GIVEN una orden recién completada
- CUANDO el usuario abre el detalle de esa orden
- THEN puede dejar una calificación (1-5 estrellas) y comentario
- AND solo puede calificar una vez por orden

### Requirement: Checklist con evidencias fotográficas legibles
El informe de checklist que ve el cliente SHALL mostrar cada foto de evidencia con su URL absoluta cargable y el texto de descripción asociado que registró el técnico.

#### Scenario: Evidencia almacenada en R2 o media relativa
- GIVEN un ítem de checklist tipo PHOTO con al menos una foto en `fotos`
- AND la API entrega `imagen_url` absoluta o ruta relativa bajo `/media/`
- WHEN el cliente abre el checklist desde detalle de solicitud
- THEN ve la imagen renderizada y la descripción de cada evidencia
- AND no ve solo el texto «N foto(s) de evidencia» sin imágenes

### Requirement: Aviso de pago de mano de obra antes de cerrar servicio
Cuando el cliente pagó solo repuestos y el checklist del servicio ya está disponible, la app SHALL informar en detalle de solicitud que debe pagar el saldo de mano de obra antes de firmar y cerrar el servicio.

#### Scenario: Repuestos pagados, checklist listo, mano de obra pendiente
- GIVEN una oferta con `estado_pago_repuestos=pagado` y mano de obra pendiente
- AND el checklist del servicio está visible para el cliente
- WHEN el usuario abre el detalle de la solicitud
- THEN ve un aviso destacado con el monto del saldo de mano de obra
- AND un acceso directo para ir a pagar
- AND no ve el CTA de firma del cliente hasta completar ese pago
