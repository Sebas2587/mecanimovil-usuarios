# Propuesta: Agendamiento desde perfil de proveedor (catálogo)

## Why
El usuario debe elegir un servicio en el perfil del proveedor con precios reales de `OfertaServicio` y completar nueva solicitud sin re-elegir proveedor ni servicio, generando la oferta como en `confirmar-candidato`.

## What Changes
- `providerCatalogSchedule.js`: mapeo oferta → solicitud.
- `ProviderDetailScreen`: precios visibles, tarjeta tocable, vehículo desde ruta o query.
- `flujoCatalogoProveedor` + `confirmarCatalogoProveedor` al enviar formulario.
- Formulario: resumen servicio/proveedor, sin listado de servicios.

## Non-goals
- Comparador IA desde perfil (solo catálogo del proveedor elegido).
