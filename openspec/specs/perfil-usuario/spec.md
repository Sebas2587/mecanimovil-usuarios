# perfil-usuario Specification

## Purpose
Tab **Cuenta** del rediseño Airbnb: perfil, pagos, favoritos, reseñas, soporte y legal. Canvas `#f2f6fe`, tipografía Poppins, Lucide.

## Requirements

### Requirement: Tab Cuenta
El tab Profile/Cuenta **SHALL** ser uno de los 4 tabs principales (Inicio, Agendar, Actividad, Cuenta).

#### Scenario: Abrir cuenta
- GIVEN usuario autenticado
- WHEN toca tab Cuenta
- THEN ve MemberCard y menú de gestión/soporte sin botón atrás

### Requirement: Ver y editar perfil
El usuario puede ver y modificar su información personal.

#### Scenario: Perfil cargado
- GIVEN un usuario autenticado
- CUANDO accede a su perfil
- THEN ve nombre, email, foto y datos de contacto

#### Scenario: Editar nombre o teléfono
- GIVEN el usuario en su perfil
- CUANDO edita un campo y confirma
- THEN los datos se guardan en el backend
- AND ve confirmación visual

### Requirement: Foto de perfil
El usuario puede cambiar su foto desde cámara o galería.

#### Scenario: Cambiar foto
- GIVEN el usuario en su perfil
- CUANDO toca su foto y selecciona imagen
- THEN la imagen se sube y actualiza en el perfil

### Requirement: Cerrar sesión
El usuario puede cerrar sesión de forma segura.

#### Scenario: Logout exitoso
- GIVEN un usuario autenticado
- CUANDO toca "Cerrar sesión"
- THEN los tokens se eliminan
- AND se redirige a la pantalla de login

### Requirement: Sin marketplace en cuenta
El menú de Cuenta **SHALL NOT** incluir acceso a marketplace público de compra/venta de vehículos. Transferencia de vehículo vive en la ficha del vehículo.
