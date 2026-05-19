# Propuesta: Asistente IA agendamiento (app usuarios)

## Why
Flujo actual no guía al usuario indeciso ni muestra catálogo de proveedores antes de publicar.

## What Changes
- Paso «¿Qué necesitas?» (texto + STT local).
- Servicios sugeridos y hasta 3 candidatos con desglose (`ofertaPrecioDesglose.js`).
- Comparador existente con adapter `modo=catalogo`.
- Flag `EXPO_PUBLIC_AGENDAMIENTO_IA_ASISTIDO`.

## Non-goals
- No subir audio al API en v1.
- No cambiar flujo legacy sin flag.
