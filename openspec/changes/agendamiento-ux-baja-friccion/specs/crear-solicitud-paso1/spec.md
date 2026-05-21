# crear-solicitud-paso1

## Requirements

### REQ-PASO1-SIN-DESGASTE-DUPLICADO
En el paso 1 de `FormularioSolicitud`, la app **SHALL NOT** mostrar el rail «Recomendaciones según desgaste» si esa información ya se expone en `UserPanelScreen` (`HomeHealthServicesRow`).

### REQ-PASO1-CATALOGO-RESUMEN
Flujo catálogo proveedor **SHALL** usar `SolicitudCatalogContextBanner`: proveedor + servicio + precio total, sin desglose IVA en paso 1.

### REQ-PASO1-SERVICIOS-GRILLA
Selector de servicios **SHALL** mostrarse en grilla de 2 columnas con nombre, descripción, precio y duración por card.
