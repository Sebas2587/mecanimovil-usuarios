# navigation-ia Specification (delta)

## ADDED Requirements

### Requirement: Cuatro tabs principales
El TabNavigator **SHALL** exponer exactamente: Inicio, Agendar (acción central), Actividad, Cuenta.

#### Scenario: Tab bar visible autenticado
- GIVEN usuario autenticado en TabNavigator
- WHEN se muestra el tab bar
- THEN hay 4 destinos y no existe tab Marketplace ni Mis Autos

#### Scenario: Agendar central
- GIVEN el usuario toca el tab Agendar
- WHEN no hay bloqueo de flujo
- THEN navega a CrearSolicitud con vehículo preseleccionado si existe

### Requirement: Actividad unificada
El tab Actividad **SHALL** combinar solicitudes activas, citas confirmadas y mensajes en segmentos dentro de una pantalla Hub.

#### Scenario: Ver solicitud desde Actividad
- GIVEN una solicitud activa
- WHEN el usuario toca la fila en Actividad
- THEN navega a DetalleSolicitud sin cambiar de tab root

### Requirement: Rutas eliminadas
Las rutas **SHALL NOT** registrarse en AppNavigator: MarketplaceScreen, SellVehicleScreen, MarketplaceVehicleDetailScreen, TalleresScreen, MecanicosScreen, CarritoScreen, DateTimePickerScreen, BookingCartScreen, BookingConfirmationScreen, ServicesScreen, CategoryServicesListScreen, OffersListScreen, SeleccionarServiciosScreen, SeleccionarProveedoresScreen, MisCitasScreen.

#### Scenario: Confirmación post-pago
- GIVEN pago exitoso en ConfirmacionScreen
- WHEN el usuario elige ver citas
- THEN navega a ACTIVE_APPOINTMENTS, no a MisCitas

#### Scenario: Explorar talleres legacy
- GIVEN código que navegaba a TALLERES o MECANICOS
- WHEN se ejecuta navegación equivalente
- THEN abre ExploreProvidersScreen con tab inicial apropiado

### Requirement: Transferencia desde ficha vehículo
La entrada a transferencia **SHALL** ser únicamente VehicleProfile → Transferir vehículo.

#### Scenario: Sin tab marketplace
- GIVEN usuario en tab Inicio
- WHEN busca transferir su auto
- THEN debe ir a ficha del vehículo; no hay acceso directo desde tab bar a marketplace

### Requirement: Registrar viaje secundario
Registrar viaje GPS **SHALL** accederse desde VehicleProfile o VehicleHealth, no desde quick actions del home.

#### Scenario: Home sin quick action GPS
- GIVEN UserPanelScreen
- WHEN se renderizan accesos rápidos
- THEN no incluye "Registrar viaje" ni "Gestionar venta"
