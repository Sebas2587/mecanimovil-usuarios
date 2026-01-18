# Estructura de Pantallas - MecaniMóvil

Esta carpeta contiene todas las pantallas de la aplicación organizadas por funcionalidades para mejorar la mantenibilidad y organización del código.

## 📁 Estructura Organizacional

### 🔐 `auth/` - Autenticación
- `LoginScreen.js` - Pantalla de inicio de sesión
- `RegisterScreen.js` - Pantalla de registro de usuario

### 👤 `profile/` - Perfil de Usuario
- `UserProfileScreen.js` - Pantalla principal del perfil de usuario
- `EditProfileScreen.js` - Pantalla de edición de perfil

### 🚗 `vehicles/` - Gestión de Vehículos
- `MisVehiculosScreen.js` - Lista y gestión de vehículos del usuario
- `AddAddressScreen.js` - Agregar nueva dirección
- `VehicleProvidersScreen.js` - Proveedores para un vehículo específico

### 🏢 `providers/` - Proveedores de Servicios
- `TalleresScreen.js` - Lista de talleres disponibles
- `MecanicosScreen.js` - Lista de mecánicos a domicilio
- `ProviderDetailScreen.js` - Detalle de un proveedor específico
- `ProviderReviewsScreen.js` - Reseñas de un proveedor

### 📅 `booking/` - Agendamiento y Reservas
- `AgendamientoScreen.js` - Flujo principal de agendamiento
- `AgendamientoFlowScreen.js` - Flujo modal de agendamiento
- `DateTimePickerScreen.js` - Selector de fecha y hora
- `BookingCartScreen.js` - Carrito de servicios
- `BookingConfirmationScreen.js` - Confirmación de agendamiento

### 📋 `appointments/` - Citas y Agendamientos
- `ActiveAppointmentsScreen.js` - Agendamientos activos
- `AppointmentDetailScreen.js` - Detalle de una cita específica
- `ServiceHistoryScreen.js` - Historial de servicios
- `MisCitasScreen.js` - Lista de todas las citas del usuario

### ⭐ `reviews/` - Reseñas y Calificaciones
- `PendingReviewsScreen.js` - Reseñas pendientes por realizar
- `CreateReviewScreen.js` - Crear nueva reseña

### 🆘 `support/` - Soporte y Términos
- `SupportScreen.js` - Pantalla de soporte al cliente
- `TermsScreen.js` - Términos y condiciones

### 🏠 `main/` - Pantalla Principal
- `UserPanelScreen.js` - Panel principal del usuario (Home)

## 📦 Imports

Cada carpeta tiene un archivo `index.js` que exporta todas las pantallas de esa funcionalidad, facilitando los imports:

```javascript
// Import individual
import { LoginScreen } from '../screens/auth';

// Import múltiple
import { LoginScreen, RegisterScreen } from '../screens/auth';

// Import desde la raíz
import { LoginScreen } from '../screens';
```

## 🔄 Migración

Todas las referencias de navegación han sido actualizadas para usar la nueva estructura. Los imports en `AppNavigator.js` y `AuthNavigator.js` ya reflejan la nueva organización.

## 🧹 Limpieza Realizada

Se eliminaron las siguientes pantallas no utilizadas:
- `SettingsScreen` - Era solo un placeholder sin funcionalidad real
- `MechanicDashboardScreen` - Era solo un placeholder sin funcionalidad real

Estas pantallas estaban definidas como placeholders temporales y no tenían navegación real en la aplicación.

## ✅ Beneficios

1. **Organización clara**: Cada funcionalidad tiene su propia carpeta
2. **Mantenibilidad**: Fácil localizar y modificar pantallas relacionadas
3. **Escalabilidad**: Fácil agregar nuevas pantallas a funcionalidades existentes
4. **Imports limpios**: Archivos index.js facilitan los imports
5. **Separación de responsabilidades**: Cada carpeta tiene un propósito específico
