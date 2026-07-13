# provider-discovery Specification (delta)

Lógica de proveedores y su presentación Airbnb en descubrimiento (Destacados, Explore, Detail).

## ADDED Requirements

### Requirement: Modelo de proveedor unificado
Todos los proveedores **SHALL** tratarse como talleres con dos ejes de clasificación visibles en UI:
1. **Modalidad de atención**: `en_taller` | `a_domicilio` | `ambas` (helper canónico `utils/providerModalidad.js`).
2. **Cobertura de marca**: `especialista` (cubre la marca del vehículo del usuario) | `multimarca`.

#### Scenario: Tags en card de proveedor
- GIVEN un proveedor con modalidad `ambas` y especialista en Fiat, y el usuario tiene un Fiat
- WHEN se renderiza su card en Destacados o Explore
- THEN la card muestra tag de modalidad ("Taller y domicilio") y tag "Especialista Fiat" (o "Multimarca" si aplica), usando tokens: modalidad = pill neutra, especialista = pill `secondary[50]`/texto `secondary[700]`, multimarca = pill neutra

### Requirement: Card listing única (Airbnb Explore)
Todas las interfaces que listen proveedores o mecánicos de taller (Destacados, Cerca de ti, Explore, Favoritos, VehicleProviders) **SHALL** usar el mismo componente canónico `ProviderPreviewCard` (listing Airbnb): imagen dominante con radius + badge sobre foto + título/★ + meta gris. `cards/ProviderCard` es solo un alias de compatibilidad hacia ese componente. **SHALL NOT** coexistir cards con borde/sombra/chips densos en esos listados.

#### Scenario: Explore Cerca de ti
- GIVEN el usuario abre Explore en modo cerca
- WHEN ve la sección «Cerca de ti»
- THEN las cards son idénticas en anatomía a las de Destacados del home (misma tipografía, badge, meta), en grid 2 columnas

La sección Destacados del home **SHALL** mostrar proveedores compatibles con la marca del vehículo seleccionado (especialistas de esa marca **y** multimarca que la atienden). Modalidad (`en_taller` / `a_domicilio` / `ambas`) es elegible y se muestra como tag; no filtra el matching.

Pipeline canónico (`utils/destacadosMatching.js`):
1. **Fetch** por `vehiculo_id` sin `solo_especialistas` (backend: especialistas + multimarca de la marca).
2. **brandEligible** — `coversBrand`; nunca especialistas de otra marca.
3. **rankForBrand** — especialistas primero, luego multimarca; dentro de cada grupo orden KPI.
4. **localizeSoft** (solo scope `panel`) — preferir ciudad ∩ radar → ciudad → radar → todos elegibles (evita empty state artificial).
5. **takeLimit** — cupo del rail.

Roles vs «Cerca de ti»: Destacados = curado por marca (Airbnb "For you"); Cerca de ti = orden por distancia.

#### Scenario: Usuario con Fiat y solo multimarca cercanos
- GIVEN usuario con Fiat y dirección, y en zona solo hay talleres multimarca que atienden Fiat
- WHEN abre Inicio
- THEN Destacados lista esos talleres (tags Multimarca + modalidad), no empty state de “sin especialistas”

#### Scenario: Usuario con Fiat
- GIVEN usuario con Fiat seleccionado y dirección definida
- WHEN abre Inicio
- THEN Destacados lista talleres especialistas Fiat (cualquier modalidad) y multimarca que cubren Fiat, nunca especialistas de otra marca sin cobertura

### Requirement: Grid responsivo 2 columnas
Los listados de proveedores (Explore y rails del home) **SHALL** renderizar cards en 2 columnas como base, adaptándose al ancho disponible (más columnas en pantallas anchas, mínimo de card ~160pt), estilo listing Airbnb: imagen arriba con radius, título, rating ★, distancia, tags.

#### Scenario: Explore en móvil
- GIVEN viewport móvil (<480pt)
- WHEN se abre ExploreProviders
- THEN las cards se muestran en 2 columnas con gutter uniforme y se reflow-ean al girar/redimensionar

