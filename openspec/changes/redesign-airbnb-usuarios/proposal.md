# Propuesta: Rediseño total UX/UI — patrón Airbnb

## Why

La app de usuarios acumula estilos mezclados (Coinbase, dark glass, gradientes, hex hardcodeados en ~100 archivos), tres familias de iconos, 40 componentes Card distintos, pantallas legacy huérfanas y un marketplace público que no corresponde al job-to-be-done principal (mantener el auto, agendar servicios, transferir historial al nuevo dueño).

Queremos un rediseño **completo y consistente** en el 100% de las interfaces, con patrón visual tipo Airbnb (limpio, minimalista, una decisión por pantalla), nueva paleta de colores y reestructura de navegación a 4 tabs.

## What Changes

### Design system
- Nueva paleta: Text `#030a1d`, Background `#f2f6fe`, Primary `#205ae9`, Secondary `#a983f3`, Accent `#b55aef`
- Tipografía Poppins con escala h1–h6
- Eliminar glass, gradientes y aliases Coinbase
- Primitivos base reescritos + 8 cards de dominio + 2 headers (AppHeader, FlowHeader)

### Navegación (4 tabs)
- **Inicio** — vehículo, salud, descubrimiento reducido
- **Agendar** — botón central, wizard único
- **Actividad** — inbox unificado (solicitudes + citas + chats)
- **Cuenta** — perfil, pagos, soporte

### Eliminaciones
- Marketplace público: `MarketplaceScreen`, `SellVehicleScreen`, `MarketplaceVehicleDetailScreen`, modals/filtros marketplace
- Legacy booking: `CarritoScreen`, `DateTimePickerScreen`, `BookingCartScreen`, `BookingConfirmationScreen`
- Legacy explore: `TalleresScreen`, `MecanicosScreen`
- Huérfanas: `MisCitasScreen`, `ServicesScreen`, `CategoryServicesListScreen`, `OffersListScreen`, `SeleccionarServiciosScreen`, `SeleccionarProveedoresScreen`
- Carpeta `components/cards/` legacy

### Conservado (solo rediseño visual)
- Flujo solicitud → comparador → pago → confirmación
- Salud vehículo, valorización, historial
- Transferencia QR (`TransferenciaVendedor`, `TransferenciaComprador`, `TransferenciaExito`) — entrada desde ficha del vehículo
- ExploreProviders, ProviderDetail, registrar viaje GPS (desde ficha vehículo)

## Non-goals
- Sin cambios de backend/APIs
- Sin alterar lógica de matching proveedores, comparador IA ni pagos MercadoPago

## Alcance
`mecanimovil-usuarios/app/**` — todas las screens y componentes sin excepción.

## Reemplaza
- `openspec/changes/design-system-coinbase-usuarios/` (obsoleto, archivar al completar)
