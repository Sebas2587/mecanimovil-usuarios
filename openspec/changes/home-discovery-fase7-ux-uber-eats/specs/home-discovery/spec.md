# home-discovery — Fase 7

## Requirements

### REQ-HOME-FEED-ORDER
El `UserPanelScreen` **SHALL** renderizar discovery (header, búsqueda, categorías, rails de proveedores) antes del dashboard colapsable del vehículo.

### REQ-HOME-CATEGORY-GRID
Las categorías principales **SHALL** mostrarse como grilla con ícono y etiqueta, no solo chips de texto.

### REQ-HOME-RAILS
El home **SHALL** exponer al menos dos rails de proveedores con títulos distintos (destacados por KPI y cercanos por distancia), sin segmento compartido en el mismo bloque.

### REQ-HOME-OFFERS
Si existen proveedores con `panel_servicios` no vacío, el home **SHALL** mostrar un rail «Ofertas de hoy».

### REQ-HOME-BANNER
Cuando aplique solicitud activa, salud crítica o clima de alto riesgo, el home **SHALL** mostrar un único banner contextual con CTA.
