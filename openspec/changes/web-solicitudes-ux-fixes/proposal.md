# Propuesta: UX web en solicitudes (acciones, fotos, errores 400)

## Why
En web, `Alert.alert` no ejecuta callbacks; botones de detalle de solicitud y selector de fotos fallaban en silencio. Errores 400 mostraban mensaje genérico.

## What Changes
- `platformAlert.js`: confirm y botones compatibles con web
- Detalle solicitud: aceptar/cancelar/chat con alertas web
- Formulario: subida de fotos vía file picker + base64 en web
- API/Crear solicitud: mensajes de campo DRF legibles
