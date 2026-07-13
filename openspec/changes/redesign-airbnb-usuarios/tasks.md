# Tasks — Rediseño Airbnb Usuarios

## Fase 0 — Specs
- [x] proposal.md, design.md, .openspec.yaml
- [x] specs/design-system/spec.md
- [x] specs/component-library/spec.md
- [x] specs/navigation-ia/spec.md
- [x] specs/screen-redesign/spec.md
- [x] specs/vehicle-transfer/spec.md

## Fase 1 — Tokens
- [x] Instalar @expo-google-fonts/poppins + cargar en App.js
- [x] Reescribir colors.js (paleta nueva, sin glass/gradients)
- [x] Reescribir typography.js (Poppins h1–h6)
- [x] Actualizar shadows.js
- [x] ThemeProvider / useTheme

## Fase 2 — Component library
- [x] Button, Input, Card, Tag, Badge
- [x] BottomSheet, ListItem, EmptyState, SectionHeader, StickyFooterCTA
- [x] AppHeader, FlowHeader
- [x] 8 domain cards
- [x] Icon.js Lucide-only con legacy map

## Fase 3 — Navegación
- [x] AppNavigator: 4 tabs
- [x] ActividadScreen
- [x] Eliminar rutas marketplace/legacy del navigator
- [x] ConfirmacionScreen → ACTIVIDAD
- [x] ROUTES.ACTIVIDAD

## Fase 4 — Pantallas
- [x] Auth + Onboarding
- [x] Inicio UserPanelScreen simplificado
- [x] Wizard Agendar
- [x] ExploreProviders + ProviderDetail + Reviews
- [x] Vehículo (MisVehiculos, VehicleProfile, Health, History)
- [x] Actividad + DetalleSolicitud + AppointmentDetail + ChatDetail
- [x] Cuenta (perfil, pagos, favoritos, reviews, support, legal)
- [x] Transferencia (3 pantallas Focus)

## Fase 5 — Verificación
- [x] Spec canónica design-system actualizada
- [x] Archivado design-system-coinbase-usuarios
- [x] home-discovery / registrar-viaje-gps / perfil-usuario actualizados
- [x] Home limpio (sin clima/trending/GPS/venta)
- [x] Cards legacy eliminadas; 8 domain cards
- [x] Input sin darkGlass; RatingStars
- [x] Pantallas activas sin @expo/vector-icons
- [x] Legacy marketplace/booking eliminados (screens + BookingCartContext + componentes)
- [x] Gate hex/rgba: 0 fuera de design-system en app/screens + app/components + utils/nav/services
- [x] Navegación 4 tabs; sin rutas rotas a pantallas eliminadas
- [x] Wizard internos (FormularioSolicitud, ComparadorOfertas, OfertaCard) en tokens
- [x] Transferencia Focus + entrada desde VehicleProfile
- [x] Fix bundling: rutas de import rotas (AppHeader/FlowHeader design-system depth) + imports mal insertados (AddressSuggestions/ServiceDetailModal)
- [x] Unificación COLORS: 0 archivos mezclando shim legacy `utils/constants` con `design-system/tokens`
- [x] Gate tipografía global: plugin Babel `autoPoppinsFontFamily` inyecta `fontFamily` Poppins correcto en TODO estilo con `fontWeight` sin family explícito (retroactivo a ~150 archivos + a prueba de futuro)

## Fase 7 — Paleta Tinder + cards Airbnb + patrimonio por vehículo
- [x] Paleta canónica en `colors.js`: primary `#fe3c72`, secondary `#fd5564`, accent `#ef4a75`, ink `#424242`, canvas `#ffffff`, soft tint `#fff0f4`
- [x] `shadows.js` alineado a ink `#424242` y focus primary rosa
- [x] Summary row Airbnb: `SummaryActionCard` + `HomeQuickActions` + `ActivityCard` (icono monocromo, hairline, sin sombra fuerte)
- [x] Vehicle listing Airbnb: `VehicleListingCard` en Mis vehículos (salud % badge + valor · km → `VehicleProfile`)
- [x] `VehicleValuationCard` con enlace salud↔valor y tokens brand; `QuickActionGrid` en summary row
- [x] Legacy cards auditadas: `HomePanelCard`, `PatrimonyCard`, `GlassCard` (FormularioSolicitud) sin sombra fuerte
- [x] Gate hex: 0 fuera de design-system; babel-parse archivos tocados OK

## Fase 6 — Provider discovery + salud (spec `provider-discovery`)
- [x] SegmentedControl base único; migrados Actividad, Explore tabs/modo, DetalleSolicitud, MisSolicitudes (2 niveles), VehicleProviders
- [x] HomeContextualBanner rediseñado (fila icono tonal + texto + chevron, card presionable)
- [x] ProviderPreviewCard con tags modalidad (en_taller/a_domicilio/ambas) + Especialista {Marca}/Multimarca (helper providerBrandCoverage.js, Tag variant secondary)
- [x] Grid responsivo 2 columnas en Explore (cols = max(2, floor(ancho/220))) y rails del home
- [x] Destacados: matching por marca del vehículo (especialistas primero, multimarca con cobertura vía coversBrand)
- [x] Destacados pipeline canónico `utils/destacadosMatching.js` (brandEligible → rank → localizeSoft → limit); fetch sin `solo_especialistas`; empty copy Airbnb
- [x] ProviderDetail + PublicProviderDetail sin imágenes stock Unsplash; layout Airbnb (título h2, métricas ★·reseñas·servicios, secciones hairline, CTA sticky)
- [x] Cards de mecánicos estilo host Airbnb (avatar 56pt, pills máx 2 + "+N")
- [x] VehicleHealth: hero % h1 + Prioridades (≤3 filas, Agendar 1 tap con servicio preseleccionado) + filtros SegmentedControl + filas limpias
- [x] VehicleValuationCard: valorización + depreciación estimada (7%/año informativo) + Button compartido, visible en VehicleProfile
- [x] Gate unsplash: 0 imágenes stock en toda la app (MisVehiculos → placeholder Car, OfferCardDetailed → avatar con inicial, HomeVehicleCard huérfano eliminado)
- [x] Verificación: 124 archivos babel-parse OK, 0 hex/rgba fuera de design-system, bundle web Metro HTTP 200