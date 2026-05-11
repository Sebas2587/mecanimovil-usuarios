# pagos-usuario Specification (delta)

## MODIFIED Requirements

### Requirement: Pago al completar orden
Al completarse una orden, el usuario recibe la solicitud de pago. La pantalla de método de pago **SHALL** presentar la UI alineada al design system Coinbase de la app usuarios (tokens, canvas claro, CTAs sólidos) **sin** alterar los flujos de pago existentes.

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

#### Scenario: Estilo de pantalla de pago
- GIVEN el usuario está en la pantalla de opciones de pago (`OpcionesPagoScreen`)
- WHEN se renderiza la interfaz
- THEN los colores y espaciados provienen de los tokens del tema (sin fondo oscuro tipo glass por defecto)
- AND los botones de acción principal usan estilo sólido alineado al design system
- AND el comportamiento (navegación, validaciones, integración MP/WhatsApp) es el mismo que antes del cambio visual
