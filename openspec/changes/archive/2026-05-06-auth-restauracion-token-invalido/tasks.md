# Tareas

- [x] Actualizar specs `auth-login` para cubrir el caso “token inválido/expirado al reabrir” (limpiar sesión temprano y volver a login).
- [x] Implementar validación temprana del token restaurado en `AuthContext` (ping a endpoint de perfil o similar).
- [x] Asegurar que el registro de push token NO se ejecute si no hay token válido al momento de registrar.
- [x] Validar el change con `openspec validate` y archivar.

