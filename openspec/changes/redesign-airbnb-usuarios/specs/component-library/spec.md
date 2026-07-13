# component-library Specification (delta)

## ADDED Requirements

### Requirement: Primitivos base con tokens
Los componentes en `app/components/base/` **SHALL** consumir exclusivamente tokens y no contener hex hardcodeados.

#### Scenario: Button primario
- GIVEN `<Button type="primary" />`
- WHEN se renderiza
- THEN altura mínima 48, radius 12, fondo primary.500, texto blanco, fuente button (Poppins SemiBold 15)

#### Scenario: Button sin gradiente
- GIVEN cualquier variante de Button
- WHEN se renderiza
- THEN no usa LinearGradient ni prop useGradient

#### Scenario: Input sin darkGlass
- GIVEN `<Input />`
- WHEN se renderiza en flujo normal
- THEN appearance es light: fondo paper, borde border.light, sin glass

### Requirement: Tag y Badge unificados
La app **SHALL** exponer `Tag` (pill, 13px caption) y `Badge` (estados semánticos) como únicos chips de estado.

#### Scenario: Tag de especialista
- GIVEN un proveedor especialista en marca del usuario
- WHEN ProviderCard muestra modalidad
- THEN usa Tag con fondo primary.50 y texto primary.600

### Requirement: BottomSheet como modal estándar
Filtros, selectores de vehículo y dirección **SHALL** usar `BottomSheet` con handle, radius superior 24, fondo paper.

#### Scenario: Filtros en ExploreProviders
- GIVEN el usuario toca filtros
- WHEN se abre el panel
- THEN es BottomSheet, no Modal fullscreen legacy

### Requirement: Headers duales
Solo dos headers globales: `AppHeader` (stack) y `FlowHeader` (wizard).

#### Scenario: Wizard CrearSolicitud
- GIVEN el flujo de nueva solicitud
- WHEN se muestra un paso
- THEN usa FlowHeader con barra de progreso y StickyFooterCTA abajo

### Requirement: Ocho cards de dominio
Toda UI de listado **SHALL** usar una de: ProviderCard, ServiceCard, VehicleCard, HealthCard, ActivityCard, OfferCard, HistoryItemCard, TransferCard.

#### Scenario: Listado proveedores
- GIVEN ExploreProvidersScreen
- WHEN se listan proveedores
- THEN cada ítem es ProviderCard con imagen arriba estilo Airbnb

### Requirement: Iconografía Lucide única
Componentes base y pantallas migradas **SHALL** usar solo `lucide-react-native`. El wrapper `Icon` en base **SHALL** delegar a Lucide.

#### Scenario: Tab bar
- GIVEN la barra inferior
- WHEN se renderizan iconos
- THEN son Lucide, color primary.500 activo y text.tertiary inactivo
