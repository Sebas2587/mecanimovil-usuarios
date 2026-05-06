# perfil-usuario Specification

## Purpose
Pantalla de perfil del usuario final. Permite ver y editar datos personales,
foto de perfil y acceder a configuraciones de la cuenta.

## Requirements

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
