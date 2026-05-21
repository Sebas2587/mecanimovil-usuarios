# Propuesta: Comparador con múltiples servicios

## Why
En el flujo desde cero el usuario puede elegir varios servicios, pero el comparador mostraba
solo un servicio y un precio por proveedor (la oferta con mayor score).

## What Changes
- Backend: agrupar `OfertaServicio` por proveedor; `servicios_ofrecidos`, `precio_total`, `cobertura_pct`.
- Backend: `confirmar-candidato` acepta `oferta_servicio_ids` y crea varios `DetalleServicioOferta`.
- App: `CandidatosProveedorCard` lista servicios y total; mapper y payload actualizados.

## Non-goals
- Cambiar duración de agenda para sumar tiempos de todos los servicios (sigue usando oferta principal).
- Solicitudes abiertas sin comparador catálogo.

## Spec
`openspec/specs/comparador-multi-servicio/spec.md`
