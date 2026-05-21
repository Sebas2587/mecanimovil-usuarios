# Tasks — Calendario contexto unificado

## Implementación (completado)

- [x] `buildAgendaContext` + `navigateCalendarioProveedor` con `agendaContext`
- [x] `buildProviderForSolicitud`: `tipo`, `tipo_proveedor`, entidad en `id`
- [x] `homeScheduleNavigation`: `proveedorEntityId`, `oferta_servicio_id_preseleccionada`
- [x] `CrearSolicitudScreen`: `initialData` con entidad y oferta en flujo perfil
- [x] `FormularioSolicitud.irACalendarioDesdeFormulario` unificado
- [x] `CalendarioProveedorScreen` lee `agendaContext`
- [x] `resolverFechasAgendaReales` usa `dias_disponibles_agenda`
- [x] Backend: fix duración `timedelta`, slots JSON-safe, try/except en vista
- [x] Documentación OpenSpec (este change + spec canónica)

## Verificación manual

- [x] Perfil mecánico → servicio → calendario con días/slots
- [x] Flujo normal paso 4 → calendario mismo proveedor
- [ ] Perfil taller → servicio → calendario (misma checklist)
- [ ] Vuelta desde calendario conserva paso y `slotSeleccionado`

## Mantenimiento futuro

Al tocar agenda, actualizar:

1. `openspec/changes/agendamiento-calendario-contexto-unificado/design.md`
2. `openspec/specs/agendamiento-calendario-proveedor/spec.md`
3. Backend spec si cambian endpoints o `disponibilidad_proveedor.py`
