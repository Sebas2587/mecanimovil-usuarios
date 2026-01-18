# 📱 MecaniMóvil App Usuarios - Funcionamiento Completo

## 🎯 Resumen Ejecutivo

MecaniMóvil App Usuarios es una aplicación móvil desarrollada en React Native con Expo que permite a los usuarios buscar, agendar y gestionar servicios mecánicos tanto en talleres como a domicilio. La aplicación se conecta directamente con el **backend Django** ubicado en `mecanimovil-backend/` a través de APIs RESTful y proporciona una experiencia de usuario intuitiva y moderna.

### 🔗 Conexión con el Ecosistema MecaniMóvil

Esta aplicación es parte de un ecosistema completo que incluye:

1. **MecaniMóvil Backend** (`mecanimovil-backend/`)
   - **Conexión**: APIs REST en `http://localhost:8000/api/`
   - **Función**: Gestión de datos, autenticación, lógica de negocio
   - **Datos compartidos**: Usuarios, vehículos, servicios, órdenes

2. **MecaniMóvil App Proveedores** (`mecanimovil-proveedores/mecanimovil-app-proveedores/`)
   - **Conexión**: Indirecta a través del backend compartido
   - **Función**: Los talleres y mecánicos registrados aparecen en esta app
   - **Sincronización**: Ofertas de servicios y disponibilidad en tiempo real

### 🎯 Funcionalidades Principales

- **Búsqueda Inteligente**: Encuentra talleres y mecánicos cercanos
- **Gestión de Vehículos**: Administra múltiples vehículos con detalles completos
- **Sistema de Carritos**: Agrega múltiples servicios antes de confirmar
- **Agendamiento Flexible**: Selecciona fecha, hora y tipo de servicio
- **Seguimiento en Tiempo Real**: Monitorea el estado de las órdenes
- **Perfil Personalizado**: Historial, preferencias y recomendaciones

---

## 🏗️ Arquitectura Frontend

### **Stack Tecnológico Principal**

| Tecnología | Versión | Propósito | Conexión Backend |
|------------|---------|-----------|------------------|
| **React Native** | 0.79.2 | Framework de desarrollo móvil | - |
| **Expo** | ~53.0.9 | Plataforma de desarrollo y despliegue | - |
| **React** | 19.0.0 | Librería base de componentes | - |
| **React Navigation** | ^7.1.9 | Sistema de navegación | - |
| **Axios** | ^1.9.0 | Cliente HTTP para APIs | ↔️ Django REST Framework |
| **AsyncStorage** | ^2.1.2 | Almacenamiento local persistente | Cache de tokens JWT |
| **Vector Icons** | ^10.2.0 | Iconografía de la aplicación | - |
| **Linear Gradient** | ^14.1.4 | Efectos visuales de gradientes | - |
| **Expo Location** | ~18.1.5 | Servicios de geolocalización | ↔️ PostGIS Backend |
| **Expo Image Picker** | ^16.1.4 | Selección de imágenes | ↔️ Media uploads |
| **Expo Notifications** | ^0.31.2 | Sistema de notificaciones | ↔️ Backend notifications |

### **Librerías de UI y UX**

| Librería | Función | Implementación |
|----------|---------|---------------|
| **react-native-elements** | Componentes UI base | Botones, inputs, cards |
| **react-native-super-grid** | Grids responsivos | Listado de categorías y servicios |
| **react-native-gesture-handler** | Gestos táctiles | Swipes, pan gestures |
| **react-native-reanimated** | Animaciones fluidas | Transiciones de pantalla |
| **expo-blur** | Efectos glassmorphic | Fondos translúcidos |
| **react-native-safe-area-context** | Manejo de áreas seguras | Compatibilidad con notch/island |

---

## 📁 Estructura del Proyecto

