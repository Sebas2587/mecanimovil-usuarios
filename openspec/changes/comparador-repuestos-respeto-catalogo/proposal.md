# Comparador: cards y precios según catálogo del proveedor

## Problema
Cards ocultaban repuestos o totales incorrectos cuando el usuario pedía solo MO pero el
proveedor vendía con repuestos. Multi-servicio no listaba precio por ítem.

## Solución
- Utils `catalogoComparadorRepuestos` distinguen catálogo vs precio efectivo.
- Card lista cada servicio con precio y leyenda (solo MO / con repuestos).
- Total = suma de líneas del backend.

## Spec
`specs/comparador-multi-servicio/spec.md`
