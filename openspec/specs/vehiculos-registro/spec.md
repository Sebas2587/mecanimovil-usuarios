# vehiculos-registro Specification

## Purpose
Registro y gestión de vehículos del usuario. Requisito previo para crear solicitudes
de servicio. El usuario puede tener múltiples vehículos.

## Requirements

### Requirement: Registrar vehículo
El usuario registra su vehículo con datos básicos.

#### Scenario: Registro exitoso
- GIVEN un usuario autenticado sin vehículo registrado
- CUANDO completa el formulario (marca, modelo, año, patente) y confirma
- THEN el vehículo queda asociado a su cuenta
- AND puede usarlo en solicitudes de servicio

#### Scenario: Formulario incompleto
- GIVEN campos obligatorios vacíos
- CUANDO intenta confirmar el registro
- THEN ve mensajes de validación en los campos vacíos

### Requirement: Listar vehículos del usuario
El usuario ve todos sus vehículos registrados.

#### Scenario: Lista con vehículos
- GIVEN un usuario con vehículos registrados
- CUANDO accede a "Mis vehículos"
- THEN ve la lista con marca, modelo, año y patente de cada uno

#### Scenario: Lista vacía
- GIVEN un usuario sin vehículos
- CUANDO accede a "Mis vehículos"
- THEN ve estado vacío con CTA "Registrar mi primer vehículo"

### Requirement: Eliminar vehículo
El usuario puede eliminar vehículos sin órdenes activas.

#### Scenario: Eliminar vehículo sin órdenes activas
- GIVEN un vehículo sin órdenes en progreso
- CUANDO el usuario confirma la eliminación
- THEN el vehículo se elimina de su lista

#### Scenario: Intento de eliminar con orden activa
- GIVEN un vehículo con una orden en_progreso
- CUANDO el usuario intenta eliminarlo
- THEN ve alerta "No puedes eliminar este vehículo mientras tiene una orden activa"
