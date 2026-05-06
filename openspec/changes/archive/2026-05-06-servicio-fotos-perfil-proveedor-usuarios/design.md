# Diseño técnico

## Fuente de datos
La ficha de proveedor ya consume las ofertas públicas:
- Taller: `GET /servicios/ofertas/por_taller/?taller=<id>`
- Mecánico: `GET /servicios/ofertas/por_mecanico/?mecanico=<id>`

En ambos casos el backend retorna `fotos_servicio` para cada oferta (lista de objetos con `imagen_url`, `orden`, etc.).

## Render en UI
- En la sección “Servicios Profesionales”, por cada item de `provider.servicios`:
  - Si `fotos_servicio.length === 0`: no renderizar bloque de fotos.
  - Si `fotos_servicio.length >= 1`: renderizar carrusel horizontal dentro de la card.

## Componente
`ServicePhotosCarousel`:
- Acepta `photos` (array) y `height`.
- Resuelve `uri` desde `imagen_url` (y fallback a otros campos por compatibilidad).
- Usa `ScrollView` horizontal con `pagingEnabled`.

## Performance
- El carrusel se renderiza solo si hay fotos.
- El componente filtra/normaliza la entrada con `useMemo`.

