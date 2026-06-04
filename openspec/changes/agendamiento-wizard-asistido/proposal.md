# Agendamiento wizard asistido — baja fricción sin imponer servicio

## Problema
El experimento «Reserva express» infería servicio desde mantenimiento sugerido/trending.
Eso no respeta que el usuario elija qué servicio necesita; el proveedor cotizado depende de esa elección.

## Decisión
- **Revertir** bottom sheet express y auto-inferencia de servicio desde el panel.
- **Conservar** utilidades reutilizables e integrarlas en el **wizard existente** (`FormularioSolicitud`).

## Piezas conservadas (app/)
| Util / service | Uso en wizard |
|----------------|---------------|
| `buildAgendamientoSmartDefaults` | Prellenar dirección, repuestos, urgencia **después** de elegir servicio |
| `pickCandidatoPreferido` | Comparador / catálogo proveedor |
| `resolveProximoSlotProveedor` | Sugerir primer horario real tras elegir proveedor |
| `agendamientoWizardAssistService` | Quote (`candidatos-proveedor`) + slot + `confirmar-candidato` |

## Flujo objetivo (v2 wizard)
1. Usuario elige **servicio** (paso 1 wizard o entrada con servicio preseleccionado explícito).
2. Smart defaults (vehículo, dirección, repuestos).
3. Comparador o proveedor fijo → cotización con servicio ya definido.
4. Sugerencia de **próximo slot real** + opción «Elegir otro horario» (calendario existente).
5. Confirmación con `confirmar-candidato` (sin pasos redundantes).

## Fuera de alcance
- Sheet modal paralelo al wizard.
- Inferir servicio desde salud/trending al pulsar Agendar genérico.
