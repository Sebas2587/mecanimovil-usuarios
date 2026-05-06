# notificaciones Specification

## Purpose
Gestión de notificaciones push en la app del usuario. Cubre registro del token,
permisos del dispositivo y recepción de notificaciones de eventos del sistema.

## Requirements

### Requirement: Solicitar permisos de notificaciones
La app solicita permiso para enviar notificaciones al usuario.

#### Scenario: Usuario concede permiso
- GIVEN la app se abre por primera vez o al iniciar sesión
- CUANDO se solicita el permiso de notificaciones
- THEN el usuario ve el diálogo nativo del sistema
- AND al aceptar, el Expo push token se registra en el backend

#### Scenario: Usuario rechaza permiso
- GIVEN el usuario rechazó las notificaciones
- CUANDO la app intenta registrar el token
- THEN no se envía ningún token al backend
- AND la app funciona normalmente sin notificaciones push

### Requirement: Recibir notificaciones de eventos clave
El usuario recibe notificaciones automáticas sobre su solicitud/orden.

#### Scenario: Notificación cuando proveedor acepta solicitud
- GIVEN una solicitud pendiente del usuario
- CUANDO el proveedor la acepta
- THEN el usuario recibe push: "Un proveedor aceptó tu solicitud"
- AND al tapear, navega al seguimiento de la orden

#### Scenario: Notificación cuando orden es completada
- GIVEN una orden en_progreso
- CUANDO el proveedor la marca como completada
- THEN el usuario recibe push: "Tu servicio fue completado. ¡Califica al proveedor!"
- AND al tapear, navega al detalle de la orden con opción de pago/calificación
