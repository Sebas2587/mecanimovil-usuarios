# design-system Specification (canonical — Airbnb redesign)

Paleta y tipografía definidas en `app/design-system/tokens/`. Reemplaza spec Coinbase archivada en `openspec/changes/archive/2026-07-11-redesign-airbnb-supersedes-coinbase/`.

## Requirements

### Requirement: Paleta Airbnb
La app SHALL usar tokens con texto `#030a1d`, canvas `#f2f6fe`, primary `#205ae9`, secondary `#a983f3`, accent `#b55aef`.

### Requirement: Tipografía Poppins
La app SHALL cargar Poppins y aplicar escala h1–h6 en `typography.js`.

### Requirement: Componentes base
Button, Card, Tag, Input, BottomSheet, ListItem, EmptyState consumen tokens sin hex hardcodeados.

### Requirement: Sin glass ni gradientes en UI nueva
Nuevas pantallas y componentes migrados SHALL NOT usar `COLORS.glass`, `COLORS.gradients` ni `LinearGradient` decorativo.
