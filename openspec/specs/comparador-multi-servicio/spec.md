# comparador-multi-servicio Specification

## Purpose
Cuando el cliente solicita **varios servicios** en una misma necesidad, el comparador de
proveedores debe mostrar qué servicios cubre cada proveedor y el **precio total** sumado.

## Requirements

### REQ-CANDIDATOS-MULTI-SERVICIO
GET `candidatos-proveedor` con varios `servicio_ids` SHALL agrupar ofertas por proveedor
(usuario) y devolver por candidato:

| Campo | Descripción |
|-------|-------------|
| `servicios_ofrecidos` | Lista `{ id, nombre, precio, oferta_servicio_id, desglose? }` |
| `precio_total` | Suma de precios de servicios cubiertos |
| `servicios_cubiertos` / `servicios_pedidos` | Conteo para badge de cobertura |
| `cobertura_pct` | Ratio 0–1 |
| `oferta_servicio_ids` | IDs para confirmar |
| `oferta_servicio_id` | Primera oferta (compatibilidad) |

El `score_match` SHALL bonificarse por cobertura completa (`0.6 + 0.4 * cobertura_pct`).

#### Scenario: Proveedor cubre 2 de 3 servicios
- GIVEN el cliente pidió servicios A, B y C
- AND el proveedor X tiene oferta para A y B
- WHEN consulta candidatos
- THEN la card de X lista A y B con precios
- AND `precio_total` es la suma de A + B
- AND muestra cobertura 2/3

### REQ-CARD-MULTI-SERVICIO
`CandidatosProveedorCard` SHALL listar cada servicio con precio cuando `servicios_ofrecidos.length > 1`
y mostrar total con leyenda «Total N servicios».

### REQ-CONFIRMAR-MULTI
POST `confirmar-candidato` SHALL aceptar `oferta_servicio_ids` (lista) además de
`oferta_servicio_id`. Todas las ofertas deben ser del mismo proveedor. Se crea una
`OfertaProveedor` con un `DetalleServicioOferta` por cada oferta y `precio_total_ofrecido` sumado.

## Archivos

| Repo | Archivo |
|------|---------|
| Backend | `motor_match.py`, `motor_confirmacion.py` |
| Usuarios | `CandidatosProveedorCard.js`, `agendamientoAsistidoService.js`, `ComparadorOfertasScreen.js` |
