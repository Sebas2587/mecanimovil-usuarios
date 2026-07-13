# design-system Specification (delta)

## ADDED Requirements

### Requirement: Tokens centralizados
La app **SHALL** definir tokens centralizados de color, tipografía, espaciado, radius, hairlines y elevación, alineados al documento `DESIGN-coinbase.md`.

#### Scenario: Uso de color sin hardcode
- GIVEN una pantalla o componente que necesita un color
- WHEN se implementa o edita UI
- THEN se usa un token (`theme.colors...`) y no un hex hardcodeado

### Requirement: Componentes base consumen tokens
Los componentes base **SHALL** consumir tokens y ser la forma preferida de construir UI (Button, Card, Text, Input, Badge, Header, etc.).

#### Scenario: Botón primario consistente
- GIVEN un CTA primario en cualquier pantalla
- WHEN se renderiza
- THEN usa el componente base Button en variante primaria con color Coinbase Blue y pill radius

### Requirement: No cambiar funcionalidades
La migración de estilos **MUST** no alterar navegación, estados, ni lógica de negocio.

#### Scenario: Migración de estilos
- GIVEN una pantalla migrada al nuevo design system
- WHEN se ejecutan los flujos existentes
- THEN el comportamiento es idéntico al anterior (solo cambia estilo)

