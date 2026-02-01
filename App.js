//archivo principal de la app
// CRÍTICO: Deshabilitar LogBox/RedBox/YellowBox COMPLETAMENTE
// Esta configuración debe ejecutarse lo antes posible para evitar que errores aparezcan visualmente

//importaciones de componentes
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { View, Text, StyleSheet, Animated, Linking, AppState, LogBox as RNLogBox, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import AuthNavigator from './app/navigation/AuthNavigator';
import AppNavigator from './app/navigation/AppNavigator';
import { AuthProvider, useAuth } from './app/context/AuthContext';
import { AgendamientoProvider } from './app/context/AgendamientoContext';
import { BookingCartProvider } from './app/context/BookingCartContext';
import { SolicitudesProvider } from './app/context/SolicitudesContext';
import { ChatsProvider } from './app/context/ChatsContext';
import { FavoritesProvider } from './app/context/FavoritesContext';
import { ThemeProvider } from './app/design-system/theme/ThemeProvider';
import { COLORS } from './app/utils/constants';
import { ROUTES } from './app/utils/constants';
import SplashScreen from './app/components/utils/SplashScreen';
import logger from './app/utils/logger';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient, asyncStoragePersister } from './app/config/queryClient';

// CRÍTICO: Deshabilitar LogBox COMPLETAMENTE después de importar React Native
// Esto debe ejecutarse INMEDIATAMENTE después de importar para que funcione correctamente
// Esta es la configuración PRINCIPAL que deshabilita LogBox completamente
if (typeof RNLogBox !== 'undefined') {
  try {
    // PASO 1: Ignorar TODOS los logs y errores para que NO aparezcan en la UI
    // Esto es la configuración más importante y debe estar primero
    RNLogBox.ignoreAllLogs(true);

    // PASO 2: Configuración adicional para ignorar errores específicos
    // NOTA: LogBox.ignoreLogs() solo acepta strings, no regex
    // Esta es una capa adicional de protección en caso de que ignoreAllLogs no funcione completamente
    RNLogBox.ignoreLogs([
      // Errores de React Navigation
      'Non-serializable values were found in the navigation state',
      'Remote debugger',
      'VirtualizedLists should never be nested',

      // Errores de API/Red (strings comunes que aparecen en errores)
      'Error en POST',
      'Error en GET',
      'Error en PUT',
      'Error en PATCH',
      'Error en DELETE',
      'Error en login',
      'Error en proceso de login',
      'Error de respuesta detallado',
      'Error capturado',
      'Error global',
      'network',
      'Network',
      'ERR_',
      'ECONN',
      'ETIMEDOUT',
      'ENOTFOUND',
      'status',
      'Status',
      'HTTP',
      'axios',
      'Error en POST a',
      'Error en GET a',
      'Error en PUT a',
      'Error en PATCH a',
      'Error en DELETE a',

      // Errores de autenticación
      'credenciales',
      'Credenciales',
      'autenticación',
      'token',
      'Token',
      '401',
      '400',
      'credenciales inválidas',
      'Credenciales inválidas',
      'No puede iniciar sesión',

      // Patrones generales de errores técnicos
      'ERROR',
      'Error en',
      'Error:',
      '❌',
      'authService',
      'AuthContext',
      'Error en proceso de',
      'Error al',
    ]);
  } catch (e) {
    // Si LogBox no está disponible o hay algún error, ignorarlo silenciosamente
    // No mostrar ningún error aquí para evitar que aparezca en la UI
  }
}

// CRÍTICO: Guardar referencia al manejador original para restaurarlo si es necesario
// El ErrorBoundary se encargará de configurar el manejador global correctamente
let originalGlobalErrorHandler = null;
if (typeof global !== 'undefined' && global.ErrorUtils) {
  originalGlobalErrorHandler = global.ErrorUtils.getGlobalHandler();
}

// NOTA IMPORTANTE:
// - Los logs técnicos seguirán apareciendo en el TERMINAL (no en la UI) para debugging en desarrollo
// - Los errores NUNCA aparecerán visualmente en la interfaz (ni RedBox, ni LogBox, ni YellowBox)
// - El usuario solo verá Alert.alert con mensajes amigables cuando sea necesario

// Configuración de TanStack Query importada de app/config/queryClient.js