```
mecanimovil-app/
├── App.js                           # Punto de entrada principal
├── index.js                        # Registro de la aplicación
├── app.json                        # Configuración de Expo
├── package.json                     # Dependencias del proyecto
├── app/                             # Código fuente principal
│   ├── navigation/                  # 🧭 Sistema de navegación
│   │   ├── AppNavigator.js          # Navegación autenticada
│   │   └── AuthNavigator.js         # Navegación de autenticación
│   ├── screens/                     # 📱 Pantallas principales
│   │   ├── UserPanelScreen.js       # Dashboard principal
│   │   ├── LoginScreen.js           # Autenticación → Backend JWT
│   │   ├── RegisterScreen.js        # Registro → POST /usuarios/register/
│   │   ├── TalleresScreen.js        # Lista → GET /usuarios/talleres/
│   │   ├── MecanicosScreen.js       # Lista → GET /usuarios/mecanicos/
│   │   ├── ProviderDetailScreen.js  # Detalle → GET /servicios/ofertas/
│   │   ├── MisVehiculosScreen.js    # Gestión → GET/POST /vehiculos/
│   │   ├── UserProfileScreen.js     # Perfil del usuario
│   │   ├── MisCitasScreen.js        # Historial → GET /ordenes/solicitudes/
│   │   ├── AgendamientoFlowScreen.js # Flujo modal de agendamiento
│   │   └── ...                      # Otras pantallas
│   ├── components/                  # ⚙️ Componentes reutilizables
│   │   ├── common/                  # Componentes básicos
│   │   │   ├── Button.js            # Botón personalizado
│   │   │   ├── Input.js             # Input personalizado
│   │   │   ├── Card.js              # Tarjeta base
│   │   │   ├── VehicleSelector.js   # Selector de vehículos
│   │   │   └── LoadingSpinner.js    # Indicador de carga
│   │   ├── agendamiento/            # Componentes de agendamiento
│   │   │   ├── FlujoAgendamiento.js # Componente principal del flujo
│   │   │   ├── ConfiguradorServicio.js # Configuración de servicios
│   │   │   ├── SelectorFechaHora.js # Selector de fecha/hora
│   │   │   ├── CarritoAgendamiento.js # Vista del carrito
│   │   │   └── OpcionesPago.js      # Opciones de pago
│   │   ├── GlassmorphicContainer.js # Container con efecto glass
│   │   ├── VehicleSelectionModal.js # Modal de selección vehículo
│   │   └── CategoriesHierarchy.js   # Navegación de categorías
│   ├── context/                     # 🔄 Contextos globales
│   │   ├── AuthContext.js           # Estado de autenticación ↔️ JWT Backend
│   │   ├── AgendamientoContext.js   # Estado de agendamiento ↔️ Carritos API
│   │   └── BookingCartContext.js    # Carrito local (legacy)
│   ├── services/                    # 🌐 Servicios de comunicación
│   │   ├── api.js                   # Cliente HTTP base → Backend
│   │   ├── authService.js           # Servicios de autenticación
│   │   ├── agendamientoService.js   # Servicios de agendamiento
│   │   ├── categories.js            # Servicios de categorías
│   │   └── vehiculos.js             # Servicios de vehículos
│   ├── utils/                       # 🛠️ Utilidades
│   │   ├── constants.js             # Constantes globales
│   │   ├── validation.js            # Validaciones de formularios
│   │   ├── dateUtils.js             # Utilidades de fecha
│   │   └── storage.js               # Gestión de almacenamiento
│   └── assets/                      # 🎨 Recursos estáticos
│       ├── images/                  # Imágenes
│       ├── icons/                   # Iconos personalizados
│       └── fonts/                   # Fuentes tipográficas
├── assets/                          # Assets de Expo
│   ├── icon.png                     # Icono de la app
│   ├── splash.png                   # Pantalla de carga
│   └── adaptive-icon.png            # Icono adaptativo Android
├── docs/                           # 📚 Documentación
│   └── flujo_funcionamiento_app_usuarios.md
├── node_modules/                    # Dependencias instaladas
├── .expo/                          # Configuración de Expo
├── .git/                           # Control de versiones
├── package-lock.json               # Lock de dependencias
└── .gitignore                      # Archivos ignorados
```

### **🔗 Archivos de Conexión con Backend**

#### **app/services/api.js** - Cliente HTTP Principal
```javascript
const BASE_URL = 'http://10.0.2.2:8000/api'; // Android Emulator
// const BASE_URL = 'http://localhost:8000/api'; // iOS Simulator
// Conexión directa con mecanimovil-backend Django

// Interceptores automáticos para JWT
// Renovación automática de tokens
// Manejo de errores HTTP
```

#### **app/context/AuthContext.js** - Autenticación Global
```javascript
// Endpoints utilizados:
// POST /api/auth/token/ - Login
// POST /api/auth/token/refresh/ - Renovar token
// POST /api/usuarios/register/ - Registro

// Almacenamiento persistente de tokens JWT
// Estado global de autenticación
```

#### **app/context/AgendamientoContext.js** - Gestión de Carritos
```javascript
// Endpoints utilizados:
// GET/POST /api/ordenes/carritos/ - Gestión de carritos
// POST /api/ordenes/carritos/{id}/agregar_servicio/
// POST /api/ordenes/carritos/{id}/confirmar_agendamiento/

// Estado global del sistema de agendamiento
// Sincronización con backend en tiempo real
```

---

## 🚀 Configuración y Punto de Entrada

### **App.js - Configuración Principal**

```javascript
import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './app/context/AuthContext';
import { AgendamientoProvider } from './app/context/AgendamientoContext';
import { BookingCartProvider } from './app/context/BookingCartContext';
import AuthNavigator from './app/navigation/AuthNavigator';
import AppNavigator from './app/navigation/AppNavigator';

// Componente principal con manejo de errores
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const errorHandler = (error) => {
      console.error("Error capturado:", error);
      setHasError(true);
      return true;
    };
    
    global.ErrorUtils.setGlobalHandler(errorHandler);
    return () => global.ErrorUtils.setGlobalHandler(null);
  }, []);
  
  if (hasError) {
    return <ErrorScreen />;
  }
  
  return children;
};

// Navegación basada en estado de autenticación
const Main = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  
  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

// Configuración de proveedores globales
export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <AgendamientoProvider>
            <BookingCartProvider>
              <Main />
            </BookingCartProvider>
          </AgendamientoProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
```

**Características del punto de entrada:**
- **ErrorBoundary**: Captura errores globales y muestra pantalla de error
- **Múltiples Providers**: Contextos anidados para gestión de estado global
- **Navegación Condicional**: Cambia entre AuthNavigator y AppNavigator según autenticación
- **SafeAreaProvider**: Manejo de áreas seguras en dispositivos modernos

---

## 🧭 Sistema de Navegación

### **Estructura de Navegación**

```javascript
// Navegación principal (autenticado)
AppNavigator (Stack)
├── TabNavigator (Bottom Tabs)
│   ├── UserPanelScreen (Home)
│   ├── MisCitasScreen (Citas)
│   └── ProfileStackNavigator (Perfil)
│       ├── UserProfileScreen
│       ├── MisVehiculosScreen
│       ├── ActiveAppointmentsScreen
│       └── EditProfileScreen
├── TalleresScreen
├── MecanicosScreen
├── ProviderDetailScreen
├── AgendamientoFlowScreen (Modal)
└── ...otras pantallas

// Navegación de autenticación
AuthNavigator (Stack)
├── LoginScreen
└── RegisterScreen
```

