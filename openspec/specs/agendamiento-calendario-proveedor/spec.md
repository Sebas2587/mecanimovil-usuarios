# agendamiento-calendario-proveedor Specification

## Purpose
Calendario de agenda real del proveedor (taller o mecánico a domicilio) al crear una solicitud.
Debe comportarse igual si el usuario llega desde cero, desde el perfil del proveedor (catálogo)
o desde el comparador IA. Usa horarios persistidos en `HorarioProveedor` y slots calculados con
la duración de la `OfertaServicio` elegida.

**Leer antes de modificar:** `openspec/changes/agendamiento-calendario-contexto-unificado/design.md`

## Requirements

### REQ-AGENDA-CONTEXT
La app **SHALL** construir un único `agendaContext` antes de abrir `CalendarioProveedorScreen`:

| Campo | Descripción |
|-------|-------------|
| `tipoProveedor` | `'taller'` o `'mecanico'` (nunca inferir por defecto) |
| `proveedorId` / `proveedorEntityId` | PK de `Taller` o `MecanicoDomicilio`, **no** `usuario.id` |
| `ofertaServicioId` | PK de `OfertaServicio` del servicio elegido (obligatorio en flujo catálogo/perfil) |

Implementación: `app/utils/calendarioProveedorNavigation.js` → `buildAgendaContext`, `navigateCalendarioProveedor`.

#### Scenario: Flujo desde perfil (catálogo)
- GIVEN el usuario en `ProviderDetailScreen` con `providerType` taller o mecanico
- AND toca un servicio del catálogo con vehículo activo
- WHEN navega a `CREAR_SOLICITUD` con `flujoCatalogoProveedor: true`
- THEN `proveedorPreseleccionado` incluye `tipo`, `tipo_proveedor`, `proveedor_entity_id`, `id` = entidad
- AND `servicioPreseleccionado` incluye `oferta_servicio_id` / `oferta_id`
- AND al continuar al calendario se llama API según tipo (`/talleres/{id}/` o `/mecanicos-domicilio/{id}/`)

#### Scenario: Flujo normal (paso 4 proveedores)
- GIVEN el usuario eligió proveedor en paso 4 de `FormularioSolicitud`
- WHEN avanza y debe elegir horario en agenda
- THEN `toggleProveedorSeleccionado` guardó `tipo` y `proveedor_entity_id`
- AND el calendario usa el mismo `buildAgendaContext` que el flujo perfil

#### Scenario: Comparador catálogo
- GIVEN modo catálogo en `ComparadorOfertasScreen`
- WHEN el usuario acepta una oferta
- THEN navega a calendario con `agendaContext` explícito (`proveedor_id`, `tipo_proveedor`, `oferta_servicio_id`)

### REQ-CALENDARIO-PROVEEDOR
Tras seleccionar proveedor en solicitud dirigida (paso proveedores, perfil o comparador),
la app **SHALL** abrir `CalendarioProveedorScreen` antes del paso de ubicación/resumen final,
si aún no hay `fecha_preferida`.

### REQ-SLOTS-DURACION
Los horarios **SHALL** provenir de:

1. `GET .../horarios_semanales/` — solo filas BD con `id` y `activo !== false`
2. `GET .../dias_disponibles_agenda/?oferta_servicio_id=` — fechas con al menos un slot (preferido)
3. `GET .../disponibilidad_con_duracion/?fecha=&oferta_servicio_id=` — slots del día con `hora_fin_estimada`

Servicio cliente: `app/services/disponibilidadProveedorService.js` → `resolverFechasAgendaReales`.

#### Scenario: Sin horario semanal en BD
- GIVEN el proveedor no configuró semana en app proveedor
- WHEN se abre el calendario
- THEN se muestra mensaje de horario no configurado (no horarios genéricos inventados)

#### Scenario: Proveedor con agenda y oferta válida
- GIVEN `HorarioProveedor` activo y oferta del mismo proveedor
- WHEN el usuario abre calendario desde perfil o flujo normal
- THEN ve días laborables con slots libres según duración máxima de la oferta

### REQ-ESTADO-OCUPADO
Si el proveedor está en servicio el día elegido, la pantalla **SHALL** mostrar badge con
`estado_actual` (servicio en curso, hora estimada de liberación).

### REQ-VUELTA-FORMULARIO
Al confirmar slot, la app **SHALL** volver a `CREAR_SOLICITUD` con `slotSeleccionado`
y `merge: true`, sin re-ejecutar preload que borre servicio/proveedor (`resumePasoFormulario`).

## Archivos clave (usuarios)

| Archivo | Rol |
|---------|-----|
| `app/utils/calendarioProveedorNavigation.js` | Resolución tipo/ID/oferta y navegación |
| `app/services/disponibilidadProveedorService.js` | Llamadas API agenda |
| `app/screens/booking/CalendarioProveedorScreen.js` | UI calendario |
| `app/components/solicitudes/FormularioSolicitud.js` | `irACalendarioDesdeFormulario`, flujos 4 pasos |
| `app/components/home/shared/providerCatalogSchedule.js` | `buildProviderForSolicitud` |
| `app/components/home/shared/homeScheduleNavigation.js` | Perfil → `CREAR_SOLICITUD` |
| `app/screens/solicitudes/CrearSolicitudScreen.js` | `initialData` con entidad y oferta |

## Errores conocidos (no reintroducir)

- **Default `tipo: 'taller'`** si falta tipo → agenda vacía o API incorrecta para mecánicos.
- **Usar `proveedor.id` de usuario** en lugar de `mecanico_id` / `taller_id`.
- **Omitir `oferta_servicio_id`** en flujo catálogo → duración incorrecta o 500 en API.
- **Horarios sintéticos** cuando BD está vacía (eliminado en backend y cliente).
