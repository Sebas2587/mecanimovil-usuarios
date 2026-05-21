# Diseño (cliente) — Disponibilidad con duración

Detalle completo del contexto de navegación y flujos: ver
`../agendamiento-calendario-contexto-unificado/design.md`.

## Servicio `disponibilidadProveedorService.js`

| Función | Endpoint |
|---------|----------|
| `obtenerHorariosSemanalesProveedor` | `horarios_semanales/` |
| `obtenerDiasDisponiblesAgenda` | `dias_disponibles_agenda/` |
| `obtenerDisponibilidadConDuracion` | `disponibilidad_con_duracion/` |
| `resolverFechasAgendaReales` | compone semanal + días/slots |

`horariosSemanalesConfigurados`: excluye filas sin `id` (no sintéticas) y `activo === false`.
