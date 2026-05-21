# Detalle de solicitud — multi-servicio

## Contexto

Cuando el cliente crea una solicitud con varios servicios (flujo desde cero o comparador catálogo), el detalle debe reflejar todos los servicios y, si hay oferta de catálogo con varias líneas, el desglose por servicio y total.

## Requisitos

### Resumen de solicitud (`ServiceSummaryCard`)

- SHALL listar todos los ítems de `servicios_solicitados_detail` (fallback `servicios_solicitados`).
- Título: un nombre si hay uno; si hay varios, texto tipo «N servicios solicitados».
- Si `oferta_seleccionada_detail.detalles_servicios` tiene más de una línea, SHALL mostrar precio por servicio y total de la oferta.

### Oferta en detalle (`OfferCardDetailed`)

- SHALL usar `detalles_servicios` de la oferta para listar nombre y `precio_servicio` por línea.
- Fallback: servicios de la solicitud sin precio.
- Desglose IVA/total sigue a nivel oferta (`precio_total_ofrecido`).

### Listado (`SolicitudCard`)

- SHALL mostrar todos los nombres (hasta 4 visibles + «y N más»), no solo los dos primeros.

### Utilidad

- `app/utils/solicitudServicios.js`: `resolveServiciosSolicitud`, `formatServiciosTitulo`, `formatServiciosListaTexto`, `resolveLineasServicioOferta`.

## API (sin cambios de contrato)

`GET /ordenes/solicitudes-publicas/{id}/` ya expone `servicios_solicitados_detail` y `oferta_seleccionada_detail.detalles_servicios`.
