# mis-solicitudes Specification (delta)

## ADDED Requirements

### Requirement: Listado exclusivo del cliente autenticado
La app de usuarios solo debe mostrar solicitudes públicas cuyo `cliente` coincide con el perfil del usuario autenticado.

#### Scenario: Cliente ve solo sus solicitudes activas y en proceso
- GIVEN un usuario_final autenticado con perfil Cliente A
- AND existen solicitudes en estado `publicada` o `en_ejecucion` creadas por Cliente B
- WHEN abre Mis solicitudes (pestañas Activas o En proceso)
- THEN solo aparecen solicitudes con `cliente` = Cliente A
- AND no aparecen solicitudes de Cliente B

#### Scenario: Usuario sin perfil cliente no recibe feed de proveedor
- GIVEN un usuario autenticado sin perfil `Cliente` y con perfil proveedor
- WHEN la app llama a `GET /ordenes/solicitudes-publicas/mis-solicitudes/`
- THEN la respuesta es una lista vacía (no solicitudes de terceros)

#### Scenario: Cambio de sesión no muestra datos del usuario anterior
- GIVEN el usuario A cerró sesión y el usuario B inició sesión en el mismo dispositivo
- WHEN B abre Mis solicitudes
- THEN no ve solicitudes cacheadas de A
