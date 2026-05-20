# home-discovery Specification (delta) — Fase 4

## ADDED Requirements

### Requirement: Primer viewport orientado a descubrimiento
El panel principal **SHALL** mostrar ubicación, vehículo, acciones rápidas y al menos el inicio de «Para ti» antes del bloque patrimonio/clima/viajes en un viewport estándar de teléfono.

#### Scenario: Usuario abre el home con vehículo
- WHEN abre el tab Panel sin viaje GPS activo
- THEN ve primero las secciones de proveedores (Para ti, Cerca de ti)
- AND el bloque patrimonio/clima/viajes aparece colapsado más abajo en el scroll

### Requirement: Bloque patrimonio colapsable
Patrimonio, telemetría y clima **SHALL** agruparse en un único bloque colapsable cerrado por defecto.

#### Scenario: Expandir patrimonio
- WHEN el usuario expande «Patrimonio, clima y viajes»
- THEN ve valor estimado, salud, viaje/telemetría y tarjeta de clima

#### Scenario: Viaje activo
- GIVEN un viaje GPS en curso
- WHEN el usuario está en el panel
- THEN el bloque patrimonio/clima/viajes se muestra expandido automáticamente
