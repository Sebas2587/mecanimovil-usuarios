# home-discovery Specification (delta)

## ADDED Requirements

### Requirement: Composición modular del home
La pantalla principal del usuario (`UserPanelScreen`) **SHALL** delegar bloques de UI reutilizables a componentes en `app/components/home/discovery/`, manteniendo en la pantalla solo orquestación de datos, navegación y modales transversales.

#### Scenario: Misma experiencia tras refactor
- GIVEN un usuario con vehículo, dirección y proveedores cercanos
- WHEN abre el tab Home
- THEN ve saludo, ubicación, selector de vehículo, acciones rápidas, bloque «Cerca de ti» y «Qué piden otros con tu mismo auto» con el mismo contenido que antes del refactor

### Requirement: Secciones de descubrimiento encapsuladas
Los bloques «Cerca de ti» y demanda de mercado **SHALL** implementarse como componentes dedicados que reciben datos ya resueltos por la pantalla (loading, vacío, lista) y no duplican llamadas API internas.

#### Scenario: Cerca de ti sin dirección
- GIVEN un usuario sin dirección seleccionada
- WHEN se renderiza la sección de proveedores cercanos
- THEN se muestra el mensaje para agregar o seleccionar dirección

### Requirement: Design system en componentes nuevos
Los componentes nuevos del home **SHALL** usar tokens de `app/design-system/tokens` y no introducir colores hex sueltos salvo los ya definidos en utilidades compartidas (p. ej. KPI en `providerUtils`).

#### Scenario: Card de panel
- GIVEN cualquier card del home discovery
- WHEN se renderiza
- THEN usa `HomePanelCard` o tokens equivalentes (paper, hairline, sombra suave)
