# Imágenes de Categorías de Servicios

Este directorio contiene las imágenes para las categorías de servicios.

## Estructura de Nombres

Las imágenes deben seguir el formato: `categoria_[nombre_categoria].png`

Ejemplos:
- `categoria_afinaciones.png` - Para la categoría "Afinaciones"
- `categoria_aire_acondicionado.png` - Para la categoría "Aire acondicionado"
- `categoria_frenos.png` - Para la categoría "Sistema de frenos"

## Categorías Actuales

### Afinaciones (ID: 9)
- **Archivo**: `afinaciones.jpg`
- **Estado**: ✅ Implementada

### Aire acondicionado
- **Archivo**: `aire acondicionado.jpg`
- **Estado**: ✅ Implementada

### Sistema de frenos
- **Archivo**: `sistema de frenos.jpg`
- **Estado**: ✅ Implementada

### Mantenimiento preventivo
- **Archivo**: `afinaciones.jpg` (compartida con Afinaciones)
- **Estado**: ✅ Implementada

## Cómo Agregar una Nueva Imagen

1. Agregar la imagen en este directorio con el formato `categoria_[nombre].png`
2. Actualizar el mapeo en `CategoryGridCard.js`:
   - Agregar en `CATEGORY_IMAGES` por ID: `[id]: require('../../assets/images/categoria_[nombre].png')`
   - O agregar en `CATEGORY_IMAGES_BY_NAME` por nombre: `'[nombre]': require('../../assets/images/categoria_[nombre].png')`

## Especificaciones de Imágenes

- **Formato**: PNG (preferido) o JPG
- **Tamaño recomendado**: 200x200px o 400x400px (cuadrado)
- **Fondo**: Transparente o blanco
- **Estilo**: Isométrico, ilustrativo, moderno

