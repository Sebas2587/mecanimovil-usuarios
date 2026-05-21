# Solicitud — diagnóstico/inspección sin paso repuestos

## Regla

Si **todos** los servicios seleccionados son de diagnóstico o inspección, el formulario de crear solicitud **no muestra el paso 3** (con/sin repuestos) y establece `requiere_repuestos: false`.

## Detección (`servicioDiagnosticoInspeccion.js`)

- `es_diagnostico` del API
- `categoria_nombre` / `categoria` / `categorias_completas`
- Nombre del servicio (palabras: diagnóstico, inspección, revisión, evaluación)

## Flujos

- Normal (6 pasos → 5 visibles)
- Perfil proveedor / catálogo (4 pasos → 3 visibles)
- Agendamiento inteligente / comparador

No aplica a pre-compra (paso 3 = descripción de necesidad).
