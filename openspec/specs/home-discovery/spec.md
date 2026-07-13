# home-discovery Specification

## Purpose
Descubrimiento de proveedores en Inicio y Explore: compatibilidad marca/modelo, geolocalización, KPIs, especialista vs multimarca. Patrón visual Airbnb (canvas `#f2f6fe`, cards paper, Lucide).

## Requirements

### Requirement: Home simplificado (Airbnb)
`UserPanelScreen` **SHALL** mostrar: header de vehículo + salud, hasta 6 categorías, banner contextual (solicitud/salud), un solo rail de proveedores («Destacados» / Para ti), sección de **servicios en tu modelo** (demanda agregada de otros usuarios con misma marca+modelo), y accesos a Actividad. **SHALL NOT** mostrar clima duplicado, quick actions de venta ni Registrar viaje GPS.

#### Scenario: Home commuter
- GIVEN usuario con vehículo registrado
- WHEN abre Inicio
- THEN ve salud, categorías (máx. 6), un rail de descubrimiento, servicios elegidos por dueños del mismo marca/modelo, y accesos a solicitudes/mensajes
- AND no ve clima, marketplace ni GPS en el panel

### Requirement: Servicios en tu modelo (actividad de mercado)
Debajo de Destacados, el home **SHALL** mostrar servicios que otros clientes con el **mismo `marca_id` + `modelo_id`** han solicitado (excluyendo al usuario actual), con conteo de personas distintas por servicio, ordenados por popularidad.

#### Scenario: Chevrolet Prisma con demanda
- GIVEN el vehículo seleccionado es Chevrolet Prisma y existen solicitudes de otros con ese marca/modelo
- WHEN carga Inicio
- THEN la sección lista esos servicios con «N personas» y al tocar un ítem inicia agendar con ese servicio preseleccionado

#### Scenario: Sin demanda agregada
- GIVEN no hay solicitudes de terceros para esa marca/modelo
- WHEN carga Inicio
- THEN se muestra un hint vacío corto (sin inventar datos)

### Requirement: Explore filtrado por categoría
Cuando el usuario elige una categoría principal en el home, `ExploreProvidersScreen` **SHALL** listar únicamente proveedores que tengan al menos una `OfertaServicio` activa para un servicio de esa categoría (incluyendo subcategorías).

- **SHALL NOT** incluir proveedores solo por `especialidades` de perfil sin oferta de servicio.
- El orden dentro del radar **SHALL** priorizar proveedores con oferta del servicio, luego distancia, luego KPI.
- Cada ítem **SHALL** usar `ProviderCard` (foto arriba, estilo listing Airbnb).

#### Scenario: Categoría con servicios configurados
- GIVEN el usuario selecciona «Frenos y Seguridad» y existen servicios en esa categoría
- WHEN se carga `ExploreProvidersScreen`
- THEN solo aparecen proveedores con `panel_servicios` que incluya un `servicio_id` de esa categoría

#### Scenario: Categoría sin servicios en catálogo
- GIVEN una categoría sin servicios asociados en API
- WHEN el usuario abre explore con esa categoría
- THEN se muestra estado vacío acorde
