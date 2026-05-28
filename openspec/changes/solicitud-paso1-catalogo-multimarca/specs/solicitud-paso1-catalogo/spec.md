# solicitud-paso1-catalogo Specification

## Purpose

Catálogo de servicios en el paso 1 de nueva solicitud: unión de ofertas activas de **especialistas** (marca del vehículo) y **multimarca**, alimentando el comparador posterior.

## Requirements

### REQ-PASO1-CATALOGO-UNION

`GET /servicios/servicios/por_modelo/` y `GET /servicios/vehiculo-servicios/` **SHALL** devolver servicios cuya unión incluya:

1. Compatibilidad con el modelo del vehículo.
2. Ofertas `disponible=true` con `marca_vehiculo_seleccionada` = marca del vehículo.
3. Ofertas genéricas de talleres/mecánicos especialistas verificados que atienden la marca.
4. Ofertas de proveedores con `tipo_cobertura_marca=multimarca`, verificados y activos.

#### Scenario: Servicio solo en multimarca

- GIVEN un servicio con oferta activa solo de un taller multimarca
- AND el vehículo es marca X
- WHEN el cliente abre paso 1 de nueva solicitud
- THEN el servicio aparece en la lista

#### Scenario: Servicio en especialista y multimarca

- GIVEN el mismo servicio con ofertas de especialista y multimarca
- WHEN el cliente selecciona el servicio y avanza al comparador
- THEN `candidatos-proveedor` puede devolver especialistas recomendados y proveedores multimarca en el pool

### REQ-PASO1-CATALOGO-FILTRO-UI

La app usuarios **SHALL** mostrar solo servicios con `ofertas_disponibles.total > 0` (o proveedor principal) tras la respuesta del API.

### REQ-PASO1-COBERTURA-HINT

Si el catálogo incluye ofertas multimarca, el paso 1 **SHALL** informar que en el comparador se verán especialistas y opciones multimarca.

## Archivos

| Repo | Archivo |
|------|---------|
| Backend | `apps/servicios/catalogo_vehiculo.py`, `motor_match.py` |
| Usuarios | `utils/solicitudCatalogoServicios.js`, `components/solicitudes/catalogo/*` |
