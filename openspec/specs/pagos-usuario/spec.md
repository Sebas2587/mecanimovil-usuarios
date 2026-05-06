# pagos-usuario Specification

## Purpose
Flujo de pago del usuario al completarse una orden. El usuario paga mediante
MercadoPago (tarjeta, MP wallet, etc.) de forma integrada en la app.

## Requirements

### Requirement: Pago al completar orden
Al completarse una orden, el usuario recibe la solicitud de pago.

#### Scenario: Usuario recibe solicitud de pago
- GIVEN una orden en estado=completada
- CUANDO el usuario abre el detalle de la orden
- THEN ve el monto a pagar y botón "Pagar ahora"

#### Scenario: Pago completado exitosamente
- GIVEN el usuario seleccionó método de pago y confirmó en MercadoPago
- CUANDO MP devuelve status=approved
- THEN la app muestra pantalla de confirmación "Pago realizado"
- AND la orden queda registrada como pagada

#### Scenario: Pago rechazado
- GIVEN el pago fue rechazado por MP (fondos insuficientes, tarjeta inválida, etc.)
- CUANDO MP devuelve status=rejected
- THEN el usuario ve mensaje de error con el motivo
- AND puede reintentar con otro método de pago

### Requirement: Historial de pagos
El usuario puede ver todos sus pagos realizados.

#### Scenario: Ver historial de pagos
- GIVEN un usuario con pagos realizados
- CUANDO accede a "Mis pagos"
- THEN ve lista con: fecha, servicio, proveedor, monto y estado del pago
