## ADDED Requirements

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
