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

### Requirement: Chip de salud en selector (Coinbase)
En `HomeContextHeader`, la salud del vehículo activo **SHALL** mostrarse con `VehicleHealthCompactRing`: anillo SVG con track hairline (`COLORS.border.light`), arco semántico (`getHealthColorToken`), porcentaje tabular y etiqueta «Salud».

#### Scenario: Salud actualizada desde TanStack Query
- GIVEN un vehículo seleccionado en el panel
- WHEN `useVehiclesHealth` devuelve datos de `GET /vehiculos/health/vehicle/:id/` (con parches optimistas)
- THEN el porcentaje del anillo coincide con `resolveVehicleHealthPct` y la pantalla de salud del vehículo
- AND no se muestra `0 %` si aún no hay datos (`hasVehicleHealthData` es falso)

#### Scenario: Carga de salud
- GIVEN salud aún no disponible y query en `isLoading`
- WHEN se renderiza el header
- THEN el anillo muestra estado skeleton/muted sin porcentaje engañoso

#### Scenario: Tap en salud
- WHEN el usuario toca el anillo
- THEN navega a la pantalla de salud del vehículo seleccionado
