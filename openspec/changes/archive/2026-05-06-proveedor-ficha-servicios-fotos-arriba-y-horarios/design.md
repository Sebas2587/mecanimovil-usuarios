# Diseño técnico

## Fotos de servicios en cards
- Reordenar el contenido de la card en “Servicios Profesionales” para que:
  1) carrusel de fotos (si existe)
  2) título
  3) categoría + badges

## Horarios disponibles
### Fuente de datos
Se consumirá un endpoint público del backend que exponga los horarios semanales del proveedor (taller o mecánico).

### UI
- Sección ubicada después de “Especialidad en Marcas”.
- Mostrar lista por día (Lunes…Domingo) con estado Activo/Inactivo y rango `hora_inicio - hora_fin`.

