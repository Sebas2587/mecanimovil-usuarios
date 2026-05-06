# auth-login Specification (delta)

## MODIFIED Requirements

### Requirement: Persistencia de sesión
La sesión **SHALL** persistir al cerrar y reabrir la app, siempre que el token almacenado siga siendo válido.

#### Scenario: App reabierta con token válido
- GIVEN el usuario cerró la app con sesión activa
- WHEN reabre la app
- THEN la sesión se restaura automáticamente

#### Scenario: Token inválido o expirado al reabrir
- GIVEN existe un `auth_token` almacenado pero el backend lo considera inválido/expirado
- WHEN la app intenta restaurar la sesión al iniciar
- THEN la app limpia credenciales locales (token y usuario)
- AND redirige a la pantalla de login
- AND evita disparar requests protegidos en cascada durante el arranque

