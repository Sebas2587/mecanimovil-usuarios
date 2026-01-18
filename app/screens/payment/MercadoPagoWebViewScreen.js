import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  SafeAreaView,
  AppState,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MercadoPagoService from '../../services/mercadopago';

/**
 * Pantalla modal con WebView para procesar pagos de Mercado Pago
 * 
 * IMPORTANTE: Esta pantalla mantiene el contexto de la app y evita que se abran
 * múltiples instancias. El WebView intercepta las redirecciones de Mercado Pago
 * y captura el deep link antes de que el sistema operativo lo procese.
 */
const MercadoPagoWebViewScreen = ({ route, navigation }) => {
  const { checkoutUrl } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = useRef(null);
  const pagoPendienteDataRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const loadingTimeoutRef = useRef(null);
  const pageLoadedRef = useRef(false);

  if (!checkoutUrl) {
    return null;
  }

  // Estado inicial del pago (para comparar si cambió)
  const estadoInicialPagoRef = useRef(null);

  // Cargar datos de pago pendiente al montar y verificar estado inicial
  useEffect(() => {
    const loadPagoPendiente = async () => {
      try {
        const pagoPendienteDataStr = await AsyncStorage.getItem('pago_pendiente_data');
        if (pagoPendienteDataStr) {
          pagoPendienteDataRef.current = JSON.parse(pagoPendienteDataStr);
          console.log('💾 Datos de pago pendiente cargados:', pagoPendienteDataRef.current);
          
          // IMPORTANTE: Verificar el estado inicial del pago ANTES de abrir el WebView
          // Si el pago ya está pagado, no abrir el WebView y mostrar mensaje
          if (pagoPendienteDataRef.current.ofertaId) {
            try {
              console.log('🔍 Verificando estado inicial del pago antes de abrir WebView...');
              const estadoInicial = await MercadoPagoService.getEstadoPagoOferta(
                pagoPendienteDataRef.current.ofertaId
              );
              estadoInicialPagoRef.current = estadoInicial;
              
              console.log('✅ Estado inicial del pago:', estadoInicial);
              
              // Si el pago ya está pagado, cerrar el WebView y mostrar mensaje
              if (estadoInicial.oferta_estado === 'pagada') {
                console.log('⚠️ El pago ya está pagado. Cerrando WebView...');
                
                // Limpiar datos de pago pendiente
                await AsyncStorage.removeItem('pago_pendiente_data');
                await AsyncStorage.removeItem('pago_pendiente');
                await AsyncStorage.removeItem('expected_deep_link');
                
                // Cerrar el WebView
                navigation.goBack();
                
                // Mostrar alerta
                setTimeout(() => {
                  Alert.alert(
                    'Pago ya realizado',
                    'Esta oferta ya ha sido pagada anteriormente.',
                    [{ text: 'OK' }]
                  );
                }, 500);
                
                return; // No continuar con el timeout
              }
              
              // Si el pago está pendiente, continuar normalmente
              console.log('✅ Pago pendiente, continuando con el flujo normal');
            } catch (error) {
              console.error('❌ Error verificando estado inicial del pago:', error);
              // Continuar con el flujo normal si hay error
            }
          }
        }
      } catch (e) {
        console.warn('Error cargando datos de pago pendiente:', e);
      }
    };
    
    loadPagoPendiente();
    
    // Configurar un timeout para verificar el estado del pago después de un tiempo
    // IMPORTANTE: Solo verificamos el estado en el backend, NO asumimos que el pago fue completado
    // El webhook de Mercado Pago es la única fuente de verdad para confirmar pagos
    const verificationTimeout = setTimeout(async () => {
      if (pagoPendienteDataRef.current && estadoInicialPagoRef.current) {
        // Solo verificar si el estado inicial era pendiente
        if (estadoInicialPagoRef.current.oferta_estado !== 'pagada') {
          console.log('⏱️ Verificación periódica: consultando estado del pago en el backend...');
          
          // Verificar si hay un deep link pendiente primero
          const pendingDeepLink = await AsyncStorage.getItem('pending_deep_link');
          if (!pendingDeepLink) {
            // Verificar el estado en el backend (solo lectura, no asume nada)
            const resultado = await verificarYConfirmarPago();
            
            if (resultado.pagado) {
              console.log('✅ El backend confirmó que el pago fue procesado (webhook recibido)');
            } else if (resultado.pendiente) {
              console.log('⏳ El pago sigue pendiente, esperando confirmación del webhook');
            }
          }
        } else {
          console.log('⚠️ El pago ya estaba pagado al inicio, no verificando automáticamente');
        }
      }
    }, 35000); // Verificar después de 35 segundos
    
    return () => {
      clearTimeout(verificationTimeout);
      // Limpiar timeout de loading si existe
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [navigation]);

  // Listener para detectar cuando la app vuelve al foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('📱 App volvió al foreground desde WebView');
        
        // Si hay datos de pago pendiente, verificar el estado del pago en el backend
        // IMPORTANTE: Solo verificamos, NO asumimos que el pago fue completado
        if (pagoPendienteDataRef.current) {
          console.log('🔍 Verificando estado del pago en el backend...');
          
          const resultado = await verificarYConfirmarPago();
          
          // Si el pago fue confirmado por el backend (webhook recibido), la función ya navegó
          if (resultado.pagado) {
            console.log('✅ Pago confirmado por el backend al volver al foreground');
          } else if (resultado.pendiente) {
            console.log('⏳ Pago sigue pendiente, esperando confirmación del backend (webhook)');
          }
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Función para verificar el estado del pago desde el backend
  // IMPORTANTE: Esta función SOLO lee el estado, NO asume que el pago fue completado
  const verificarYConfirmarPago = async (forzarConfirmacion = false) => {
    if (!pagoPendienteDataRef.current) {
      return { verificado: false, pagado: false };
    }

    try {
      const { ofertaId, tipoPago } = pagoPendienteDataRef.current;
      
      if (!ofertaId) {
        console.warn('⚠️ No hay ofertaId para verificar el pago');
        return { verificado: false, pagado: false };
      }

      console.log('📥 Verificando estado del pago desde backend para oferta:', ofertaId);
      
      // Obtener el estado actual del pago desde el backend
      // El backend es la única fuente de verdad (actualizado por webhooks de Mercado Pago)
      const estadoPago = await MercadoPagoService.getEstadoPagoOferta(ofertaId);
      console.log('✅ Estado del pago obtenido:', estadoPago);

      // IMPORTANTE: Comparar con el estado inicial
      // Si el pago ya estaba pagado al inicio, no hacer nada
      if (estadoInicialPagoRef.current && estadoInicialPagoRef.current.oferta_estado === 'pagada') {
        if (estadoPago.oferta_estado === 'pagada') {
          console.log('⚠️ El pago ya estaba pagado al inicio. No se procesará como pago nuevo.');
          
          // Limpiar datos de pago pendiente
          await AsyncStorage.removeItem('pago_pendiente_data');
          await AsyncStorage.removeItem('pago_pendiente');
          await AsyncStorage.removeItem('expected_deep_link');
          await AsyncStorage.removeItem('pending_deep_link');
          
          return { verificado: true, pagado: false, yaEstabaPagado: true };
        }
      }

      // Si el pago ya está pagado Y cambió desde pendiente, es un pago exitoso real
      if (estadoPago.oferta_estado === 'pagada') {
        const cambioReal = !estadoInicialPagoRef.current || 
                          estadoInicialPagoRef.current.oferta_estado !== 'pagada';
        
        if (cambioReal) {
          console.log('✅ Pago confirmado por el backend (webhook recibido)');
          
          // Limpiar datos de pago pendiente
          await AsyncStorage.removeItem('pago_pendiente_data');
          await AsyncStorage.removeItem('pago_pendiente');
          await AsyncStorage.removeItem('expected_deep_link');
          await AsyncStorage.removeItem('pending_deep_link');
          
          // Navegar a pantalla de éxito
          navigation.goBack();
          setTimeout(() => {
            navigation.navigate('PaymentCallback', {
              status: 'success',
              from_webview_verification: true,
              ofertaId: ofertaId,
              tipoPago: tipoPago
            });
          }, 300);
          
          return { verificado: true, pagado: true };
        } else {
          console.log('⚠️ El pago ya estaba pagado, no se procesará como pago nuevo');
          return { verificado: true, pagado: false, yaEstabaPagado: true };
        }
      }

      // Si el pago aún está pendiente en el backend, NO asumir que fue completado
      // El usuario puede haber cerrado el WebView sin pagar
      console.log('⏳ Pago aún pendiente en el backend. NO se asumirá como completado.');
      console.log('   - El webhook de Mercado Pago actualizará el estado cuando el pago sea procesado.');
      
      // NO llamar a confirmarPagoOferta - esto causaba el bug de marcar como pagado sin pagar
      // Solo el webhook de Mercado Pago debe confirmar el pago
      
      return { verificado: true, pagado: false, pendiente: true };
      
    } catch (error) {
      console.error('❌ Error verificando estado del pago:', error);
      return { verificado: false, pagado: false, error: error.message };
    }
  };

  // Interceptar las redirecciones de Mercado Pago
  const handleShouldStartLoadWithRequest = (request) => {
    const { url } = request;
    
    console.log('🌐 WebView intentando cargar URL:', url);
    
    // Si la URL es un deep link de nuestra app, interceptarla
    if (url.startsWith('mecanimovil://')) {
      console.log('🔗 Deep link detectado en WebView:', url);
      console.log('   - URL completa:', url);
      
      // Parsear la URL para ver qué parámetros tiene
      try {
        const urlObj = new URL(url);
        const params = {};
        urlObj.searchParams.forEach((value, key) => {
          params[key] = value;
        });
        console.log('   - Parámetros extraídos:', params);
      } catch (e) {
        console.warn('   - Error parseando URL:', e);
      }
      
      // Guardar el deep link en AsyncStorage
      AsyncStorage.setItem('pending_deep_link', url).catch(console.warn);
      
      // Cerrar el modal y procesar el pago
      navigation.goBack();
      
      // Navegar a PaymentCallbackScreen con el deep link
      // Usar un timeout más corto para respuesta más rápida
      setTimeout(() => {
        console.log('📱 Navegando a PaymentCallbackScreen con deep link:', url);
        navigation.navigate('PaymentCallback', {
          url: url,
          from_webview: true
        });
      }, 300);
      
      // No permitir que el WebView cargue el deep link
      return false;
    }
    
    // IMPORTANTE: Permitir que el WebView cargue TODAS las demás URLs
    // Esto incluye redirecciones de Mercado Pago, URLs de pago, etc.
    console.log('✅ Permitiendo carga de URL en WebView');
    return true;
  };

  // Manejar cambios en el estado de navegación
  const handleNavigationStateChange = (navState) => {
    console.log('📊 Estado de navegación del WebView:', {
      url: navState.url,
      loading: navState.loading,
      canGoBack: navState.canGoBack,
      title: navState.title
    });
    
    // IMPORTANTE: Verificar si la URL actual es un deep link
    // Esto puede ocurrir cuando Mercado Pago redirige pero onShouldStartLoadWithRequest no se dispara
    if (navState.url && navState.url.startsWith('mecanimovil://')) {
      console.log('🔗 Deep link detectado en onNavigationStateChange:', navState.url);
      
      // Guardar el deep link en AsyncStorage
      AsyncStorage.setItem('pending_deep_link', navState.url).catch(console.warn);
      
      // Cerrar el modal y procesar el pago
      navigation.goBack();
      
      // Navegar a PaymentCallbackScreen con el deep link
      setTimeout(() => {
        console.log('📱 Navegando a PaymentCallbackScreen desde onNavigationStateChange:', navState.url);
        navigation.navigate('PaymentCallback', {
          url: navState.url,
          from_webview: true
        });
      }, 300);
      
      return; // No continuar procesando el estado de navegación
    }
    
    // IMPORTANTE: Detectar si Mercado Pago muestra una página de éxito
    // Mercado Pago puede mostrar una página de éxito antes de redirigir al deep link
    if (navState.url && navState.title) {
      const urlLower = navState.url.toLowerCase();
      const titleLower = navState.title.toLowerCase();
      
      // Detectar páginas de éxito de Mercado Pago
      // NOTA: Esto NO significa que el pago fue exitoso, solo que Mercado Pago mostró una página de éxito
      // El estado real se confirma por el webhook de Mercado Pago
      if (
        urlLower.includes('success') || 
        urlLower.includes('approved') ||
        titleLower.includes('pago exitoso') ||
        titleLower.includes('pago aprobado') ||
        titleLower.includes('payment approved')
      ) {
        console.log('📄 Página de éxito detectada en Mercado Pago (esperando confirmación del backend)');
        console.log('   - URL:', navState.url);
        console.log('   - Título:', navState.title);
        
        // Esperar un poco para que el webhook de Mercado Pago procese el pago
        // Luego verificar el estado REAL en el backend
        setTimeout(async () => {
          // Verificar si ya se procesó el deep link
          const pendingDeepLink = await AsyncStorage.getItem('pending_deep_link');
          if (!pendingDeepLink && pagoPendienteDataRef.current) {
            console.log('🔍 Verificando estado real del pago en el backend después de página de éxito...');
            
            const resultado = await verificarYConfirmarPago();
            
            if (resultado.pagado) {
              console.log('✅ El backend confirmó el pago exitoso');
            } else if (resultado.pendiente) {
              console.log('⏳ El pago aún no ha sido confirmado por el backend, esperando webhook...');
              // No hacer nada, esperar a que el usuario cierre o el webhook llegue
            }
          }
        }, 3000);
      }
    }
    
    // Actualizar el estado de loading basado en el estado de navegación
    setCanGoBack(navState.canGoBack);
    
    // Si la página terminó de cargar, ocultar el loading
    if (!navState.loading) {
      console.log('✅ Página cargada completamente en WebView');
      pageLoadedRef.current = true;
      
      // Limpiar timeout de seguridad si existe
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      // Asegurarse de que el loading esté en false después de un pequeño delay
      // para evitar parpadeos si hay recursos adicionales cargando
      setTimeout(() => {
        setLoading(false);
      }, 300);
    } else {
      // Si está cargando, establecer un timeout de seguridad para ocultar el loading
      // después de 10 segundos (por si hay algún problema con la carga)
      if (!loadingTimeoutRef.current) {
        loadingTimeoutRef.current = setTimeout(() => {
          console.warn('⚠️ Timeout de seguridad: Ocultando loading después de 10 segundos');
          setLoading(false);
          loadingTimeoutRef.current = null;
        }, 10000);
      }
    }
  };

  // Manejar cuando el WebView termina de cargar
  const handleLoadEnd = () => {
    console.log('✅ WebView terminó de cargar');
    pageLoadedRef.current = true;
    
    // Limpiar timeout de seguridad si existe
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    // Asegurarse de que el loading se oculte después de un pequeño delay
    // para evitar parpadeos si hay recursos adicionales cargando
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  // Manejar cuando el WebView comienza a cargar
  const handleLoadStart = () => {
    console.log('🔄 WebView comenzando a cargar');
    pageLoadedRef.current = false;
    
    // Limpiar timeout de seguridad anterior si existe
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // Establecer timeout de seguridad para ocultar el loading después de 10 segundos
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Timeout de seguridad: Ocultando loading después de 10 segundos');
      setLoading(false);
      loadingTimeoutRef.current = null;
    }, 10000);
    
    setLoading(true);
  };

  // Manejar errores del WebView
  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('❌ Error en WebView:', nativeEvent);
    setLoading(false);
  };

  // Cerrar el modal
  const handleClose = async () => {
    console.log('🔙 Usuario cerró el WebView de pago');
    
    // Si hay datos de pago pendiente, verificar el estado REAL del pago en el backend
    if (pagoPendienteDataRef.current) {
      console.log('🔍 Verificando estado real del pago antes de cerrar...');
      
      const resultado = await verificarYConfirmarPago();
      
      // Si el pago fue confirmado por el backend (webhook recibido), la función ya navegó
      if (resultado.pagado) {
        console.log('✅ Pago confirmado por el backend, navegación manejada por verificarYConfirmarPago');
        return;
      }
      
      // Si el pago ya estaba pagado desde antes, solo cerrar
      if (resultado.yaEstabaPagado) {
        console.log('⚠️ El pago ya estaba pagado, cerrando WebView');
        navigation.goBack();
        return;
      }
      
      // Si el pago sigue pendiente, el usuario canceló o no completó el pago
      if (resultado.pendiente) {
        console.log('⚠️ Pago sigue pendiente - usuario canceló o no completó el pago');
        
        // Limpiar datos de pago pendiente ya que el usuario decidió no pagar
        await AsyncStorage.removeItem('pago_pendiente_data');
        await AsyncStorage.removeItem('pago_pendiente');
        await AsyncStorage.removeItem('expected_deep_link');
        await AsyncStorage.removeItem('pending_deep_link');
        
        // Simplemente cerrar el WebView sin mostrar mensaje de éxito
        // El pago no fue completado, la oferta mantiene su estado original
        navigation.goBack();
        
        // Mostrar mensaje informativo de que el pago fue cancelado
        setTimeout(() => {
          Alert.alert(
            'Pago Cancelado',
            'El proceso de pago fue cancelado. La oferta sigue pendiente de pago.',
            [{ text: 'OK' }]
          );
        }, 300);
        
        return;
      }
    }
    
    // Si no hay datos de pago pendiente, simplemente cerrar
    navigation.goBack();
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header con botón de cerrar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Procesando pago</Text>
          <View style={styles.placeholder} />
        </View>

        {/* WebView */}
        <WebView
          ref={webViewRef}
          source={{ uri: checkoutUrl }}
          style={styles.webview}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onLoadEnd={handleLoadEnd}
          onLoadStart={handleLoadStart}
          onError={handleError}
          onNavigationStateChange={handleNavigationStateChange}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          // Permitir que el WebView abra enlaces externos dentro del mismo WebView
          // Esto es importante para que Mercado Pago funcione correctamente
          originWhitelist={['*']}
          // Permitir redirecciones automáticas
          allowsBackForwardNavigationGestures={true}
          // Inyectar JavaScript para detectar redirecciones de Mercado Pago
          injectedJavaScript={`
            (function() {
              // Detectar cuando Mercado Pago intenta redirigir
              const originalLocationReplace = window.location.replace;
              const originalLocationAssign = window.location.assign;
              
              window.location.replace = function(url) {
                console.log('🔍 window.location.replace llamado con:', url);
                if (url && url.startsWith('mecanimovil://')) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'deep_link_detected',
                    url: url
                  }));
                  return;
                }
                return originalLocationReplace.apply(this, arguments);
              };
              
              window.location.assign = function(url) {
                console.log('🔍 window.location.assign llamado con:', url);
                if (url && url.startsWith('mecanimovil://')) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'deep_link_detected',
                    url: url
                  }));
                  return;
                }
                return originalLocationAssign.apply(this, arguments);
              };
              
              // También detectar cambios en window.location.href
              let currentHref = window.location.href;
              const checkHref = setInterval(function() {
                if (window.location.href !== currentHref) {
                  currentHref = window.location.href;
                  if (currentHref.startsWith('mecanimovil://')) {
                    console.log('🔍 Cambio de href detectado:', currentHref);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'deep_link_detected',
                      url: currentHref
                    }));
                    clearInterval(checkHref);
                  }
                }
              }, 100);
              
              // Detectar clics en enlaces que puedan ser deep links
              document.addEventListener('click', function(e) {
                const link = e.target.closest('a');
                if (link && link.href && link.href.startsWith('mecanimovil://')) {
                  e.preventDefault();
                  console.log('🔍 Click en deep link detectado:', link.href);
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'deep_link_detected',
                    url: link.href
                  }));
                }
              }, true);
              
              true; // Valor de retorno requerido
            })();
          `}
          onMessage={(event) => {
            try {
              const message = JSON.parse(event.nativeEvent.data);
              if (message.type === 'deep_link_detected' && message.url) {
                console.log('🔗 Deep link detectado vía JavaScript injection:', message.url);
                
                // Guardar el deep link en AsyncStorage
                AsyncStorage.setItem('pending_deep_link', message.url).catch(console.warn);
                
                // Cerrar el modal y procesar el pago
                navigation.goBack();
                
                // Navegar a PaymentCallbackScreen con el deep link
                setTimeout(() => {
                  console.log('📱 Navegando a PaymentCallbackScreen desde JavaScript injection:', message.url);
                  navigation.navigate('PaymentCallback', {
                    url: message.url,
                    from_webview: true
                  });
                }, 300);
              }
            } catch (e) {
              console.warn('Error procesando mensaje del WebView:', e);
            }
          }}
        />

        {/* Loading indicator */}
        {loading && !pageLoadedRef.current && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Cargando Mercado Pago...</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40, // Mismo ancho que el botón de cerrar para centrar el título
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});

export default MercadoPagoWebViewScreen;

