# home-discovery — Mantenimiento sugerido (crítico / urgente)

## Requirements

### REQ-HOME-HEALTH-SUGERIDO-SCOPE
`HomeHealthServicesRow` **SHALL** listar únicamente componentes del reporte de salud del vehículo activo cuyo `nivel_alerta` (o `status`) sea `CRITICO` o `URGENTE`.

- **SHALL NOT** incluir componentes `OPTIMO` ni `ATENCION`.
- **SHALL NOT** ampliar el listado solo por predicciones ML si el snapshot de salud del componente no está en `CRITICO`/`URGENTE`.

#### Scenario: Vehículo con desgaste mixto
- GIVEN un vehículo con 10 componentes `CRITICO`, 1 `URGENTE` y 1 `ATENCION`
- WHEN el usuario ve «Mantenimiento sugerido» en `UserPanelScreen`
- THEN aparecen 11 cards (10 + 1), una por componente crítico/urgente
- AND no aparece el componente en `ATENCION`

### REQ-HOME-HEALTH-SUGERIDO-LABELS
Cada card **SHALL** mostrar el nombre canónico del componente (`nombre` / `componente_detail.nombre` del API de salud), sin sustituirlo por texto de predicción ML.

- El título principal de la card **SHALL** ser el nombre del componente.
- El subtítulo **SHALL** indicar nivel (`Crítico` / `Urgente`) y `%` de salud del snapshot.
- El nombre del servicio de catálogo (`servicios_asociados` / `servicio_sugerido`) **SHALL** mostrarse como línea secundaria solo si existe un servicio con `id`.
- Textos de predicción ML (`recomendacion`) **SHALL** usarse como hint opcional, nunca como título ni nombre de servicio.

#### Scenario: Componente sin servicio en catálogo
- GIVEN un componente `CRITICO` sin `servicios_asociados` compatibles
- WHEN se renderiza la card
- THEN el título sigue siendo el nombre del componente (p. ej. «Neumáticos»)
- AND no se muestra «En óptimo estado» ni «Programar mantención» como título
- AND el CTA abre solicitud abierta con descripción basada en el componente

### REQ-HOME-HEALTH-SUGERIDO-SOURCE
Los datos **SHALL** provenir del mismo reporte que `VehicleHealthScreen` (`GET /vehiculos/health/vehicle/{id}/`) más predicciones ML solo para enriquecer km/hint, no para decidir elegibilidad.
