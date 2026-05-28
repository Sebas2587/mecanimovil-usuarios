# Propuesta: catálogo paso 1 — especialista + multimarca

## Problema

Con proveedores multimarca en producción, el paso 1 de nueva solicitud podía omitir servicios que solo ofrecen multimarca o que comparten catálogo con especialistas. El comparador ya clasifica por marca, distancia y precio, pero necesitaba la misma unión de ofertas en el listado inicial.

## Solución

1. **Backend:** unificar en `catalogo_vehiculo.py` la unión modelo + marca + especialistas + multimarca (`por_modelo`, `servicios_por_vehiculo`).
2. **Matching IA:** `_queryset_ofertas_compatibles` incluye ofertas de proveedores `tipo_cobertura_marca=multimarca`.
3. **Usuarios:** módulo `solicitudCatalogoServicios` + hook `useServiciosPaso1Catalogo` + hint de cobertura en paso 1.
4. **Serializer:** `ofertas_disponibles` expone conteos `multimarca` y `especialistas` para UI.

## Alcance

- Paso 1 `FormularioSolicitud` (flujo normal con vehículo).
- Comparador: sin cambio de contrato; recibe los mismos `servicio_ids` con más candidatos multimarca en pool.
