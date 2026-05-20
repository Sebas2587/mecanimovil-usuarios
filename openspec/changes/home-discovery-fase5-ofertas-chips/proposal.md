# Propuesta: Home discovery — Fase 5 (chips de ofertas)

## Why
En el home y explorar, el usuario no puede comparar precios por servicio sin abrir la ficha del proveedor.

## What Changes
- Backend: campo `panel_servicios` en `cerca` y `proveedores_filtrados` con `include_panel_servicios=true` (hasta 3 ofertas por proveedor, precio publicado).
- Frontend: `ProviderServiceChipsRow` en `ProviderPreviewCard` (Coinbase-light); servicios de panel y explorar piden el flag.

## Non-goals
- Navegación directa al booking desde un chip (sigue siendo tap en la card → ficha).
- Catálogo completo de servicios en la card.