// Configuración de Deep Linking para Mercado Pago y otras integraciones
const linking = {
  prefixes: ['mecanimovil://', 'https://mecanimovil.app'],
  config: {
    screens: {
      // Pantalla de callback de Mercado Pago
      // IMPORTANTE: Mercado Pago envía URLs como:
      // mecanimovil://payment/success?status=approved&payment_id=123&external_reference=oferta_xxx_total
      // Necesitamos capturar tanto el path como los query params
      PaymentCallback: {
        path: 'payment/:status',
        parse: {
          status: (status) => status || 'unknown',
        },
      },
      // También manejar rutas directas
      TabNavigator: {
        screens: {
          MisSolicitudes: 'mis-solicitudes',
          Perfil: 'perfil',
        },
      },
      // Deep link para compartir perfiles de proveedores
      // Formato con nombre: mecanimovil://provider/{type}/{id}/{nombre-slug}
      // Formato sin nombre (retrocompatibilidad): mecanimovil://provider/{type}/{id}
      // Ejemplo: mecanimovil://provider/taller/123/taller-automotriz-san-pablo
      ProviderDetail: {
        // Usar parámetro opcional con sintaxis React Navigation 6
        path: 'provider/:type/:id/:name?',
        parse: {
          type: (type) => type || 'taller',
          id: (id) => {
            if (!id) return null;
            const parsed = parseInt(id, 10);
            return isNaN(parsed) ? null : parsed;
          },
          // name es opcional - puede ser undefined
          name: (name) => name || undefined,
        },
      },
    },
  },
  // Función para parsear URLs de Mercado Pago que vienen con query params
  async getInitialURL() {
    // Verificar si la app fue abierta con un deep link
    // IMPORTANTE: Esta función se ejecuta cuando la app se abre desde un deep link
    // Es CRÍTICA cuando se abre una nueva instancia desde Mercado Pago
    const url = await Linking.getInitialURL();
    if (url) {
      logger.debug('🔗 App abierta con deep link inicial (NUEVA INSTANCIA):', url);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'R',
          location: 'App.js:linking:getInitialURL',
          message: 'URL inicial detectada (nueva instancia)',
          data: { url },
          timestamp: Date.now()
        })
      }).catch(() => { });
      // #endregion

      // SIEMPRE guardar el deep link en AsyncStorage para procesarlo después
      // Esto es CRÍTICO cuando la app se reinicia o se abre una nueva instancia
      // El NavigationContainer puede no estar listo cuando se ejecuta esta función
      if (url.includes('payment') || url.includes('status') || url.includes('payment_id') || url.startsWith('mecanimovil://payment')) {
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.setItem('pending_deep_link', url);
          logger.debug('   ✅ Deep link guardado en AsyncStorage desde getInitialURL (nueva instancia):', url);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'R',
              location: 'App.js:linking:getInitialURL:save_to_storage',
              message: 'Deep link guardado en AsyncStorage (nueva instancia)',
              data: { url },
              timestamp: Date.now()
            })
          }).catch(() => { });
          // #endregion
        } catch (e) {
          logger.error('❌ Error guardando deep link en getInitialURL:', e);
        }
      }

      return url;
    }
    return null;
  },
  // Función para subscribirse a deep links
  subscribe(listener) {
    // Listener para deep links cuando la app está abierta
    const onReceiveURL = async ({ url }) => {
      logger.debug('🔗 Deep link recibido en NavigationContainer:', url);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H',
          location: 'App.js:linking:subscribe:onReceiveURL',
          message: 'Deep link recibido en NavigationContainer',
          data: { url },
          timestamp: Date.now()
        })
      }).catch(() => { });
      // #endregion

      // Guardar el deep link en AsyncStorage si es un pago
      // Esto asegura que no se pierda si el NavigationContainer no está listo
      if (url && (url.includes('payment') || url.includes('status') || url.includes('payment_id'))) {
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.setItem('pending_deep_link', url);
          logger.debug('   - Deep link guardado en AsyncStorage desde subscribe:', url);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'H',
              location: 'App.js:linking:subscribe:save_to_storage',
              message: 'Deep link guardado en AsyncStorage desde subscribe',
              data: { url },
              timestamp: Date.now()
            })
          }).catch(() => { });
          // #endregion
        } catch (e) {
          logger.warn('Error guardando deep link en subscribe:', e);
        }
      }

      listener(url);
    };

    // Suscribirse a eventos de Linking
    const subscription = Linking.addEventListener('url', onReceiveURL);

    // Verificar URL inicial
    Linking.getInitialURL().then(url => {
      if (url) {
        logger.debug('🔗 URL inicial detectada en NavigationContainer:', url);
        onReceiveURL({ url });
      }
    });

    return () => {
      subscription?.remove();
    };
  },
};

