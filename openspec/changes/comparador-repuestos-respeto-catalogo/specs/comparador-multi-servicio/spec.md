# comparador-multi-servicio — delta precio catálogo fiel

## ADDED Requirements

### Requirement: Cards sin adaptar precio a preferencia del cliente
`CandidatoProveedorBookingCard` SHALL usar `buildDesgloseCatalogoCandidato` y
`resolvePrecioTotalCandidato` sin alterar repuestos ni totales según «solo mano de obra» del paso 2.

Cada línea en `servicios_ofrecidos` SHALL mostrar el `precio` del API y leyenda «Con repuestos»
o «Solo mano de obra» según configuración del proveedor, no según preferencia del usuario.

#### Scenario: Usuario eligió solo MO
- GIVEN `requiereRepuestos=false` en el comparador
- AND proveedor publicó servicio con repuestos a $39.270
- WHEN se renderiza la card
- THEN el servicio muestra $39.270 y desglose con repuestos
- AND badge «Tu elección: Solo mano de obra» + «Catálogo: incluye repuestos» si aplica
