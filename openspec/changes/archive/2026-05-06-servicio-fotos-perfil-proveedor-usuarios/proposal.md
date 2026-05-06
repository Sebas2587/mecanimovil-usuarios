# Propuesta: Fotos de servicios en perfil de proveedor (Usuarios)

## Why
Los proveedores ya suben fotos por servicio/oferta en la app de proveedores, pero en la app de usuarios esa evidencia visual no se ve dentro de “Servicios Profesionales”, lo que reduce confianza y claridad al comparar especialistas.

## What Changes
- En la ficha de proveedor (privada y pública), cada servicio profesional mostrará sus fotos asociadas.
- Si un servicio tiene múltiples fotos, se presentarán en carrusel dentro de la card del servicio.

## Contexto
En `mecanimovil-prov`, el proveedor puede subir fotos asociadas a cada servicio/oferta. En `mecanimovil-usuarios`, la ficha del proveedor ya lista “Servicios Profesionales”, pero actualmente no muestra esas fotos.

## Objetivo
Mostrar las fotos asociadas a cada servicio/oferta del proveedor dentro de la sección **Servicios Profesionales** en la ficha de proveedor (pantalla privada y ficha pública). Si un servicio tiene múltiples fotos, se deben visualizar en un **carrusel** dentro de la card del servicio.

## Alcance
- App Usuarios:
  - `ProviderDetailScreen` (usuario con sesión)
  - `PublicProviderDetailScreen` (ficha pública)
- UI:
  - Carrusel horizontal dentro de la card del servicio cuando existan fotos.
- Datos:
  - Usar el array `fotos_servicio` ya entregado por los endpoints de ofertas del backend.

## No-alcance (Non-goals)
- No se modifica el flujo de subida de fotos en app proveedor.
- No se cambia el modelo ni almacenamiento de fotos en backend.
- No se agrega modal de “zoom” o visor full-screen (se puede hacer en un cambio posterior).

## Consideraciones técnicas
- Los hooks/servicios ya consumen:
  - `/servicios/ofertas/por_taller/?taller=<id>`
  - `/servicios/ofertas/por_mecanico/?mecanico=<id>`
- El backend serializa `fotos_servicio` (cada item con `imagen_url`).
- El carrusel debe ser liviano y no degradar el scroll.

