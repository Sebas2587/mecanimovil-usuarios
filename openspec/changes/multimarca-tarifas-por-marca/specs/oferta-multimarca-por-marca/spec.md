# oferta-multimarca-por-marca (usuarios)

## Purpose
Ficha pública, perfil autenticado y agendamiento muestran el precio de oferta resuelto para la marca del vehículo del cliente.

## Requirements

### REQ-CLI-RESOLUCION
WHEN el cliente abre el perfil de un proveedor multimarca con vehículo activo marca X, THEN cada servicio SHALL mostrar precio de oferta específica para X o, si no existe, precio base genérico.

### REQ-CLI-SIN-VEHICULO
WHEN no hay vehículo seleccionado, THEN la ficha SHALL agrupar ofertas por servicio y mostrar «Desde $X» si hay precios distintos por marca.

### REQ-CLI-AGENDA
WHEN el cliente agenda desde el perfil, THEN `oferta_id` y precios SHALL corresponder a la oferta resuelta para su vehículo.

Ver spec backend en `mecanimovil-backend/openspec/changes/multimarca-tarifas-por-marca/`.
