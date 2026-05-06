# auth-restauracion-token-invalido

Evitar cascada de requests cuando se restaura un auth_token inválido: validar sesión al iniciar, limpiar credenciales temprano y no intentar registrar push token si no hay sesión.