### **AppNavigator.js - Navegación Principal**

```javascript
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Configuración de headers personalizados
const getHeaderOptions = (title) => ({
  title,
  headerStyle: {
    backgroundColor: '#FFFFFF',
    height: Platform.OS === 'ios' ? 120 : 100,
    elevation: 2,
  },
  headerTitleStyle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerLeft: ({ onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.backButton}>
      <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
    </TouchableOpacity>
  ),
});

// Navegador de tabs inferior
const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        const iconName = getTabIcon(route.name, focused);
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textLight,
    })}
  >
    <Tab.Screen name="Home" component={UserPanelScreen} />
    <Tab.Screen name="MisCitas" component={MisCitasScreen} />
    <Tab.Screen name="Profile" component={ProfileStackNavigator} />
  </Tab.Navigator>
);
```

**Características de navegación:**
- **Stack Navigation**: Para flujos lineales y modales
- **Tab Navigation**: Para navegación principal con 3 tabs
- **Headers Personalizados**: Diseño consistente con botones de retroceso
- **Iconografía Dinámica**: Icons que cambian según estado activo/inactivo
- **Rutas Tipificadas**: Constantes para nombres de rutas

---

## 🎨 Sistema de Diseño y UI

### **Constantes de Diseño**

```javascript
// utils/constants.js
export const COLORS = {
  primary: '#2A4065',
  secondary: '#46B5E8',
  accent: '#F5A623',
  background: '#F8F9FA',
  white: '#FFFFFF',
  text: '#333333',
  textLight: '#666666',
  success: '#28A745',
  warning: '#FFC107',
  error: '#DC3545',
  border: '#E9ECEF',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  small: 12,
  caption: 14,
  body: 16,
  h4: 18,
  h3: 20,
  h2: 24,
  h1: 28,
};

export const ROUTES = {
  // Rutas de autenticación
  LOGIN: 'Login',
  REGISTER: 'Register',
  
  // Rutas principales
  HOME: 'Home',
  TALLERES: 'Talleres',
  MECANICOS: 'Mecanicos',
  PROVIDER_DETAIL: 'ProviderDetail',
  
  // Rutas de agendamiento
  AGENDAMIENTO_FLOW: 'AgendamientoFlow',
  BOOKING_CART: 'BookingCart',
  
  // Rutas de perfil
  PROFILE: 'Profile',
  MY_VEHICLES: 'MyVehicles',
  ACTIVE_APPOINTMENTS: 'ActiveAppointments',
};
```

### **Componentes de UI Reutilizables**

#### **GlassmorphicContainer.js**
```javascript
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const GlassmorphicContainer = ({ children, scrollable = false }) => {
  const Container = scrollable ? ScrollView : View;
  
  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.gradient}
    >
      <BlurView intensity={20} style={styles.blur}>
        <Container style={styles.container}>
          {children}
        </Container>
      </BlurView>
    </LinearGradient>
  );
};

// Proporciona fondo con efecto glassmorphic para toda la app
```

#### **Button.js - Botón Personalizado**
```javascript
const Button = ({ 
  title, 
  onPress, 
  type = 'primary', 
  size = 'medium',
  isLoading = false,
  disabled = false,
  icon,
  style 
}) => {
  const buttonStyle = [
    styles.button,
    styles[type], // primary, secondary, outline, link
    styles[size], // small, medium, large
    disabled && styles.disabled,
    style
  ];
  
  return (
    <TouchableOpacity 
      style={buttonStyle} 
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color="white" />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={20} color="white" />}
          <Text style={styles.text}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
```

#### **Input.js - Input Personalizado**
```javascript
const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  icon,
  style
}) => {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {icon && <Ionicons name={icon} size={20} color={COLORS.textLight} />}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          placeholderTextColor={COLORS.textLight}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};
```

---

## 🔐 Sistema de Autenticación

