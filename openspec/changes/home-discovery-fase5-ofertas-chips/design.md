# Diseño — Fase 5 chips de ofertas

## API
- `GET .../talleres|cerca|proveedores_filtrados/?include_panel_servicios=true`
- Respuesta por proveedor: `panel_servicios: [{ servicio_id, oferta_id, nombre, precio, precio_publicado_cliente, tipo_servicio }]`
- Filtro de marca en ofertas: `marca_vehiculo_seleccionada` coincide o es null.
- Orden: precio ascendente; máximo 3 servicios distintos por proveedor.

## UI (Coinbase-light)
- Chips: fondo `gray[100]`, hairline `border.light`, precio en mono + `primary[600]`.
- Si hay chips, sustituyen la línea de especialidad genérica en la card.
- Scroll horizontal anidado en carrusel del home.

## Archivos
- `ProviderServiceChipsRow.js`, `ProviderPreviewCard.js`
- `providers.js` → `PANEL_SERVICIOS_QUERY`
- `HomeProvidersCarouselSection`, `ExploreProvidersGrid`
