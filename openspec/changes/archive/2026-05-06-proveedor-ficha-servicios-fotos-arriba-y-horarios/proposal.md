# Propuesta: Fotos arriba en cards + Horarios disponibles en ficha de proveedor (Usuarios)

## Why
- Las fotos de servicios ayudan a generar confianza; al ponerlas al inicio de la card mejoran la lectura visual.
- El usuario necesita ver los horarios configurados por el proveedor para decidir si le conviene solicitar servicios.

## What Changes
1. En “Servicios Profesionales”, si el servicio/oferta tiene fotos, el carrusel se muestra **en la parte superior** de la card (antes del título/categoría).
2. En la ficha de proveedor (privada y pública), se agrega una sección **Horarios disponibles** inmediatamente después de **Especialidad en Marcas**.

## Alcance
- `ProviderDetailScreen` y `PublicProviderDetailScreen`
- Nuevo componente UI para mostrar horarios semanales.
- Nuevo hook/servicio para cargar horarios semanales desde backend.

## Non-goals
- No se implementa selección de hora o agendamiento desde esta sección (solo visualización).
- No se edita la configuración de horarios en esta app.