// Componente de seguridad para capturar errores
// IMPORTANTE: Este componente captura errores sin mostrar detalles técnicos al usuario
// Solo muestra mensajes amigables y evita que errores técnicos aparezcan en la UI
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.originalErrorHandler = null;
  }

  static getDerivedStateFromError(error) {
    // Actualizar el estado para que la siguiente renderización muestre la UI de fallback
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log solo en desarrollo (__DEV__), nunca en producción (APK)
    // Estos logs NO aparecerán en la interfaz del usuario
    logger.error('❌ Error capturado en ErrorBoundary (solo visible en desarrollo):', {
      error: error?.message,
      componentStack: errorInfo?.componentStack?.substring(0, 200), // Solo primeros 200 caracteres
      // NO loguear stack traces completos que puedan contener información sensible
    });

    // IMPORTANTE: NO mostrar Alert aquí porque podría causar múltiples alerts
    // El usuario verá la UI de fallback amigable sin detalles técnicos
  }

  componentDidMount() {
    // CRÍTICO: Configurar manejador global de errores que capture TODOS los errores
    // antes de que LogBox pueda mostrarlos visualmente
    // Este captura errores que no fueron capturados por componentDidCatch
    if (global.ErrorUtils) {
      // Usar el manejador original guardado o el actual
      this.originalErrorHandler = originalGlobalErrorHandler || global.ErrorUtils.getGlobalHandler();

      const errorHandler = (error, isFatal) => {
        // Log solo en desarrollo (__DEV__), nunca en producción (APK)
        // IMPORTANTE: Estos logs solo aparecerán en el TERMINAL, NUNCA en la UI
        logger.error('❌ Error global no controlado (solo terminal, no visible en UI):', {
          message: error?.message || error?.toString(),
          isFatal,
          // NO loguear stack traces completos que puedan aparecer visualmente
        });

        // Para errores fatales, mostrar UI de fallback amigable
        // NO mostrar detalles técnicos al usuario
        if (isFatal) {
          this.setState({ hasError: true, error });
        }

        // CRÍTICO: Retornar true significa "error manejado, NO mostrar RedBox/LogBox"
        // Esto previene completamente que LogBox muestre errores visualmente en la UI
        return true; // ERROR MANEJADO - NO MOSTRAR EN UI
      };

      // Configurar el manejador global
      global.ErrorUtils.setGlobalHandler(errorHandler);
    }
  }

  componentWillUnmount() {
    // Restaurar el manejador original al desmontar
    if (global.ErrorUtils && this.originalErrorHandler) {
      global.ErrorUtils.setGlobalHandler(this.originalErrorHandler);
    }
  }

  render() {
    if (this.state.hasError) {
      // UI de fallback amigable - SIN detalles técnicos
      // El usuario NUNCA verá stack traces, códigos de error, o mensajes técnicos
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Algo salió mal</Text>
          <Text style={styles.errorText}>
            Estamos trabajando para solucionarlo. Por favor, reinicia la aplicación.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Componente principal que maneja la navegación basada en el estado de autenticación
const Main = () => {
  const { isAuthenticated, loading, registerSuccess } = useAuth();
  const [fadeAnim] = useState(new Animated.Value(0));
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (!loading) {
      // Animación de fade-in cuando termina la carga
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  // Función para navegar a PaymentCallbackScreen con parámetros
  const navigateToPaymentCallback = useCallback((url) => {
    if (!navigationRef.isReady() || !isAuthenticated) {
      logger.debug('⚠️ NavigationContainer no está listo o usuario no autenticado, guardando deep link');
      return false;
    }

    try {
      // Parsear la URL para extraer parámetros
      const urlObj = new URL(url);
      const params = {};
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      // Extraer el status del path
      const pathMatch = url.match(/payment\/(success|failure|pending)/);
      if (pathMatch) {
        params.status = pathMatch[1];
      }

      logger.debug('🔗 Navegando a PaymentCallbackScreen con parámetros:', params);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'G',
          location: 'App.js:Main:navigateToPaymentCallback',
          message: 'Navegando programáticamente a PaymentCallback',
          data: { url, params, nav_ready: navigationRef.isReady(), is_authenticated: isAuthenticated },
          timestamp: Date.now()
        })
      }).catch(() => { });
      // #endregion

      // Navegar a PaymentCallbackScreen con los parámetros
      navigationRef.navigate('PaymentCallback', params);
      return true;
    } catch (e) {
      logger.error('Error navegando a PaymentCallbackScreen:', e);
      return false;
    }
  }, [navigationRef, isAuthenticated]);

  // Listener para deep links - debe funcionar incluso cuando la app se reinicia
  // Este listener es CRÍTICO para capturar deep links cuando Mercado Pago redirige
  useEffect(() => {
    const handleDeepLink = async (event) => {
      const { url } = event;
      if (!url) return;

      logger.debug('🔗 Deep link recibido en Main:', url);
      logger.debug('   - isAuthenticated:', isAuthenticated);
      logger.debug('   - loading:', loading);
      logger.debug('   - NavigationContainer ready:', navigationRef.isReady());

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'L',
          location: 'App.js:Main:deep_link',
          message: 'Deep link recibido',
          data: { url, isAuthenticated, loading, nav_ready: navigationRef.isReady() },
          timestamp: Date.now()
        })
      }).catch(() => { });
      // #endregion

      // Si es un deep link de pago
      if (url && (url.includes('payment') || url.includes('status') || url.includes('payment_id'))) {
        // SIEMPRE guardar el deep link en AsyncStorage primero
        // Esto asegura que no se pierda incluso si la navegación falla
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.setItem('pending_deep_link', url);
          logger.debug('   - Deep link guardado en AsyncStorage:', url);
        } catch (e) {
          logger.warn('Error guardando deep link:', e);
        }

        // Intentar navegar directamente si el NavigationContainer está listo y el usuario está autenticado
        if (navigationRef.isReady() && isAuthenticated && !loading) {
          const navigated = navigateToPaymentCallback(url);
          if (navigated) {
            logger.debug('   - Navegación exitosa a PaymentCallbackScreen');
            // Limpiar el deep link pendiente después de navegar exitosamente
            try {
              const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
              await AsyncStorage.removeItem('pending_deep_link');
            } catch (e) {
              logger.warn('Error limpiando deep link pendiente:', e);
            }
          } else {
            logger.debug('   - Navegación falló, deep link quedó guardado en AsyncStorage');
          }
        } else {
          logger.debug('   - NavigationContainer no está listo o usuario no autenticado, deep link guardado para procesar después');
        }
      }
    };

    // Suscribirse a eventos de Linking (funciona incluso si la app se reinicia)
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Verificar URL inicial (importante cuando la app se reinicia o vuelve al foreground)
    Linking.getInitialURL().then(url => {
      if (url) {
        logger.debug('🔗 URL inicial detectada en Main:', url);
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [isAuthenticated, loading, navigationRef, navigateToPaymentCallback]); // Incluir navigateToPaymentCallback en dependencias

  // Listener para push notifications
  useEffect(() => {
    // Solo registrar listeners si el usuario está autenticado y la navegación está lista
    if (!isAuthenticated || !navigationRef.isReady()) {
      return;
    }

    // Escuchar notificaciones cuando la app está en foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      notification => {
        try {
          logger.debug('📱 Notificación recibida (foreground):', notification);
          const { type, solicitud_id } = notification.request.content.data || {};

          if (type === 'recordatorio_pago' && solicitud_id && navigationRef.isReady()) {
            // Navegar a detalle de solicitud
            navigationRef.navigate('Solicitudes', {
              screen: 'DetalleSolicitud',
              params: { id: solicitud_id }
            });
          } else if (type === 'cambio_estado' && solicitud_id && navigationRef.isReady()) {
            // Navegar a detalle de solicitud cuando cambia el estado
            navigationRef.navigate('Solicitudes', {
              screen: 'DetalleSolicitud',
              params: { id: solicitud_id }
            });
          }
        } catch (error) {
          logger.error('❌ Error procesando notificación en foreground:', error);
        }
      }
    );

    // Escuchar cuando el usuario toca la notificación (app en background)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      response => {
        try {
          logger.debug('📱 Notificación tocada (background):', response);
          const { type, solicitud_id } = response.notification.request.content.data || {};

          if (type === 'recordatorio_pago' && solicitud_id && navigationRef.isReady()) {
            // Navegar a detalle de solicitud
            navigationRef.navigate('Solicitudes', {
              screen: 'DetalleSolicitud',
              params: { id: solicitud_id }
            });
          } else if (type === 'cambio_estado' && solicitud_id && navigationRef.isReady()) {
            // Navegar a detalle de solicitud cuando cambia el estado
            navigationRef.navigate('Solicitudes', {
              screen: 'DetalleSolicitud',
              params: { id: solicitud_id }
            });
          }
        } catch (error) {
          logger.error('❌ Error procesando notificación en background:', error);
        }
      }
    );

    return () => {
      try {
        foregroundSubscription.remove();
        responseSubscription.remove();
      } catch (error) {
        logger.warn('⚠️ Error removiendo listeners de notificaciones:', error);
      }
    };
  }, [navigationRef, isAuthenticated]);

  // Procesar deep links pendientes cuando el NavigationContainer esté listo Y el usuario esté autenticado
  // IMPORTANTE: Este hook debe estar ANTES de cualquier return condicional
  // Este hook es CRÍTICO para desarrollo local (npx expo start -c) cuando se abre una nueva instancia
  useEffect(() => {
    // No procesar si el NavigationContainer no está listo, el usuario no está autenticado, o aún está cargando
    if (!navigationRef.isReady() || !isAuthenticated || loading) {
      return;
    }

    const processPendingDeepLink = async () => {
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

        // PRIMERO: Verificar si hay un deep link pendiente
        const pendingDeepLink = await AsyncStorage.getItem('pending_deep_link');

        if (pendingDeepLink) {
          logger.debug('🔗 Procesando deep link pendiente cuando NavigationContainer está listo:', pendingDeepLink);

          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'L',
              location: 'App.js:Main:processPendingDeepLink',
              message: 'Procesando deep link pendiente',
              data: {
                pending_deep_link: pendingDeepLink,
                nav_ready: navigationRef.isReady(),
                is_authenticated: isAuthenticated,
                loading
              },
              timestamp: Date.now()
            })
          }).catch(() => { });
          // #endregion

          // Limpiar el deep link pendiente antes de navegar
          await AsyncStorage.removeItem('pending_deep_link');

          // Navegar al PaymentCallbackScreen
          const navigated = navigateToPaymentCallback(pendingDeepLink);

          if (!navigated) {
            // Si la navegación falló, volver a guardar el deep link
            logger.warn('⚠️ Navegación falló, volviendo a guardar deep link');
            await AsyncStorage.setItem('pending_deep_link', pendingDeepLink);
          }
        } else {
          // SEGUNDO: Si no hay deep link pero hay datos de pago pendiente, verificar el estado
          // Esto es útil cuando la app se reinicia y el deep link no se capturó
          const pagoPendienteDataStr = await AsyncStorage.getItem('pago_pendiente_data');
          if (pagoPendienteDataStr) {
            const pagoPendienteData = JSON.parse(pagoPendienteDataStr);
            const tiempoTranscurrido = Date.now() - (pagoPendienteData.timestamp || 0);

            // Si han pasado más de 3 segundos, probablemente el pago se completó
            if (tiempoTranscurrido > 3000) {
              logger.debug('💾 Datos de pago pendiente encontrados, navegando a PaymentCallbackScreen para verificar estado');

              // Navegar a PaymentCallbackScreen para que verifique el estado del pago
              navigationRef.navigate('PaymentCallback', {
                status: 'processing',
                from_storage: true,
                ofertaId: pagoPendienteData.ofertaId
              });
            }
          }
        }
      } catch (e) {
        logger.warn('Error procesando deep link pendiente:', e);
      }
    };

    // Esperar un poco para que el NavigationContainer esté completamente listo
    // Aumentar el delay para desarrollo local donde puede tomar más tiempo
    const timeout = setTimeout(() => {
      processPendingDeepLink();
    }, 1000); // Aumentado a 1 segundo para dar más tiempo en desarrollo local

    return () => clearTimeout(timeout);
  }, [navigationRef, isAuthenticated, loading, navigateToPaymentCallback]); // Usar navigationRef, no navigationRef.isReady()

  // Listener para cuando la app vuelve al foreground después de estar en background
  // Esto es crítico cuando el usuario completa el pago en la app de Mercado Pago
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      // Si la app vuelve al foreground desde background
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isAuthenticated &&
        !loading &&
        navigationRef.isReady()
      ) {
        logger.debug('📱 App volvió al foreground, verificando deep links pendientes...');

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'K',
            location: 'App.js:Main:handleAppStateChange:foreground',
            message: 'App volvió al foreground',
            data: { previous_state: appState.current, next_state: nextAppState },
            timestamp: Date.now()
          })
        }).catch(() => { });
        // #endregion

        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

          // PRIMERO: Verificar si hay una URL inicial (esto es lo más importante)
          // Cuando la app vuelve al foreground después de un deep link, getInitialURL puede retornar la URL
          const initialURL = await Linking.getInitialURL();
          if (initialURL && (initialURL.includes('payment') || initialURL.includes('status') || initialURL.includes('payment_id'))) {
            logger.debug('🔗 URL inicial detectada al volver al foreground:', initialURL);

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'run1',
                hypothesisId: 'L',
                location: 'App.js:Main:handleAppStateChange:initial_url',
                message: 'URL inicial detectada al volver al foreground',
                data: { initial_url: initialURL },
                timestamp: Date.now()
              })
            }).catch(() => { });
            // #endregion

            // Guardar en AsyncStorage y navegar
            await AsyncStorage.setItem('pending_deep_link', initialURL);
            navigateToPaymentCallback(initialURL);
            return;
          }

          // SEGUNDO: Verificar si hay un deep link pendiente en AsyncStorage
          const pendingDeepLink = await AsyncStorage.getItem('pending_deep_link');
          if (pendingDeepLink) {
            logger.debug('🔗 Deep link pendiente encontrado al volver al foreground:', pendingDeepLink);

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'run1',
                hypothesisId: 'L',
                location: 'App.js:Main:handleAppStateChange:pending_deep_link',
                message: 'Deep link pendiente encontrado al volver al foreground',
                data: { pending_deep_link: pendingDeepLink },
                timestamp: Date.now()
              })
            }).catch(() => { });
            // #endregion

            await AsyncStorage.removeItem('pending_deep_link');
            navigateToPaymentCallback(pendingDeepLink);
            return;
          }

          // TERCERO: Verificar si hay datos de pago pendiente
          // Si hay datos de pago pero no deep link, puede que Mercado Pago haya redirigido
          // pero el deep link no se capturó. Verificar el estado desde el backend.
          const pagoPendienteDataStr = await AsyncStorage.getItem('pago_pendiente_data');
          if (pagoPendienteDataStr) {
            const pagoPendienteData = JSON.parse(pagoPendienteDataStr);
            logger.debug('💾 Datos de pago pendiente encontrados al volver al foreground:', pagoPendienteData);

            // Verificar si han pasado más de 3 segundos desde que se guardó
            // Esto indica que el usuario probablemente completó el pago
            const tiempoTranscurrido = Date.now() - (pagoPendienteData.timestamp || 0);
            if (tiempoTranscurrido > 3000) {
              logger.debug('⏱️ Han pasado más de 3 segundos, verificando estado del pago desde backend...');

              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: 'debug-session',
                  runId: 'run1',
                  hypothesisId: 'L',
                  location: 'App.js:Main:handleAppStateChange:pago_pendiente',
                  message: 'Verificando estado del pago desde backend',
                  data: { pago_pendiente_data: pagoPendienteData, tiempo_transcurrido: tiempoTranscurrido },
                  timestamp: Date.now()
                })
              }).catch(() => { });
              // #endregion

              // Navegar a PaymentCallbackScreen para que verifique el estado del pago
              navigationRef.navigate('PaymentCallback', {
                status: 'processing',
                from_foreground: true,
                ofertaId: pagoPendienteData.ofertaId
              });
            }
          }
        } catch (e) {
          logger.warn('Error verificando deep links al volver al foreground:', e);
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [isAuthenticated, loading, navigationRef, navigateToPaymentCallback]);

  // Procesar deep link pendiente cuando el usuario se autentica automáticamente
  // Esto es CRÍTICO para desarrollo local cuando se abre una nueva instancia
  // Este hook se ejecuta cuando el usuario se autentica automáticamente desde AsyncStorage
  useEffect(() => {
    // Solo procesar si el usuario está autenticado, no está cargando, y el NavigationContainer está listo
    if (!isAuthenticated || loading || !navigationRef.isReady()) {
      return;
    }

    const processDeepLinkAfterAuth = async () => {
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

        // PRIMERO: Verificar si hay un deep link pendiente
        const pendingDeepLink = await AsyncStorage.getItem('pending_deep_link');

        if (pendingDeepLink) {
          logger.debug('🔗 Usuario autenticado automáticamente, procesando deep link pendiente:', pendingDeepLink);

          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'M',
              location: 'App.js:Main:processDeepLinkAfterAuth',
              message: 'Procesando deep link después de autenticación automática',
              data: {
                pending_deep_link: pendingDeepLink,
                nav_ready: navigationRef.isReady(),
                is_authenticated: isAuthenticated
              },
              timestamp: Date.now()
            })
          }).catch(() => { });
          // #endregion

          // Limpiar el deep link pendiente antes de navegar
          await AsyncStorage.removeItem('pending_deep_link');

          // Esperar un poco para asegurar que todo esté completamente listo
          setTimeout(() => {
            if (navigationRef.isReady() && isAuthenticated && !loading) {
              const navigated = navigateToPaymentCallback(pendingDeepLink);
              if (!navigated) {
                // Si la navegación falló, volver a guardar el deep link
                logger.warn('⚠️ Navegación falló después de autenticación, volviendo a guardar deep link');
                AsyncStorage.setItem('pending_deep_link', pendingDeepLink);
              } else {
                logger.debug('✅ Deep link procesado exitosamente después de autenticación automática');
              }
            }
          }, 2000); // Aumentado a 2 segundos para dar más tiempo en desarrollo local
        } else {
          // SEGUNDO: Si no hay deep link pero hay datos de pago pendiente, verificar el estado
          const pagoPendienteDataStr = await AsyncStorage.getItem('pago_pendiente_data');
          if (pagoPendienteDataStr) {
            const pagoPendienteData = JSON.parse(pagoPendienteDataStr);
            const tiempoTranscurrido = Date.now() - (pagoPendienteData.timestamp || 0);

            // Si han pasado más de 3 segundos, probablemente el pago se completó
            if (tiempoTranscurrido > 3000) {
              logger.debug('💾 Datos de pago pendiente encontrados después de autenticación, navegando a PaymentCallbackScreen');

              setTimeout(() => {
                if (navigationRef.isReady() && isAuthenticated) {
                  navigationRef.navigate('PaymentCallback', {
                    status: 'processing',
                    from_storage: true,
                    ofertaId: pagoPendienteData.ofertaId
                  });
                }
              }, 2000);
            }
          }
        }
      } catch (e) {
        logger.warn('Error procesando deep link después de autenticación:', e);
      }
    };

    // Ejecutar después de un delay para dar tiempo a que todo se inicialice completamente
    // Este delay es importante en desarrollo local cuando se abre una nueva instancia
    const timeout = setTimeout(() => {
      processDeepLinkAfterAuth();
    }, 2500); // Aumentado a 2.5 segundos para desarrollo local

    return () => clearTimeout(timeout);
  }, [isAuthenticated, loading, navigationRef, navigateToPaymentCallback]);

  // IMPORTANTE: Todos los hooks deben estar antes de cualquier return condicional
  if (loading) {
    return <SplashScreen />;
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        onReady={async () => {
          logger.debug('✅ NavigationContainer está listo');
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'I',
              location: 'App.js:Main:NavigationContainer:onReady',
              message: 'NavigationContainer listo',
              data: { is_authenticated: isAuthenticated, loading },
              timestamp: Date.now()
            })
          }).catch(() => { });
          // #endregion

          // Procesar deep link pendiente cuando el NavigationContainer esté listo
          // Esto es CRÍTICO cuando se abre una nueva instancia desde Mercado Pago
          // El deep link se captura en getInitialURL() y se guarda en AsyncStorage
          // Aquí lo procesamos cuando el NavigationContainer está listo
          const processDeepLinkOnReady = async () => {
            try {
              const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

              // PRIMERO: Verificar si hay un deep link pendiente en AsyncStorage
              // Esto es lo más importante cuando se abre una nueva instancia
              const pendingDeepLink = await AsyncStorage.getItem('pending_deep_link');
              if (pendingDeepLink) {
                logger.debug('🔗 Deep link pendiente encontrado en onReady (nueva instancia):', pendingDeepLink);

                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId: 'debug-session',
                    runId: 'run1',
                    hypothesisId: 'P',
                    location: 'App.js:Main:NavigationContainer:onReady:process_pending',
                    message: 'Procesando deep link pendiente desde onReady (nueva instancia)',
                    data: {
                      pending_deep_link: pendingDeepLink,
                      is_authenticated: isAuthenticated,
                      loading,
                      nav_ready: navigationRef.isReady()
                    },
                    timestamp: Date.now()
                  })
                }).catch(() => { });
                // #endregion

                // Si el usuario está autenticado, procesar inmediatamente
                if (isAuthenticated && !loading) {
                  // Limpiar el deep link antes de navegar
                  await AsyncStorage.removeItem('pending_deep_link');

                  // Esperar un poco para asegurar que la navegación esté completamente lista
                  // Este delay es importante en desarrollo local cuando se abre una nueva instancia
                  setTimeout(() => {
                    if (navigationRef.isReady() && isAuthenticated && !loading) {
                      const navigated = navigateToPaymentCallback(pendingDeepLink);
                      if (navigated) {
                        logger.debug('✅ Deep link procesado exitosamente desde onReady (nueva instancia)');
                      } else {
                        // Si la navegación falló, volver a guardar el deep link
                        logger.warn('⚠️ Navegación falló desde onReady, volviendo a guardar deep link');
                        AsyncStorage.setItem('pending_deep_link', pendingDeepLink);
                      }
                    } else {
                      // Si el usuario aún no está autenticado o el NavigationContainer no está listo, volver a guardar
                      logger.warn('⚠️ Condiciones no cumplidas, volviendo a guardar deep link');
                      AsyncStorage.setItem('pending_deep_link', pendingDeepLink);
                    }
                  }, 3000); // Aumentado a 3 segundos para dar más tiempo en desarrollo local
                  return; // Salir temprano si se procesó un deep link pendiente
                } else {
                  logger.debug('⏳ Usuario no autenticado aún, el deep link se procesará después de autenticación');
                  // El useEffect que procesa deep links después de autenticación se encargará de esto
                }
              }

              // SEGUNDO: Si no hay deep link pendiente, verificar si hay datos de pago pendiente
              // Esto puede ocurrir si la app se reinició antes de que llegara el deep link
              const pagoPendienteDataStr = await AsyncStorage.getItem('pago_pendiente_data');
              if (pagoPendienteDataStr) {
                const pagoPendienteData = JSON.parse(pagoPendienteDataStr);
                logger.debug('💾 Datos de pago pendiente encontrados en onReady:', pagoPendienteData);

                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId: 'debug-session',
                    runId: 'run1',
                    hypothesisId: 'Q',
                    location: 'App.js:Main:NavigationContainer:onReady:pago_pendiente_found',
                    message: 'Datos de pago pendiente encontrados en onReady',
                    data: {
                      pago_pendiente_data: pagoPendienteData,
                      is_authenticated: isAuthenticated,
                      loading
                    },
                    timestamp: Date.now()
                  })
                }).catch(() => { });
                // #endregion

                // Si el usuario está autenticado, navegar a PaymentCallbackScreen
                if (isAuthenticated && !loading) {
                  setTimeout(() => {
                    if (navigationRef.isReady() && isAuthenticated) {
                      navigationRef.navigate('PaymentCallback', {
                        status: 'processing',
                        from_storage: true,
                        ofertaId: pagoPendienteData.ofertaId
                      });
                      logger.debug('✅ Navegado a PaymentCallbackScreen desde onReady con datos de pago pendiente');
                    }
                  }, 3000); // Aumentado a 3 segundos para dar más tiempo
                } else {
                  logger.debug('⏳ Usuario no autenticado aún, los datos de pago se procesarán después de autenticación');
                }
              }
            } catch (e) {
              logger.warn('Error procesando deep link pendiente desde onReady:', e);
            }
          };

          // Ejecutar inmediatamente si el usuario ya está autenticado
          if (isAuthenticated && !loading) {
            processDeepLinkOnReady();
          } else {
            // Si el usuario no está autenticado aún, esperar a que se autentique
            // El useEffect que procesa deep links después de autenticación se encargará de esto
            logger.debug('⏳ Esperando autenticación antes de procesar deep links desde onReady...');
          }
        }}
      >
        {/* Mostrar AppNavigator si el usuario está autenticado, de lo contrario mostrar AuthNavigator */}
        {isAuthenticated ? (
          <AppNavigator />
        ) : (
          <AuthNavigator initialRouteName={registerSuccess ? ROUTES.REGISTER : ROUTES.LOGIN} />
        )}
      </NavigationContainer>
    </Animated.View>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister: asyncStoragePersister }}
            onSuccess={() => logger.debug('✅ Query Cache restaurado desde MMKV/AsyncStorage')}
          >
            <AuthProvider>
              <FavoritesProvider>
              <ChatsProvider>
                <AgendamientoProvider>
                  <BookingCartProvider>
                    <SolicitudesProvider>
                      <Main />
                      <StatusBar style="auto" />
                    </SolicitudesProvider>
                  </BookingCartProvider>
                </AgendamientoProvider>
              </ChatsProvider>
              </FavoritesProvider>
            </AuthProvider>
          </PersistQueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.danger,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
  },
});
