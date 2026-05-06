# Propuesta: Restauración de sesión con token inválido (Usuarios)

## Why
Actualmente, si existe un `auth_token` inválido/expirado en `AsyncStorage`, la app intenta restaurar sesión y dispara múltiples requests protegidos. Eso genera una cascada de `401 Token inválido`, limpia credenciales tarde y deja efectos secundarios (p. ej. intento de registrar push token sin sesión).

## What Changes
- Validar el token restaurado al iniciar la app antes de marcar la sesión como “restaurada”.
- Si el token es inválido/expirado: limpiar credenciales temprano y redirigir a login (sin disparar requests protegidos).
- Evitar registrar push token en backend si ya no existe sesión (token ausente/expirado) al momento de registrar.

## Alcance
- `AuthContext` (restauración de sesión, side-effects post-login)
- `NotificationService.registrarTokenEnBackend` (guardrail: no llamar backend sin token)

## Non-goals
- No se implementa refresh token (si el backend no lo soporta en esta app).
- No se cambia el backend.

