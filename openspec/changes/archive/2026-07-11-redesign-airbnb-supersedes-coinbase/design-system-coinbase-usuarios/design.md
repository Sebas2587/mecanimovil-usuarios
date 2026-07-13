# Diseño técnico

## Estrategia de migración (sin romper app)
1. **Mantener la API de tokens** (`TOKENS`, `useTheme`) para evitar refactors masivos de imports.
2. Cambiar los valores internos de tokens para alinearlos a Coinbase (white canvas, hairlines, blue único).
3. En componentes base, eliminar hardcodes y usar `useTheme()`.
4. Migrar pantallas por “capabilities” y reemplazar:
   - backgrounds oscuros → canvas blanco + surface bands suaves
   - gradientes → CTAs sólidos primarios/ secundarios (píldora)
   - sombras fuertes → hairline + una sola elevación suave

## Fonts
Si no contamos con Coinbase fonts licenciadas, usaremos equivalentes del sistema:
- Display/Body: `System` (iOS) / `Roboto` (Android) o Inter si ya está instalado.
- Mono para números: `System`/monospace.

## Mapeo inicial de paleta
Basado en `DESIGN-coinbase.md`:
- primary: `#0052ff`
- ink/surface-dark: `#0a0b0d`
- canvas: `#ffffff`
- hairline: `#dee1e6`
- surface-strong: `#eef0f3`

