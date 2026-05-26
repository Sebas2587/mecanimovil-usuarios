# solicitudes-crear Specification

## Purpose
Flujo para que el usuario cree una solicitud de servicio mecánico. Incluye selección
de vehículo, tipo de servicio, descripción del problema y confirmación.

**Agenda / calendario del proveedor:** ver `openspec/specs/agendamiento-calendario-proveedor/spec.md`
y `openspec/changes/agendamiento-calendario-contexto-unificado/design.md`.

**Estados de carga:** ver `openspec/changes/home-skeleton-loading-ux/` (skeletons por paso, TanStack Query).

## Requirements

### Requirement: Crear solicitud de servicio
El usuario solicita un servicio mecánico en pocos pasos.

#### Scenario: Solicitud creada con éxito
- GIVEN un usuario con al menos un vehículo registrado
- CUANDO selecciona vehículo, tipo de servicio y agrega descripción
- THEN se crea la solicitud en estado=pendiente
- AND recibe confirmación en la pantalla con el número de solicitud
- AND los proveedores cercanos y compatibles son notificados

#### Scenario: Usuario sin vehículos
- GIVEN un usuario sin vehículos registrados que intenta crear solicitud
- CUANDO inicia el flujo
- THEN es redirigido a registrar un vehículo primero con mensaje explicativo

#### Scenario: Solicitud ya activa
- GIVEN el usuario ya tiene una solicitud en estado=pendiente
- CUANDO intenta crear otra
- THEN ve alerta "Ya tienes una solicitud activa. Espera a que sea respondida o cancélala"

### Requirement: Cancelar solicitud pendiente
El usuario puede cancelar una solicitud antes de que sea aceptada.

#### Scenario: Cancelar solicitud pendiente
- GIVEN una solicitud en estado=pendiente
- CUANDO el usuario la cancela desde el seguimiento
- THEN la solicitud pasa a estado=cancelada
- AND se notifica a los proveedores que dejaron de verla

#### Scenario: Intentar cancelar solicitud aceptada
- GIVEN una solicitud ya aceptada (= orden creada)
- CUANDO el usuario intenta cancelar la solicitud
- THEN ve mensaje "La solicitud ya fue aceptada. Contacta al proveedor para cancelar la orden"
