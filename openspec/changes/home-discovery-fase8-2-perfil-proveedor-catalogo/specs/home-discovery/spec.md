# home-discovery — Perfil proveedor catálogo

### REQ-PROVIDER-CATALOG-PRICE
Cada servicio del perfil **SHALL** mostrar `precio_publicado_cliente` o precios con/sin repuestos cuando existan en la oferta del proveedor.

### REQ-PROVIDER-CATALOG-SCHEDULE
Al tocar un servicio con vehículo seleccionado, la app **SHALL** navegar a `CREAR_SOLICITUD` con `flujoCatalogoProveedor`, proveedor y servicio preseleccionados.

### REQ-PROVIDER-CATALOG-CONFIRM
Al enviar el formulario en flujo catálogo, la app **SHALL** llamar `POST .../confirmar-candidato/` (oferta `origen=catalogo`) en lugar de publicar solicitud abierta sin oferta.

### REQ-PROVIDER-CATALOG-UX
El paso 1 del formulario **SHALL NOT** mostrar selector de servicios ni proveedores; solo resumen, ubicación y fecha.

### REQ-PROVIDER-CATALOG-CALENDAR
Tras ubicación/detalles en flujo catálogo, el calendario **SHALL** recibir `agendaContext`
(`tipoProveedor`, `proveedorEntityId`, `ofertaServicioId`) igual que el flujo normal.

Ver: `openspec/specs/agendamiento-calendario-proveedor/spec.md`.
