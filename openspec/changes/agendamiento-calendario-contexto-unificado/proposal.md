# Propuesta: Calendario con contexto unificado (perfil + flujo normal)

**Estado:** Implementado (2026-05-21)  
**Commits:** usuarios `4c63d52`, backend `d990e85`

## Why
El calendario funcionaba en el flujo normal (paso 4) pero no desde **perfil → elegir servicio**:
faltaba pasar tipo de proveedor (taller vs mecánico a domicilio), ID de entidad y `oferta_servicio_id`.
Además la API `disponibilidad_con_duracion` devolvía 500 en producción al calcular duración con
`DurationField` del servicio.

## What Changes

### App usuarios
- `buildAgendaContext` / `agendaContext` en navegación al calendario.
- `buildProviderForSolicitud`: `tipo`, `tipo_proveedor`, `id` = entidad.
- `CrearSolicitudScreen` / `homeScheduleNavigation`: params `proveedorEntityId`, `oferta_servicio_id_preseleccionada`.
- `resolverFechasAgendaReales`: prioriza `dias_disponibles_agenda`.

### Backend
- `duracion_rango_oferta`: soporta `timedelta` (`duracion_estimada_base`).
- Slots JSON sin objetos `time` internos.
- `disponibilidad_con_duracion`: try/except → 200 con lista vacía (no 500).

## Non-goals
- Cambiar pasos del formulario o comparador IA global.
- Horarios por defecto sin configuración del proveedor.

## Spec canónica
`openspec/specs/agendamiento-calendario-proveedor/spec.md`