### Requirement: Detail sin imágenes falsas
ProviderDetail y PublicProviderDetail **SHALL NOT** mostrar imágenes placeholder de stock (Unsplash). Si el proveedor no tiene fotos reales, la pantalla abre con header de texto estilo Airbnb (nombre h2, rating · reseñas, tags modalidad/cobertura, ubicación) sin hero.

#### Scenario: Proveedor sin fotos
- GIVEN un proveedor sin galería
- WHEN se abre su detalle
- THEN no hay imagen hero; el título y metadatos ocupan el primer viewport con CTA sticky "Solicitar servicio"

### Requirement: Cards de equipo (mecánicos)
Los mecánicos asociados a un taller **SHALL** presentarse con card estilo host Airbnb: avatar circular, nombre bodyBold, rol caption, tags de servicios/modalidad como pills, superficie paper radius 16 + hairline.

### Requirement: Segmented control único
Toda la app **SHALL** usar un único componente `SegmentedControl` (base) para segmentos/tabs internos (Actividad, Explore tabs, Explore modo, filtros de salud). Estilo Airbnb + paleta Tinder: pill activa con fondo `primary[500]` (`#fe3c72`) y texto inverso; inactivas fondo `neutral.gray[100]` y texto `text.secondary`.

#### Scenario: Consistencia entre pantallas
- GIVEN las pantallas Actividad y Explore
- WHEN el usuario cambia entre ellas
- THEN ambos segmentos son visualmente idénticos (mismo componente, mismos tokens)

### Requirement: Banner contextual del home
El banner contextual (salud/solicitud) **SHALL** ser una card compacta estilo Airbnb: fila con icono en círculo tonal, título h5 + subtítulo caption, y una única acción primaria como link/chip a la derecha o botón `sm`; sin doble botón apilado a lo ancho.

### Requirement: Valorización accesible
El usuario **SHALL** poder ver la valorización del vehículo (valor de mercado, valor sugerido con bono por salud, y depreciación estimada por año/km) desde la ficha del vehículo (`VehicleProfile`), con card "Valorización" estilo Airbnb y entrada visible; salud e historial alimentan el valor (misma lógica de datos).

#### Scenario: Acceso a valorización
- GIVEN un vehículo con precio de mercado definido
- WHEN el usuario abre la ficha del vehículo
- THEN ve la card "Valorización" con valores formateados CLP, el bono por salud y CTA de transferencia

### Requirement: Salud comprensible
VehicleHealth **SHALL** presentar: hero con % global y etiqueta de estado, máximo 3 alertas prioritarias como filas con punto de severidad y CTA "Agendar" por fila, y chips de filtro (Óptimos/Atención/Urgentes/Críticos) usando SegmentedControl/chips consistentes. El camino "alerta → agendar servicio" toma un tap.

### Requirement: Paleta brand Tinder-like
El design system **SHALL** usar la paleta rosa/magenta + gris + blanco: primary `#fe3c72` (CTA, tab activo, badge verificado), secondary `#fd5564`, accent `#ef4a75`, texto/ink `#424242`, canvas/paper `#ffffff`. Success/warning/error permanecen semánticos para salud sin competir con el brand.

#### Scenario: CTA y tabs
- GIVEN cualquier pantalla con botón primario o tab activo
- WHEN se renderiza con tokens `COLORS.primary`
- THEN el color base es `#fe3c72` y el texto inverso es blanco

### Requirement: Cards summary y vehicle listing
Quick actions del home, filas de Actividad y accesos del perfil vehículo **SHALL** usar el patrón summary row Airbnb (`SummaryActionCard`: icono monocromo en círculo neutro, título bodyBold, subtítulo caption, hairline). Mis vehículos **SHALL** listar cada auto con `VehicleListingCard` (anatomía listing: foto + badge salud + título + meta valor/km) con tap a `VehicleProfile`.

#### Scenario: Patrimonio por vehículo
- GIVEN un vehículo registrado con salud y valor
- WHEN el usuario abre Mis vehículos
- THEN cada card muestra salud % y valor de mercado (o "Establecer valor") y al tocar abre la ficha con `VehicleValuationCard` y enlace a salud
