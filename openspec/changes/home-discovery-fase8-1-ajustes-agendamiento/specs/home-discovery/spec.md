# home-discovery — Fase 8.1

## Requirements

### REQ-HOME-MODEL-TRENDING
El home **SHALL** mostrar servicios más elegidos por otros usuarios del mismo modelo de vehículo (`actividad_mercado`), en lugar del rail de ofertas.

### REQ-HOME-QUICK-SCHEDULE
El home **SHALL** exponer un CTA de agendamiento rápido (no barra de búsqueda genérica) que abre el sheet de agendamiento asistido.

### REQ-SCHEDULE-FLOWS
- `agendamientoInteligente`: solicitud global → comparador IA; **MUST NOT** arrastrar proveedor preseleccionado.
- `fromProviderDetail` + servicio: solicitud dirigida al proveedor elegido en explorar/perfil.

### REQ-CATEGORY-SWIPE
Las categorías **SHALL** mostrarse en scroll horizontal con nombres completos.

### REQ-BANNER-SCHEDULE
El banner contextual **SHALL** dirigir al agendamiento inteligente sin CTA secundario a salud del vehículo.

### REQ-PROVIDER-SERVICE-PICK
En `ProviderDetailScreen`, cada servicio compatible **SHALL** permitir agendar con proveedor y servicio preseleccionados.
