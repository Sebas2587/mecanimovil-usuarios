# auth-login Specification

## Purpose
Flujo de autenticación del usuario final: registro, login, logout y recuperación
de contraseña. El token JWT se almacena de forma segura y se refresca automáticamente.
## Requirements
### Requirement: Registro de usuario
Un nuevo usuario **SHALL** poder crear una cuenta con email y password.

#### Scenario: Registro exitoso
- GIVEN un email no registrado y password válido (mínimo 8 caracteres)
- CUANDO completa el formulario de registro y confirma
- THEN se crea la cuenta en el backend
- AND se redirige al onboarding o directamente al home

#### Scenario: Email ya registrado
- GIVEN un email que ya tiene cuenta en la plataforma
- CUANDO intenta registrarse con ese email
- THEN ve un mensaje "Este email ya está registrado. ¿Quieres iniciar sesión?"

### Requirement: Login del usuario
El usuario **SHALL** poder iniciar sesión con email y password.

#### Scenario: Login exitoso
- GIVEN un usuario registrado con credenciales válidas
- CUANDO completa el login
- THEN recibe tokens JWT y accede al home de la app

#### Scenario: Credenciales incorrectas
- GIVEN email o password equivocados
- CUANDO envía el formulario
- THEN ve un mensaje de error sin revelar cuál campo es incorrecto

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

