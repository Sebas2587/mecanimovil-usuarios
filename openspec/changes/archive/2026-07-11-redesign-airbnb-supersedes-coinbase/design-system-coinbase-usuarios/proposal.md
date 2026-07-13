# Propuesta: Design System “Coinbase-style” para Mecanimovil Usuarios

## Why
La app de usuarios tiene estilos mezclados (dark glass, gradientes y hex hardcodeados) que generan inconsistencia visual entre pantallas. Queremos un sistema de diseño **robusto, único y reutilizable** para que todas las screens se vean coherentes sin tocar funcionalidades.

## What Changes
- Definir tokens (color, tipografía, spacing, radius, hairlines, elevación) alineados a `DESIGN-coinbase.md`.
- Normalizar componentes base para que consuman tokens (Button, Card, Text, Input, Badge, Header, etc.).
- Migrar progresivamente **todas** las pantallas y componentes existentes a:
  - tokens de `app/design-system/tokens/`
  - componentes base de `app/components/base/**`
- Eliminar (o encapsular) estilos “one-off” y colores hardcodeados cuando exista token equivalente.

## Non-goals
- No cambiar lógica de negocio, navegación, hooks, ni flujos.
- No agregar features nuevos.

## Alcance
`mecanimovil-usuarios/app/**` (todas las screens + componentes).

