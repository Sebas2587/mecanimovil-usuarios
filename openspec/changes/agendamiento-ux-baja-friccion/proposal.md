# Agendamiento UX baja fricción + anti-duplicado

## Why
Reducir fricción tipo “pedido rápido”: resumen claro antes de enviar, sin repetir fecha/hora tras el calendario del proveedor, y bloquear solicitudes duplicadas (mismo auto + mismo servicio activo).

## What Changes
- `SolicitudResumenTicket` en paso final cuando hay horario de agenda.
- `CalendarioProveedorScreen`: texto de horario preferido (confirmación del proveedor).
- Validación temprana vía `verificar-servicio-activo` al seleccionar vehículo y servicio.
- OpenSpec `agendamiento-ux` con requisitos REQ-TICKET-RESUMEN y REQ-ANTI-DUPLICADO.

## Non-goals
- Dos CTAs distintos en home (cotizar vs reservar) — fase posterior.
