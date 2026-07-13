# vehicle-transfer Specification (delta)

Reemplaza marketplace público. Solo transferencia P2P con traspaso de historial.

## ADDED Requirements

### Requirement: Entrada única desde ficha
La transferencia **SHALL** iniciarse solo desde VehicleProfileScreen con CTA "Transferir vehículo".

#### Scenario: Acceso desde perfil vehículo
- GIVEN un vehículo registrado
- WHEN el usuario toca "Transferir vehículo" en VehicleProfile
- THEN navega a pantalla de resumen de transferencia antes del QR

### Requirement: Resumen de datos traspasados
Antes de generar o escanear QR, la app **SHALL** mostrar qué se transfiere: historial de servicios, estado de salud, kilometraje, documentos asociados.

#### Scenario: Vendedor antes de QR
- GIVEN el dueño actual en flujo vendedor
- WHEN confirma transferencia
- THEN ve lista resumida de historial y salud que recibirá el comprador

#### Scenario: Comprador tras escaneo
- GIVEN transferencia exitosa en TransferenciaExitoScreen
- WHEN se completa
- THEN el vehículo aparece en cuenta del comprador con historial heredado

### Requirement: Flujo QR sin distracciones
TransferenciaVendedorScreen y TransferenciaCompradorScreen **SHALL** usar plantilla Focus: sin tab bar, AppHeader mínimo o fullscreen, fondo canvas.

#### Scenario: Escanear QR comprador
- GIVEN TransferenciaCompradorScreen
- WHEN se abre la cámara
- THEN UI minimalista: marco QR, instrucción caption, sin cards adicionales

### Requirement: Sin marketplace público
La app **SHALL NOT** consumir endpoints de listado público de vehículos ni mostrar exploración de autos en venta.

#### Scenario: Tab bar sin marketplace
- GIVEN usuario autenticado
- WHEN revisa tabs
- THEN no existe destino de compra/venta pública de vehículos

### Requirement: Chat marketplace deprecado
Los chats de negociación marketplace **SHALL** eliminarse del inbox; solo chats de servicio permanecen.

#### Scenario: Inbox Actividad
- GIVEN tab Actividad segmento Mensajes
- WHEN lista conversaciones
- THEN solo tipo service, sin segmento marketplace
