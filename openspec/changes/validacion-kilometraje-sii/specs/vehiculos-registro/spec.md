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
- AND puede registrar si el valor es mayor a 0

#### Scenario: Web y móvil
- GIVEN el mismo flujo en navegador o app nativa
- THEN las mismas reglas y mensajes aplican
