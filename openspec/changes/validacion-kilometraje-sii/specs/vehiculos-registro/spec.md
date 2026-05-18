# vehiculos-registro Specification (delta)

## ADDED Requirements

### Requirement: Validación de kilometraje contra registro SII
Al registrar un vehículo por patente, el kilometraje ingresado debe contrastarse con `mileage` de GetAPI (datos SII).

#### Scenario: Kilometraje menor al registro SII
- GIVEN el usuario consultó la patente y la API devolvió `mileage` = 120000
- WHEN ingresa kilometraje actual 95000 y confirma guardar
- THEN ve alerta de inconsistencia indicando que no puede ser menor al registro SII (120000 km)
- AND no se crea el vehículo hasta corregir el valor

#### Scenario: Kilometraje igual o mayor al SII
- GIVEN `mileage` = 120000 en la ficha del vehículo
- WHEN ingresa 125000 km
- THEN puede continuar con el registro

#### Scenario: Sin mileage en API
- GIVEN la patente existe pero GetAPI no devuelve `mileage`
- WHEN el usuario ingresa kilometraje
- THEN ve aviso de que no hay referencia SII disponible
- AND se valida plausibilidad según el año del vehículo

#### Scenario: Web y móvil
- GIVEN el mismo flujo en navegador o app nativa
- THEN las mismas reglas y mensajes aplican

### Requirement: Plausibilidad de kilometraje sin SII en registro
Sin `mileage` SII, la app SHALL mostrar alertas según el caso antes de crear el vehículo.

#### Scenario: km fuera de rango bloqueante
- GIVEN sin mileage SII y year=2008
- WHEN ingresa 2000 km
- THEN ve hint de error en el campo y no puede guardar sin corregir

#### Scenario: km atípico con confirmación
- GIVEN sin mileage SII y km en rango de aviso con requiere_confirmacion
- WHEN el usuario confirma guardar
- THEN muestra diálogo de confirmación y puede continuar si acepta

#### Scenario: posible tipeo
- GIVEN sin mileage SII y la validación sugiere km_sugerido
- WHEN el usuario guarda
- THEN ve mensaje con el valor sugerido y opción de confirmar o corregir