### **AuthContext.js - Contexto de Autenticación**

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { post } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: true,
    registerSuccess: false,
  });

  // Inicialización - verificar token almacenado
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        setState(prev => ({
          ...prev,
          token,
          user: JSON.parse(userData),
          isAuthenticated: true,
          loading: false,
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Función de login
  const login = async (username, password) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const response = await post('/auth/token/', {
        username,
        password,
      });

      const { access, refresh, user } = response;

      // Almacenar tokens y datos de usuario
      await AsyncStorage.setItem('authToken', access);
      await AsyncStorage.setItem('refreshToken', refresh);
      await AsyncStorage.setItem('userData', JSON.stringify(user));

      setState(prev => ({
        ...prev,
        token: access,
        user,
        isAuthenticated: true,
        loading: false,
      }));

      return true;
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  };

  // Función de logout
  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        registerSuccess: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Función de registro
  const register = async (userData) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const response = await post('/usuarios/register/', userData);
      
      setState(prev => ({
        ...prev,
        loading: false,
        registerSuccess: true,
      }));
      
      return { success: true, user: response };
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      return { 
        success: false, 
        error: error.response?.data || 'Error en el registro' 
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

**Características del sistema de autenticación:**
- **Persistencia**: Tokens almacenados en AsyncStorage
- **Auto-login**: Verificación automática al iniciar la app
- **Refresh Token**: Renovación automática de tokens expirados
- **Estado Global**: Usuario disponible en toda la aplicación
- **Manejo de Errores**: Gestión robusta de errores de red y validación

---

## 🛠️ Servicios de Comunicación con Backend

### **api.js - Cliente HTTP Base**

```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://10.0.2.2:8000/api'; // Android Emulator
// const BASE_URL = 'http://localhost:8000/api'; // iOS Simulator

// Crear instancia de axios
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token automáticamente
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejo de respuestas y renovación de tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          
          const { access } = response.data;
          await AsyncStorage.setItem('authToken', access);
          
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Token inválido, redirigir a login
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
        // Aquí podrías disparar un evento para que el AuthContext se actualice
      }
    }
    
    return Promise.reject(error);
  }
);

// Funciones de conveniencia
export const get = async (url, params = {}) => {
  const response = await apiClient.get(url, { params });
  return response.data;
};

export const post = async (url, data = {}) => {
  const response = await apiClient.post(url, data);
  return response.data;
};

export const put = async (url, data = {}) => {
  const response = await apiClient.put(url, data);
  return response.data;
};

export const del = async (url) => {
  const response = await apiClient.delete(url);
  return response.data;
};

export default apiClient;
```

### **agendamientoService.js - Servicios de Agendamiento**

```javascript
import { get, post } from './api';

class AgendamientoService {
  // Obtener o crear carrito activo para un vehículo
  async obtenerOCrearCarrito(vehiculoId) {
    try {
      // Intentar obtener carrito activo existente
      const carritoExistente = await get('/ordenes/carritos/activo/', {
        vehiculo_id: vehiculoId
      });
      return carritoExistente;
    } catch (error) {
      if (error.response?.status === 404) {
        // No existe carrito, crear uno nuevo
        return await post('/ordenes/carritos/', {
          vehiculo_id: vehiculoId
        });
      }
      throw error;
    }
  }

  // Agregar servicio al carrito
  async agregarServicioAlCarrito(carritoId, ofertaServicioId, conRepuestos, cantidad = 1) {
    return await post(`/ordenes/carritos/${carritoId}/agregar_servicio/`, {
      oferta_servicio_id: ofertaServicioId,
      con_repuestos: conRepuestos,
      cantidad
    });
  }

  // Seleccionar fecha y hora para el servicio
  async seleccionarFechaHora(carritoId, fecha, hora) {
    return await post(`/ordenes/carritos/${carritoId}/seleccionar_fecha_hora/`, {
      fecha_servicio: fecha,
      hora_servicio: hora
    });
  }

  // Confirmar agendamiento final
  async confirmarAgendamiento(carritoId, metodoPago, aceptaTerminos) {
    return await post(`/ordenes/carritos/${carritoId}/confirmar_agendamiento/`, {
      metodo_pago: metodoPago,
      acepta_terminos: aceptaTerminos,
      notas_cliente: ''
    });
  }

  // Obtener horarios disponibles de un taller
  async obtenerHorariosTaller(tallerId, fecha) {
    return await get(`/usuarios/talleres/${tallerId}/horarios_disponibles/`, {
      fecha
    });
  }

  // Obtener todos los carritos del usuario (vista global)
  async obtenerTodosLosCarritos() {
    return await get('/ordenes/carritos/');
  }

  // Obtener solicitudes del usuario
  async obtenerSolicitudesUsuario() {
    return await get('/ordenes/solicitudes/');
  }

  // Remover servicio del carrito
  async removerServicioDelCarrito(carritoId, itemId) {
    return await post(`/ordenes/carritos/${carritoId}/remover_servicio/`, {
      item_id: itemId
    });
  }
}

export default new AgendamientoService();
```

**Características de los servicios:**
- **Singleton Pattern**: Instancia única del servicio
- **Manejo de Errores**: Try-catch apropiado con fallbacks
- **Métodos Específicos**: Cada operación de negocio tiene su método
- **Parámetros Tipificados**: Claridad en los parámetros requeridos
- **Responses Consistentes**: Siempre retorna los datos del response

---

## 📱 Pantallas Principales de la Aplicación

### **UserPanelScreen.js - Dashboard Principal**

```javascript
const UserPanelScreen = () => {
  const { user } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [talleresCercanos, setTalleresCercanos] = useState([]);
  const [serviciosPopulares, setServiciosPopulares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      const [categoriasData, talleresData, serviciosData] = await Promise.all([
        get('/servicios/categorias/'),
        get('/usuarios/talleres/'),
        get('/servicios/servicios/populares/')
      ]);
      
      setCategorias(categoriasData);
      setTalleresCercanos(talleresData.slice(0, 5));
      setServiciosPopulares(serviciosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  const renderCategoriaItem = ({ item }) => (
    <TouchableOpacity
      style={styles.categoriaCard}
      onPress={() => navigation.navigate(ROUTES.TALLERES, { categoria: item })}
    >
      <View style={styles.categoriaIcon}>
        <Ionicons name={item.icono || 'build'} size={24} color={COLORS.primary} />
      </View>
      <Text style={styles.categoriaNombre}>{item.nombre}</Text>
    </TouchableOpacity>
  );

  return (
    <GlassmorphicContainer scrollable>
      <SafeAreaView style={styles.container}>
        {/* Header con saludo personalizado */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola, {user?.first_name || 'Usuario'}</Text>
          <Text style={styles.subGreeting}>¿Qué servicio necesitas hoy?</Text>
        </View>

        {/* Categorías principales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorías</Text>
          <FlatList
            data={categorias}
            renderItem={renderCategoriaItem}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriasList}
          />
        </View>

        {/* Accesos rápidos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
          <View style={styles.quickAccessGrid}>
            <QuickAccessButton
              title="Talleres"
              icon="business"
              onPress={() => navigation.navigate(ROUTES.TALLERES)}
            />
            <QuickAccessButton
              title="Mecánicos"
              icon="person"
              onPress={() => navigation.navigate(ROUTES.MECANICOS)}
            />
            <QuickAccessButton
              title="Mis Vehículos"
              icon="car"
              onPress={() => navigation.navigate(ROUTES.MY_VEHICLES)}
            />
            <QuickAccessButton
              title="Mis Citas"
              icon="calendar"
              onPress={() => navigation.navigate(ROUTES.ACTIVE_APPOINTMENTS)}
            />
          </View>
        </View>

        {/* Talleres cercanos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Talleres Cercanos</Text>
          {talleresCercanos.map(taller => (
            <TallerCard
              key={taller.id}
              taller={taller}
              onPress={() => navigation.navigate(ROUTES.PROVIDER_DETAIL, {
                provider: taller,
                type: 'taller'
              })}
            />
          ))}
        </View>
      </SafeAreaView>
    </GlassmorphicContainer>
  );
};
```

**Funcionalidades del Dashboard:**
- **Saludo Personalizado**: Muestra el nombre del usuario autenticado
- **Categorías Horizontales**: Scroll horizontal con iconos de categorías
- **Accesos Rápidos**: Grid 2x2 con botones de navegación principal
- **Talleres Cercanos**: Lista de talleres recomendados con calificaciones
- **Carga Progresiva**: Estados de loading, error y datos cargados

### **TalleresScreen.js - Lista de Talleres**

```javascript
const TalleresScreen = () => {
  const [talleres, setTalleres] = useState([]);
  const [filteredTalleres, setFilteredTalleres] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarTalleres();
  }, []);

  const cargarTalleres = async () => {
    try {
      const data = await get('/usuarios/talleres/');
      setTalleres(data);
      setFilteredTalleres(data);
    } catch (error) {
      console.error('Error cargando talleres:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    filtrarTalleres(query, selectedFilter);
  };

  const filtrarTalleres = (query, filter) => {
    let filtered = talleres;

    // Filtro por texto
    if (query) {
      filtered = filtered.filter(taller =>
        taller.nombre.toLowerCase().includes(query.toLowerCase()) ||
        taller.direccion.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Filtro por tipo
    if (filter !== 'todos') {
      switch (filter) {
        case 'mejor_calificados':
          filtered = filtered.filter(t => t.calificacion_promedio >= 4.0);
          break;
        case 'cercanos':
          // Aquí iría lógica de geolocalización
          break;
      }
    }

    setFilteredTalleres(filtered);
  };

  const renderTallerItem = ({ item }) => (
    <TallerCard
      taller={item}
      onPress={() => navigation.navigate(ROUTES.PROVIDER_DETAIL, {
        provider: item,
        type: 'taller'
      })}
      showDistance={true}
    />
  );

  return (
    <GlassmorphicContainer>
      <SafeAreaView style={styles.container}>
        {/* Header con búsqueda */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Talleres</Text>
        </View>

        {/* Barra de búsqueda */}
        <View style={styles.searchContainer}>
          <Input
            placeholder="Buscar talleres..."
            value={searchQuery}
            onChangeText={handleSearch}
            icon="search"
            style={styles.searchInput}
          />
        </View>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filtersContainer}>
            {['todos', 'mejor_calificados', 'cercanos', 'abierto_ahora'].map(filter => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  selectedFilter === filter && styles.filterChipActive
                ]}
                onPress={() => {
                  setSelectedFilter(filter);
                  filtrarTalleres(searchQuery, filter);
                }}
              >
                <Text style={styles.filterText}>{getFilterLabel(filter)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Lista de talleres */}
        <FlatList
          data={filteredTalleres}
          renderItem={renderTallerItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.tallersList}
          refreshing={loading}
          onRefresh={cargarTalleres}
        />
      </SafeAreaView>
    </GlassmorphicContainer>
  );
};
```

### **ProviderDetailScreen.js - Detalle del Proveedor**

```javascript
const ProviderDetailScreen = () => {
  const route = useRoute();
  const { provider, type } = route.params; // 'taller' o 'mecanico'
  
  const [serviciosReales, setServiciosReales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showAgendamientoFlow, setShowAgendamientoFlow] = useState(false);

  useEffect(() => {
    loadProviderServices();
  }, [provider.id, type]);

  const loadProviderServices = async () => {
    try {
      let response;
      if (type === 'taller') {
        response = await get(`/servicios/ofertas/por_taller/?taller=${provider.id}`);
      } else {
        response = await get(`/servicios/ofertas/por_mecanico/?mecanico=${provider.id}`);
      }
      
      const serviciosMap = new Map();
      
      // Procesar ofertas y agrupar por servicio
      for (const oferta of response) {
        const servicioId = oferta.servicio;
        const servicioCompleto = await get(`/servicios/servicios/${servicioId}/`);
        
        if (!serviciosMap.has(servicioId)) {
          serviciosMap.set(servicioId, {
            ...servicioCompleto,
            ofertas_disponibles: []
          });
        }
        
        serviciosMap.get(servicioId).ofertas_disponibles.push({
          ...oferta,
          tipo_proveedor: type,
          [type === 'taller' ? 'taller_info' : 'mecanico_info']: provider
        });
      }
      
      setServiciosReales(Array.from(serviciosMap.values()));
    } catch (error) {
      console.error('Error cargando servicios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServicePress = (servicio) => {
    setSelectedServiceForBooking(servicio);
    setShowVehicleModal(true);
  };

  const handleVehicleSelected = async (vehiculo) => {
    setShowVehicleModal(false);
    
    // Preparar servicio con proveedor preseleccionado
    const servicioParaFlujo = {
      ...selectedServiceForBooking,
      ofertas_disponibles: selectedServiceForBooking.ofertas_disponibles.map(oferta => ({
        ...oferta,
        proveedor_preseleccionado: true
      }))
    };

    // Navegar al flujo de agendamiento
    navigation.navigate('AgendamientoFlow', {
      servicio: servicioParaFlujo,
      vehiculo: vehiculo
    });
  };

  return (
    <GlassmorphicContainer scrollable>
      <SafeAreaView style={styles.container}>
        {/* Header con imagen de fondo */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: provider.foto_perfil || DEFAULT_PROVIDER_IMAGE }}
            style={styles.providerImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageOverlay}
          />
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{provider.nombre}</Text>
            <Text style={styles.providerAddress}>{provider.direccion}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>
                {provider.calificacion_promedio.toFixed(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Información del proveedor */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Información</Text>
          <View style={styles.infoGrid}>
            <InfoItem
              icon="call"
              label="Teléfono"
              value={provider.telefono}
            />
            <InfoItem
              icon="time"
              label="Horarios"
              value={provider.horario_atencion || "Lunes a Viernes 8:00-18:00"}
            />
            {type === 'taller' && (
              <InfoItem
                icon="car"
                label="Capacidad"
                value={`${provider.capacidad_diaria} servicios/día`}
              />
            )}
          </View>
        </View>

        {/* Servicios disponibles */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Servicios Disponibles</Text>
          {loading ? (
            <LoadingSpinner />
          ) : (
            serviciosReales.map(servicio => (
              <ServiceCard
                key={servicio.id}
                servicio={servicio}
                onPress={() => handleServicePress(servicio)}
                showPrice={true}
                type={type}
              />
            ))
          )}
        </View>

        {/* Modal de selección de vehículo */}
        <VehicleSelectionModal
          visible={showVehicleModal}
          onClose={() => setShowVehicleModal(false)}
          onVehicleSelected={handleVehicleSelected}
          servicio={selectedServiceForBooking}
        />
      </SafeAreaView>
    </GlassmorphicContainer>
  );
};
```

**Características de ProviderDetailScreen:**
- **Hero Section**: Imagen grande con información superpuesta
- **Información Detallada**: Teléfono, horarios, capacidad
- **Servicios Reales**: Carga ofertas específicas del proveedor desde API
- **Integración con Agendamiento**: Conecta directamente con el flujo de reserva
- **Modal de Vehículos**: Selección de vehículo antes de agendar

---

## 🛒 Sistema de Agendamiento - Contextos de Estado

### **AgendamientoContext.js - Estado Global de Agendamiento**

```javascript
const AgendamientoContext = createContext();

const initialState = {
  carrito: null,                    // Carrito activo específico
  carritos: [],                     // Todos los carritos del usuario
  loading: false,                   // Estado de carga
  error: null,                      // Errores
  pasoActual: 'carrito',           // Paso actual del flujo
  configuracionServicio: null,      // Configuración temporal del servicio
};

export const AgendamientoProvider = ({ children }) => {
  const [state, dispatch] = useReducer(agendamientoReducer, initialState);

  // Cargar carrito activo para un vehículo específico
  const cargarCarritoActivo = async (vehiculoId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const carrito = await agendamientoService.obtenerOCrearCarrito(vehiculoId);
      dispatch({ type: 'SET_CARRITO', payload: carrito });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Cargar todos los carritos del usuario (vista global)
  const cargarTodosLosCarritos = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const carritos = await agendamientoService.obtenerTodosLosCarritos();
      dispatch({ type: 'SET_CARRITOS', payload: carritos });
      return carritos;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return [];
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Agregar servicio al carrito
  const agregarServicio = async (configuracion) => {
    const { ofertaSeleccionada, conRepuestos, serviciosAdicionales, fecha, hora } = configuracion;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Obtener o crear carrito
      const carrito = await agendamientoService.obtenerOCrearCarrito(configuracion.vehiculoId);
      
      // Agregar servicio principal
      await agendamientoService.agregarServicioAlCarrito(
        carrito.id,
        ofertaSeleccionada.id,
        conRepuestos
      );
      
      // Agregar servicios adicionales si los hay
      for (const servicioAdicional of serviciosAdicionales) {
        await agendamientoService.agregarServicioAlCarrito(
          carrito.id,
          servicioAdicional.oferta_id,
          true // Servicios adicionales siempre con repuestos
        );
      }
      
      // Seleccionar fecha y hora si están disponibles
      if (fecha && hora) {
        await agendamientoService.seleccionarFechaHora(carrito.id, fecha, hora);
      }
      
      // Recargar carrito actualizado
      const carritoActualizado = await agendamientoService.obtenerCarrito(carrito.id);
      dispatch({ type: 'SET_CARRITO', payload: carritoActualizado });
      
      return carritoActualizado;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Confirmar agendamiento
  const confirmarAgendamiento = async (carritoId, metodoPago, aceptaTerminos) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const solicitud = await agendamientoService.confirmarAgendamiento(
        carritoId,
        metodoPago,
        aceptaTerminos
      );
      
      // Limpiar carrito actual ya que se convirtió en solicitud
      dispatch({ type: 'SET_CARRITO', payload: null });
      
      return solicitud;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Remover servicio del carrito
  const removerServicio = async (carritoId, itemId) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      await agendamientoService.removerServicioDelCarrito(carritoId, itemId);
      
      // Recargar carrito
      const carritoActualizado = await agendamientoService.obtenerCarrito(carritoId);
      dispatch({ type: 'SET_CARRITO', payload: carritoActualizado });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const value = {
    ...state,
    cargarCarritoActivo,
    cargarTodosLosCarritos,
    agregarServicio,
    confirmarAgendamiento,
    removerServicio,
    dispatch,
  };

  return (
    <AgendamientoContext.Provider value={value}>
      {children}
    </AgendamientoContext.Provider>
  );
};

// Reducer para manejar las acciones del estado
const agendamientoReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_CARRITO':
      return { ...state, carrito: action.payload, error: null };
    case 'SET_CARRITOS':
      return { ...state, carritos: action.payload, error: null };
    case 'SET_PASO_ACTUAL':
      return { ...state, pasoActual: action.payload };
    case 'SET_CONFIGURACION_SERVICIO':
      return { ...state, configuracionServicio: action.payload };
    default:
      return state;
  }
};

export const useAgendamiento = () => {
  const context = useContext(AgendamientoContext);
  if (!context) {
    throw new Error('useAgendamiento must be used within AgendamientoProvider');
  }
  return context;
};
```

**Características del contexto de agendamiento:**
- **Estado Unificado**: Maneja tanto carrito individual como vista global
- **Operaciones Asíncronas**: Todas las llamadas al backend son async/await
- **Reducer Pattern**: Gestión predecible del estado con acciones
- **Error Handling**: Manejo centralizado de errores
- **Loading States**: Estados de carga para UX fluida

---

## 🔄 Flujo Completo de Agendamiento

### **FlujoAgendamiento.js - Componente Principal del Modal**

```javascript
const FlujoAgendamiento = ({ visible, onClose, servicio, vehiculo }) => {
  const [pasoActual, setPasoActual] = useState('configurar_servicio');
  const [configuracionCompleta, setConfiguracionCompleta] = useState(null);
  const [vehiculoActual, setVehiculoActual] = useState(vehiculo);
  
  const PASOS_AGENDAMIENTO = {
    SELECCIONAR_PROVEEDOR: 'seleccionar_proveedor',
    CONFIGURAR_SERVICIO: 'configurar_servicio',
    SELECCIONAR_FECHA_HORA: 'seleccionar_fecha_hora',
    CARRITO: 'carrito',
    OPCIONES_PAGO: 'opciones_pago'
  };

  // Determinar punto de entrada del flujo
  useEffect(() => {
    if (servicio && vehiculo) {
      const esProveedorPreseleccionado = servicio.ofertas_disponibles?.some(
        oferta => oferta.proveedor_preseleccionado
      );
      
      if (esProveedorPreseleccionado) {
        // Viene desde ProviderDetail: saltar a configuración
        setPasoActual(PASOS_AGENDAMIENTO.CONFIGURAR_SERVICIO);
      } else {
        // Flujo normal: empezar desde selección de proveedor
        setPasoActual(PASOS_AGENDAMIENTO.SELECCIONAR_PROVEEDOR);
      }
    } else if (!vehiculo) {
      // Detectar vehículo automáticamente desde carritos existentes
      detectarVehiculo();
    }
  }, [servicio, vehiculo]);

  const detectarVehiculo = async () => {
    const carritos = await cargarTodosLosCarritos();
    const carritoConServicios = carritos.find(c => c.items && c.items.length > 0);
    
    if (carritoConServicios) {
      setVehiculoActual(carritoConServicios.vehiculo_detail);
      setPasoActual(PASOS_AGENDAMIENTO.CARRITO);
    }
  };

  const handleConfiguracionCompleta = (configuracion) => {
    setConfiguracionCompleta(configuracion);
    setPasoActual(PASOS_AGENDAMIENTO.SELECCIONAR_FECHA_HORA);
  };

  const handleFechaHoraSeleccionada = async (fechaHora) => {
    const configuracionFinal = {
      ...configuracionCompleta,
      ...fechaHora,
      vehiculoId: vehiculoActual.id
    };
    
    try {
      await agregarServicio(configuracionFinal);
      setPasoActual(PASOS_AGENDAMIENTO.CARRITO);
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar el servicio al carrito');
    }
  };

  const handleContinuarAPago = () => {
    setPasoActual(PASOS_AGENDAMIENTO.OPCIONES_PAGO);
  };

  const handlePagoCompletado = () => {
    onClose();
    // Navegar a confirmación o dashboard
  };

  const renderPasoActual = () => {
    switch (pasoActual) {
      case PASOS_AGENDAMIENTO.CONFIGURAR_SERVICIO:
        return (
          <ConfiguradorServicio
            servicio={servicio}
            vehiculo={vehiculoActual}
            onConfiguracionCompleta={handleConfiguracionCompleta}
            onVolver={() => setPasoActual(PASOS_AGENDAMIENTO.SELECCIONAR_PROVEEDOR)}
          />
        );
      
      case PASOS_AGENDAMIENTO.SELECCIONAR_FECHA_HORA:
        return (
          <SelectorFechaHora
            configuracion={configuracionCompleta}
            onFechaHoraSeleccionada={handleFechaHoraSeleccionada}
            onVolver={() => setPasoActual(PASOS_AGENDAMIENTO.CONFIGURAR_SERVICIO)}
          />
        );
      
      case PASOS_AGENDAMIENTO.CARRITO:
        return (
          <CarritoAgendamiento
            vehiculo={vehiculoActual}
            onContinuarAPago={handleContinuarAPago}
            onVolver={onClose}
          />
        );
      
      case PASOS_AGENDAMIENTO.OPCIONES_PAGO:
        return (
          <OpcionesPago
            vehiculo={vehiculoActual}
            onPagoCompletado={handlePagoCompletado}
            onVolver={() => setPasoActual(PASOS_AGENDAMIENTO.CARRITO)}
          />
        );
      
      default:
        return <Text>Paso no implementado</Text>;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header del modal */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Agendar Servicio</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Indicador de progreso */}
        <ProgressIndicator pasoActual={pasoActual} pasos={PASOS_AGENDAMIENTO} />

        {/* Contenido del paso actual */}
        <View style={styles.stepContent}>
          {renderPasoActual()}
        </View>
      </SafeAreaView>
    </Modal>
  );
};
```

### **ConfiguradorServicio.js - Configuración de Servicio**

```javascript
const ConfiguradorServicio = ({ servicio, vehiculo, onConfiguracionCompleta, onVolver }) => {
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState(null);
  const [conRepuestos, setConRepuestos] = useState(true);
  const [serviciosAdicionales, setServiciosAdicionales] = useState([]);
  const [serviciosAdicionalesSeleccionados, setServiciosAdicionalesSeleccionados] = useState([]);

  useEffect(() => {
    // Seleccionar primera oferta por defecto
    if (servicio.ofertas_disponibles && servicio.ofertas_disponibles.length > 0) {
      setOfertaSeleccionada(servicio.ofertas_disponibles[0]);
    }
    
    // Cargar servicios relacionados
    cargarServiciosRelacionados();
  }, [servicio]);

  const cargarServiciosRelacionados = async () => {
    try {
      const serviciosRelacionados = await get(`/servicios/servicios/${servicio.id}/relacionados/`);
      setServiciosAdicionales(serviciosRelacionados);
    } catch (error) {
      console.error('Error cargando servicios relacionados:', error);
    }
  };

  const calcularPrecioTotal = () => {
    if (!ofertaSeleccionada) return 0;

    let precioBase = conRepuestos 
      ? parseFloat(ofertaSeleccionada.precio_con_repuestos)
      : parseFloat(ofertaSeleccionada.precio_sin_repuestos);

    const precioAdicionales = serviciosAdicionalesSeleccionados.reduce(
      (total, servicio) => total + parseFloat(servicio.precio_con_repuestos),
      0
    );

    return precioBase + precioAdicionales;
  };

  const handleContinuar = () => {
    const configuracion = {
      ofertaSeleccionada,
      conRepuestos,
      serviciosAdicionales: serviciosAdicionalesSeleccionados,
      precioTotal: calcularPrecioTotal()
    };
    
    onConfiguracionCompleta(configuracion);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Información del servicio */}
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>{servicio.nombre}</Text>
        <Text style={styles.serviceDescription}>{servicio.descripcion}</Text>
      </View>

      {/* Selección de proveedor (si hay múltiples) */}
      {servicio.ofertas_disponibles.length > 1 && (
        <View style={styles.providerSelection}>
          <Text style={styles.sectionTitle}>Seleccionar Proveedor</Text>
          {servicio.ofertas_disponibles.map(oferta => (
            <ProviderOption
              key={oferta.id}
              oferta={oferta}
              selected={ofertaSeleccionada?.id === oferta.id}
              onSelect={setOfertaSeleccionada}
            />
          ))}
        </View>
      )}

      {/* Configuración de repuestos */}
      <View style={styles.repuestosSection}>
        <Text style={styles.sectionTitle}>Repuestos</Text>
        <View style={styles.repuestosOptions}>
          <TouchableOpacity
            style={[styles.repuestoOption, conRepuestos && styles.optionSelected]}
            onPress={() => setConRepuestos(true)}
          >
            <Text style={styles.optionText}>Con repuestos incluidos</Text>
            <Text style={styles.optionPrice}>
              ${ofertaSeleccionada?.precio_con_repuestos}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.repuestoOption, !conRepuestos && styles.optionSelected]}
            onPress={() => setConRepuestos(false)}
          >
            <Text style={styles.optionText}>Solo mano de obra</Text>
            <Text style={styles.optionPrice}>
              ${ofertaSeleccionada?.precio_sin_repuestos}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Servicios adicionales */}
      {serviciosAdicionales.length > 0 && (
        <View style={styles.additionalServices}>
          <Text style={styles.sectionTitle}>Servicios Adicionales</Text>
          {serviciosAdicionales.map(servicioAdicional => (
            <AdditionalServiceItem
              key={servicioAdicional.id}
              servicio={servicioAdicional}
              selected={serviciosAdicionalesSeleccionados.some(s => s.id === servicioAdicional.id)}
              onToggle={(selected) => {
                if (selected) {
                  setServiciosAdicionalesSeleccionados(prev => [...prev, servicioAdicional]);
                } else {
                  setServiciosAdicionalesSeleccionados(prev => 
                    prev.filter(s => s.id !== servicioAdicional.id)
                  );
                }
              }}
            />
          ))}
        </View>
      )}

      {/* Resumen de precio */}
      <View style={styles.priceContainer}>
        <Text style={styles.totalLabel}>Total Estimado:</Text>
        <Text style={styles.totalPrice}>${calcularPrecioTotal().toFixed(2)}</Text>
      </View>

      {/* Botones de navegación */}
      <View style={styles.navigationButtons}>
        <Button
          title="Volver"
          type="outline"
          onPress={onVolver}
          style={styles.backButton}
        />
        <Button
          title="Continuar"
          onPress={handleContinuar}
          disabled={!ofertaSeleccionada}
          style={styles.continueButton}
        />
      </View>
    </ScrollView>
  );
};
```

Este sistema completo proporciona una experiencia de usuario fluida y robusta para la gestión de servicios mecánicos, con arquitectura moderna, comunicación eficiente con el backend y un diseño visual atractivo.