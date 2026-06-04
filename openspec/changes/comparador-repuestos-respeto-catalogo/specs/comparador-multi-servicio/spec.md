# comparador-multi-servicio — delta repuestos y catálogo

## ADDED Requirements

### Requirement: Cards muestran configuración real por servicio
`CandidatoProveedorBookingCard` SHALL listar cada entrada de `servicios_ofrecidos` con nombre y
`precio` del backend. Cuando `incluye_repuestos_efectivo` es true para una línea, MAY mostrar
leyenda «Con repuestos» junto al precio de ese servicio.

El total estimado SHALL ser la suma de `servicios_ofrecidos[].precio` (o `precio_total` coherente).

#### Scenario: Multi-servicio con un ítem solo MO y otro con repuestos obligatorios
- GIVEN el cliente pidió solo mano de obra
- AND el candidato tiene dos líneas en `servicios_ofrecidos`
- WHEN se renderiza la card
- THEN cada servicio muestra su precio
- AND el total es la suma de ambos precios efectivos

### Requirement: Badges de desajuste
Si el cliente pidió solo MO y algún servicio del proveedor exige repuestos en catálogo
(`requiere_repuestos_obligatorio`), la card SHALL mostrar badge «Catálogo: incluye repuestos»
sin ocultar repuestos ni precios del desglose efectivo.
