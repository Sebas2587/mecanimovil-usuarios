# screen-redesign Specification (delta)

Matriz pantalla → plantilla → estado. Toda pantalla en `app/screens/**` sin excepción.

## ADDED Requirements

### Requirement: Plantilla por pantalla
Cada pantalla **SHALL** implementar exactamente una plantilla: Hub, Wizard, Listing, Detail, ListForm, Focus.

#### Scenario: Cobertura completa
- GIVEN el inventario de 58 pantallas en app/screens
- WHEN se completa el rediseño
- THEN cada pantalla usa tokens Airbnb, Lucide, y su plantilla asignada

### Requirement: Matriz de pantallas

| Pantalla | Plantilla | Notas |
|----------|-----------|-------|
| UserPanelScreen | Hub | Reducido: vehículo, salud, 6 categorías, 1 rail, actividad |
| ActividadScreen | Hub | Nueva — inbox unificado |
| UserProfileScreen | Hub | Menú cuenta |
| LoginScreen | Focus | |
| RegisterScreen | Focus | |
| OnboardingScreen | Focus | |
| CrearSolicitudScreen | Wizard | FlowHeader + StickyFooterCTA |
| CalendarioProveedorScreen | Wizard | |
| ComparadorOfertasScreen | Wizard | |
| OpcionesPagoScreen | Wizard | |
| ConfirmacionScreen | Focus | |
| ExploreProvidersScreen | Listing | ProviderCard full-width |
| ProviderDetailScreen | Detail | Galería + CTA sticky |
| PublicProviderDetailScreen | Detail | Modo guest |
| ProviderReviewsScreen | ListForm | |
| MisVehiculosScreen | ListForm | Fusionado visual con Inicio |
| VehicleProfileScreen | Detail | + entrada transferencia |
| VehicleHealthScreen | Detail | Resumen + 3 alertas + detalle técnico |
| VehicleHistoryScreen | ListForm | Timeline |
| VehicleRegistrationScreen | ListForm | |
| AddAddressScreen | ListForm | |
| VehicleProvidersScreen | Listing | |
| MisSolicitudesScreen | ListForm | Absorbido en Actividad o redirect |
| DetalleSolicitudScreen | Detail | |
| ChatsListScreen | ListForm | Absorbido en Actividad |
| ChatDetailScreen | Detail | |
| ActiveAppointmentsScreen | ListForm | Absorbido en Actividad |
| AppointmentDetailScreen | Detail | |
| ServiceHistoryScreen | ListForm | |
| EditProfileScreen | ListForm | |
| FavoriteProvidersScreen | Listing | |
| PendingReviewsScreen | ListForm | |
| CreateReviewScreen | ListForm | |
| HistorialPagosScreen | ListForm | |
| SupportScreen | ListForm | |
| TermsScreen | ListForm | |
| PrivacyPolicyScreen | ListForm | |
| NotificationCenterScreen | ListForm | |
| RegistrarViajeScreen | Focus | Desde ficha vehículo |
| TransferenciaVendedorScreen | Focus | |
| TransferenciaCompradorScreen | Focus | |
| TransferenciaExitoScreen | Focus | |
| MercadoPagoWebViewScreen | Focus | Modal |
| PaymentCallbackScreen | Focus | |

Pantallas **REMOVED** (no rediseñar): MarketplaceScreen, SellVehicleScreen, MarketplaceVehicleDetailScreen, TalleresScreen, MecanicosScreen, CarritoScreen, DateTimePickerScreen, BookingCartScreen, BookingConfirmationScreen, ServicesScreen, CategoryServicesListScreen, OffersListScreen, SeleccionarServiciosScreen, SeleccionarProveedoresScreen, MisCitasScreen, AgendarTabScreen (placeholder).

### Requirement: Home simplificado
UserPanelScreen **SHALL NOT** mostrar: clima duplicado, trending services row, quick action venta/GPS, múltiples rails Para ti + Cerca simultáneos (máximo 1 rail descubrimiento).

#### Scenario: Home commuter
- GIVEN usuario con un vehículo registrado
- WHEN abre Inicio
- THEN ve salud, próximo servicio sugerido, hasta 6 categorías, un rail de proveedores, y actividad reciente en un scroll corto

### Requirement: Estados vacíos y carga
Toda pantalla Hub/Listing **SHALL** incluir EmptyState y Skeleton alineados a tokens.

#### Scenario: Sin vehículos
- GIVEN usuario sin vehículos
- WHEN abre Inicio
- THEN EmptyState con CTA "Agregar vehículo"
