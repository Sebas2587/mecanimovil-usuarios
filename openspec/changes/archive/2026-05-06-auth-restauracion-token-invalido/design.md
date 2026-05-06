# Diseño técnico

## Validación de token al boot
En `AuthContext`, al leer `auth_token` + `user` desde `AsyncStorage`, se hace una validación rápida:
- Llamar a `userService.getUserProfile(userId)` o `userService.getUserProfile()` (endpoint protegido).
- Si responde 200: token válido → restaurar sesión como hoy.
- Si responde 401 con mensaje de token inválido/expirado: limpiar `auth_token` y `user` antes de setear estado React.

## Push token registration
El registro de push token se debe ejecutar solo si:
- existe `token` en memoria y también `auth_token` en storage al momento de ejecutar la acción, y
- el usuario sigue siendo el mismo (evitar race condition con limpieza por 401).

Como guardrail adicional, `NotificationService.registrarTokenEnBackend` debe chequear que exista `auth_token` antes de llamar al backend.

