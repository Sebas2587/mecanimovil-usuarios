/**
 * PaymentCallbackScreen - Pantalla de callback para Mercado Pago
 * 
 * Esta pantalla maneja el retorno de Mercado Pago después de un pago.
 * Procesa los parámetros de la URL, confirma el pago con el backend y redirige.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MercadoPagoService from '../../services/mercadopago';
import { COLORS, ROUTES } from '../../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PaymentCallbackScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Procesando tu pago...');

  // Función para parsear query params de una URL
  const parseQueryParams = (url) => {
    try {
      console.log('🔍 Parseando URL:', url);
      
      // Si la URL no tiene protocolo, agregarlo para que URL() funcione
      let urlToParse = url;
      if (!url.includes('://')) {
        urlToParse = url.replace('mecanimovil://', 'http://');
      }
      
      const urlObj = new URL(urlToParse);
      const params = {};
      
      // Parsear query params
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      // También verificar fragmento (#)
      if (urlObj.hash) {
        const hashParams = urlObj.hash.substring(1).split('&');
        hashParams.forEach(param => {
          const [key, value] = param.split('=');
          if (key && value) {
            params[key] = decodeURIComponent(value);
          }
        });
      }
      
      // También parsear el path si tiene parámetros (ej: mecanimovil://payment/success?status=approved)
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length > 1) {
        const statusFromPath = pathParts[pathParts.length - 1];
        if (statusFromPath && !params.status) {
          params.status = statusFromPath;
        }
      }
      
      console.log('✅ Parámetros parseados:', params);
      return params;
    } catch (e) {
      console.warn('❌ Error parseando URL:', e);
      // Intentar parseo manual como fallback
      try {
        const params = {};
        const parts = url.split('?');
        if (parts.length > 1) {
          const queryString = parts[1].split('#')[0];
          queryString.split('&').forEach(param => {
            const [key, value] = param.split('=');
            if (key && value) {
              params[key] = decodeURIComponent(value);
            }
          });
        }
        // Extraer status del path si existe
        const pathMatch = url.match(/\/payment\/(\w+)/);
        if (pathMatch && !params.status) {
          params.status = pathMatch[1];
        }
        console.log('✅ Parámetros parseados (fallback):', params);
        return params;
      } catch (e2) {
        console.error('❌ Error en parseo fallback:', e2);
        return {};
      }
    }
  };

  useEffect(() => {
    // Verificar si hay un deep link guardado en AsyncStorage (cuando la app se reinicia)
    // O si viene directamente desde el navegador in-app
    const checkPendingDeepLink = async () => {
      try {
        // PRIMERO: Verificar si viene desde verificación de WebView (sin deep link)
        if (route.params?.from_webview_verification && route.params?.ofertaId) {
          console.log('📥 Procesando pago desde verificación de WebView');
          console.log('   - Oferta ID:', route.params.ofertaId);
          console.log('   - Tipo pago:', route.params.tipoPago);
          console.log('   - Status:', route.params.status);
          
          const { ofertaId, tipoPago, status: paymentStatus, confirmResult } = route.params;
          
          // Si ya hay un resultado de confirmación, procesarlo
          if (confirmResult && confirmResult.success) {
            setStatus('success');
            setMessage(confirmResult.message || '¡Pago confirmado!');
            
            // Limpiar datos pendientes
            await AsyncStorage.removeItem('pago_pendiente');
            await AsyncStorage.removeItem('pago_pendiente_data');
            await AsyncStorage.removeItem('expected_deep_link');
            await AsyncStorage.removeItem('pending_deep_link');
            
            setTimeout(() => {
              Alert.alert(
                '¡Pago Exitoso!',
                confirmResult.message || 'Tu pago ha sido procesado correctamente.',
                [
                  {
                    text: 'Ver mis solicitudes',
                    onPress: () => {
                      navigation.reset({
                        index: 0,
                        routes: [{ 
                          name: 'TabNavigator', 
                          params: { screen: ROUTES.MIS_SOLICITUDES } 
                        }],
                      });
                    },
                  },
                ]
              );
            }, 1000);
            return true;
          }
          
          // Si el status es 'success', intentar confirmar el pago
          if (paymentStatus === 'success' && ofertaId) {
            try {
              console.log('📤 Confirmando pago desde verificación de WebView:', { ofertaId, tipoPago });
              
              const confirmResult = await MercadoPagoService.confirmarPagoOferta(
                ofertaId,
                tipoPago || 'total',
                null, // payment_id puede ser null
                'approved',
                null // external_reference puede ser null
              );
              
              console.log('✅ Resultado de confirmación:', confirmResult);
              
              if (confirmResult.success) {
                setStatus('success');
                setMessage(confirmResult.message || '¡Pago confirmado!');
                
                // Limpiar datos pendientes
                await AsyncStorage.removeItem('pago_pendiente');
                await AsyncStorage.removeItem('pago_pendiente_data');
                await AsyncStorage.removeItem('expected_deep_link');
                await AsyncStorage.removeItem('pending_deep_link');
                
                setTimeout(() => {
                  Alert.alert(
                    '¡Pago Exitoso!',
                    confirmResult.message || 'Tu pago ha sido procesado correctamente.',
                    [
                      {
                        text: 'Ver mis solicitudes',
                        onPress: () => {
                          navigation.reset({
                            index: 0,
                            routes: [{ 
                              name: 'TabNavigator', 
                              params: { screen: ROUTES.MIS_SOLICITUDES } 
                            }],
                          });
                        },
                      },
                    ]
                  );
                }, 1000);
              } else {
                throw new Error(confirmResult.error || 'Error confirmando pago');
              }
            } catch (confirmError) {
              console.error('❌ Error confirmando pago desde WebView:', confirmError);
              setStatus('processing');
              setMessage('Verificando estado del pago...');
              
              // Intentar obtener el estado desde el backend
              try {
                const estadoPago = await MercadoPagoService.getEstadoPagoOferta(ofertaId);
                if (estadoPago.oferta_estado === 'pagada') {
                  setStatus('success');
                  setMessage('¡Pago confirmado!');
                  
                  await AsyncStorage.removeItem('pago_pendiente');
                  await AsyncStorage.removeItem('pago_pendiente_data');
                  await AsyncStorage.removeItem('expected_deep_link');
                  await AsyncStorage.removeItem('pending_deep_link');
                  
                  setTimeout(() => {
                    Alert.alert(
                      '¡Pago Exitoso!',
                      'Tu pago ha sido procesado correctamente.',
                      [
                        {
                          text: 'Ver mis solicitudes',
                          onPress: () => {
                            navigation.reset({
                              index: 0,
                              routes: [{ 
                                name: 'TabNavigator', 
                                params: { screen: ROUTES.MIS_SOLICITUDES } 
                              }],
                            });
                          },
                        },
                      ]
                    );
                  }, 1000);
                } else {
                  setStatus('processing');
                  setMessage('Tu pago está en proceso de verificación...');
                  
                  setTimeout(() => {
                    Alert.alert(
                      'Pago en Proceso',
                      'Tu pago está siendo procesado. Te notificaremos cuando sea confirmado.',
                      [
                        {
                          text: 'OK',
                          onPress: () => {
                            navigation.reset({
                              index: 0,
                              routes: [{ 
                                name: 'TabNavigator', 
                                params: { screen: ROUTES.MIS_SOLICITUDES } 
                              }],
                            });
                          },
                        },
                      ]
                    );
                  }, 1500);
                }
              } catch (estadoError) {
                console.error('❌ Error obteniendo estado del pago:', estadoError);
                setStatus('processing');
                setMessage('Error al verificar el pago. Por favor, revisa tus solicitudes.');
                
                setTimeout(() => {
                  navigation.reset({
                    index: 0,
                    routes: [{ 
                      name: 'TabNavigator', 
                      params: { screen: ROUTES.MIS_SOLICITUDES } 
                    }],
                  });
                }, 2000);
              }
            }
            return true;
          }
        }
        
        // SEGUNDO: Verificar si hay una URL en los parámetros de la ruta (viene del navegador in-app)
        const routeUrl = route.params?.url;
        if (routeUrl && routeUrl.startsWith('mecanimovil://')) {
          console.log('🔗 Deep link recibido desde navegador in-app:', routeUrl);
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'J',
              location: 'PaymentCallbackScreen.js:checkPendingDeepLink:from_browser',
              message: 'Deep link recibido desde navegador in-app',
              data: { url: routeUrl },
              timestamp: Date.now()
            })
          }).catch(() => {});
          // #endregion
          
          // Parsear y procesar el deep link
          const urlParams = parseQueryParams(routeUrl);
          await processPaymentWithParams(urlParams);
          return true;
        }
        
        // SEGUNDO: Verificar si hay un deep link pendiente guardado
        const pendingDeepLink = await AsyncStorage.getItem('pending_deep_link');
        if (pendingDeepLink) {
          console.log('🔗 Deep link pendiente encontrado en AsyncStorage:', pendingDeepLink);
          await AsyncStorage.removeItem('pending_deep_link');
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'I',
              location: 'PaymentCallbackScreen.js:checkPendingDeepLink:found',
              message: 'Deep link pendiente encontrado',
              data: { pending_deep_link: pendingDeepLink },
              timestamp: Date.now()
            })
          }).catch(() => {});
          // #endregion
          
          // Parsear el deep link y procesarlo
          const urlParams = parseQueryParams(pendingDeepLink);
          console.log('   - Parámetros extraídos del deep link pendiente:', urlParams);
          
          // Procesar el pago con los parámetros del deep link
          await processPaymentWithParams(urlParams);
          return true; // Indica que se procesó un deep link pendiente
        }
        
        // SEGUNDO: Si no hay deep link pendiente, verificar si hay datos de pago pendiente
        // Esto puede ocurrir si la app se reinició antes de que llegara el deep link
        // O si la app volvió al foreground después de estar en background (app de Mercado Pago)
        const pagoPendienteDataStr = await AsyncStorage.getItem('pago_pendiente_data');
        if (pagoPendienteDataStr) {
          const pagoPendienteData = JSON.parse(pagoPendienteDataStr);
          console.log('💾 Datos de pago pendiente encontrados:', pagoPendienteData);
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'K',
              location: 'PaymentCallbackScreen.js:checkPendingDeepLink:pago_pendiente_found',
              message: 'Datos de pago pendiente encontrados',
              data: { pago_pendiente_data: pagoPendienteData, from_foreground: route.params?.from_foreground },
              timestamp: Date.now()
            })
          }).catch(() => {});
          // #endregion
          
          // Intentar obtener el estado del pago desde el backend
          // Usar ofertaId directamente si está disponible, o extraerlo del external_reference
          let ofertaId = route.params?.ofertaId || pagoPendienteData.ofertaId;
          
          if (!ofertaId && pagoPendienteData.externalReference) {
            const parts = pagoPendienteData.externalReference.split('_');
            if (parts.length >= 2 && parts[0] === 'oferta') {
              ofertaId = parts[1];
            }
          }
          
          if (ofertaId) {
            try {
              console.log('📥 Obteniendo estado del pago desde backend para oferta:', ofertaId);
              const estadoPago = await MercadoPagoService.getEstadoPagoOferta(ofertaId);
              console.log('✅ Estado del pago obtenido:', estadoPago);
              
              // Si el pago ya fue procesado, actualizar la UI y navegar
              if (estadoPago.oferta_estado === 'pagada') {
                setStatus('success');
                setMessage('¡Pago confirmado!');
                
                // Limpiar datos pendientes
                await AsyncStorage.removeItem('pago_pendiente');
                await AsyncStorage.removeItem('pago_pendiente_data');
                await AsyncStorage.removeItem('expected_deep_link');
                await AsyncStorage.removeItem('pending_deep_link');
                
                setTimeout(() => {
                  Alert.alert(
                    '¡Pago Exitoso!',
                    'Tu pago ha sido procesado correctamente.',
                    [
                      {
                        text: 'Ver mis solicitudes',
                        onPress: () => {
                          navigation.reset({
                            index: 0,
                            routes: [{ 
                              name: 'TabNavigator', 
                              params: { screen: ROUTES.MIS_SOLICITUDES } 
                            }],
                          });
                        },
                      },
                    ]
                  );
                }, 1000);
                return true;
              } else {
                setStatus('processing');
                setMessage('Verificando estado del pago...');

                setTimeout(async () => {
                  try {
                    const estadoPagoRetry = await MercadoPagoService.getEstadoPagoOferta(ofertaId);
                    if (estadoPagoRetry.oferta_estado === 'pagada') {
                      setStatus('success');
                      setMessage('¡Pago confirmado!');
                      await AsyncStorage.removeItem('pago_pendiente');
                      await AsyncStorage.removeItem('pago_pendiente_data');
                      await AsyncStorage.removeItem('expected_deep_link');
                      await AsyncStorage.removeItem('pending_deep_link');
                      setTimeout(() => {
                        Alert.alert(
                          '¡Pago Exitoso!',
                          'Tu pago ha sido procesado correctamente.',
                          [
                            {
                              text: 'Ver mis solicitudes',
                              onPress: () => {
                                navigation.reset({
                                  index: 0,
                                  routes: [{
                                    name: 'TabNavigator',
                                    params: { screen: ROUTES.MIS_SOLICITUDES },
                                  }],
                                });
                              },
                            },
                          ]
                        );
                      }, 400);
                    } else {
                      setMessage('Sin confirmar aún');
                      Alert.alert(
                        'Pago no confirmado',
                        'Todavía no registramos el pago. Si acabas de pagar, espera un momento y revisa «Mis solicitudes». Si no completaste el pago, puedes volver a intentarlo desde la solicitud.',
                        [
                          {
                            text: 'Entendido',
                            onPress: () => {
                              navigation.reset({
                                index: 0,
                                routes: [{
                                  name: 'TabNavigator',
                                  params: { screen: ROUTES.MIS_SOLICITUDES },
                                }],
                              });
                            },
                          },
                        ]
                      );
                    }
                  } catch (e) {
                    console.warn('Error verificando estado del pago (retry):', e);
                    Alert.alert(
                      'Error',
                      'No pudimos verificar el pago. Revisa «Mis solicitudes».',
                      [
                        {
                          text: 'OK',
                          onPress: () => {
                            navigation.reset({
                              index: 0,
                              routes: [{
                                name: 'TabNavigator',
                                params: { screen: ROUTES.MIS_SOLICITUDES },
                              }],
                            });
                          },
                        },
                      ]
                    );
                  }
                }, 3000);
                return true;
              }
            } catch (e) {
              console.warn('Error obteniendo estado del pago:', e);
            }
          }
        }
      } catch (e) {
        console.warn('Error verificando deep link pendiente:', e);
      }
      return false;
    };

    // Definir processPaymentWithParams primero para que pueda ser usado por otros handlers
    const processPaymentWithParams = async (paymentParams) => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'I',
            location: 'PaymentCallbackScreen.js:processPaymentWithParams:entry',
            message: 'Procesando pago con parámetros',
            data: { paymentParams },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        
        const {
          status: paymentStatus,
          payment_id: paymentId,
          external_reference: externalReference,
          collection_status,
          payment_type,
          status: statusParam,
          // También verificar otros posibles nombres de parámetros
          'payment_id': paymentIdAlt,
          'external_reference': externalReferenceAlt,
          'status': statusAlt,
        } = paymentParams;

        // Usar valores alternativos si los principales no existen
        const finalPaymentId = paymentId || paymentIdAlt;
        const finalExternalReference = externalReference || externalReferenceAlt;
        
        // Mercado Pago puede enviar el status de diferentes formas
        const finalStatus = paymentStatus || collection_status || statusParam || statusAlt || 'unknown';
        
        console.log('📊 Parámetros de pago procesados:');
        console.log('   - Status final:', finalStatus);
        console.log('   - Payment ID:', finalPaymentId);
        console.log('   - External Reference:', finalExternalReference);
        console.log('   - Todos los parámetros recibidos:', paymentParams);

        const normStatus = String(finalStatus || '').toLowerCase();
        const verifyOfertaId =
          paymentParams.ofertaId || paymentParams.oferta_id || null;
        const isAppInternalVerifyOnly =
          normStatus === 'processing' &&
          (paymentParams.from_foreground || paymentParams.from_storage) &&
          !finalPaymentId &&
          !paymentParams.payment_id;

        if (isAppInternalVerifyOnly && verifyOfertaId) {
          try {
            const estadoPago = await MercadoPagoService.getEstadoPagoOferta(verifyOfertaId);
            if (estadoPago.oferta_estado === 'pagada') {
              setStatus('success');
              setMessage('¡Pago confirmado!');
              await AsyncStorage.multiRemove([
                'pago_pendiente',
                'pago_pendiente_data',
                'expected_deep_link',
                'pending_deep_link',
              ]);
              setTimeout(() => {
                Alert.alert(
                  '¡Pago Exitoso!',
                  'Tu pago ha sido procesado correctamente.',
                  [
                    {
                      text: 'Ver mis solicitudes',
                      onPress: () => {
                        navigation.reset({
                          index: 0,
                          routes: [{
                            name: 'TabNavigator',
                            params: { screen: ROUTES.MIS_SOLICITUDES },
                          }],
                        });
                      },
                    },
                  ]
                );
              }, 500);
            } else {
              setStatus('processing');
              setMessage('Sin confirmar aún');
              setTimeout(() => {
                Alert.alert(
                  'Pago no confirmado',
                  'Todavía no registramos el pago en tu solicitud. Si acabas de pagar, puede tardar un minuto. Si interrumpiste el checkout, vuelve a «Mis solicitudes» e intenta de nuevo.',
                  [
                    {
                      text: 'Entendido',
                      onPress: () => {
                        navigation.reset({
                          index: 0,
                          routes: [{
                            name: 'TabNavigator',
                            params: { screen: ROUTES.MIS_SOLICITUDES },
                          }],
                        });
                      },
                    },
                  ]
                );
              }, 400);
            }
          } catch (e) {
            console.error('Error verificando estado tras volver del checkout:', e);
            setStatus('error');
            setMessage('No pudimos verificar el pago');
            setTimeout(() => {
              Alert.alert(
                'Error de verificación',
                'No pudimos confirmar el estado del pago. Revisa «Mis solicitudes» o inténtalo de nuevo.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.reset({
                        index: 0,
                        routes: [{
                          name: 'TabNavigator',
                          params: { screen: ROUTES.MIS_SOLICITUDES },
                        }],
                      });
                    },
                  },
                ]
              );
            }, 400);
          }
          return;
        }

        // Si el pago fue rechazado o cancelado
        if (['rejected', 'failure', 'cancelled'].includes(finalStatus)) {
          setStatus('error');
          setMessage('El pago no pudo ser procesado');
          
          setTimeout(() => {
            Alert.alert(
              'Pago No Completado',
              'El pago fue rechazado o cancelado. Por favor, intenta nuevamente.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.reset({
                      index: 0,
                      routes: [{ 
                        name: 'TabNavigator', 
                        params: { screen: ROUTES.MIS_SOLICITUDES } 
                      }],
                    });
                  },
                },
              ]
            );
          }, 1000);
          return;
        }

        // Si el pago está pendiente
        if (['pending', 'in_process'].includes(finalStatus)) {
          setStatus('processing');
          setMessage('Tu pago está en proceso de verificación...');
          
          setTimeout(() => {
            Alert.alert(
              'Pago en Proceso',
              'Tu pago está siendo procesado. Te notificaremos cuando sea confirmado.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.reset({
                      index: 0,
                      routes: [{ 
                        name: 'TabNavigator', 
                        params: { screen: ROUTES.MIS_SOLICITUDES } 
                      }],
                    });
                  },
                },
              ]
            );
          }, 1500);
          return;
        }

        // Si el pago fue aprobado, confirmar con el backend
        if (['approved', 'success'].includes(finalStatus)) {
          setMessage('Confirmando tu pago...');
          
          // Intentar obtener datos guardados del pago pendiente
          let ofertaId = null;
          let tipoPago = 'total';
          
          // Extraer del external_reference (formato: oferta_{uuid}_{tipo})
          const refToUse = finalExternalReference || externalReference;
          if (refToUse) {
            console.log('   - Procesando external_reference:', refToUse);
            const parts = refToUse.split('_');
            if (parts.length >= 2 && parts[0] === 'oferta') {
              ofertaId = parts[1];
              if (parts.length >= 3) {
                tipoPago = parts[2];
              }
              console.log('   - Oferta ID extraído:', ofertaId);
              console.log('   - Tipo de pago extraído:', tipoPago);
            } else {
              console.warn('   - Formato de external_reference no reconocido:', refToUse);
            }
          } else {
            console.warn('   - No se encontró external_reference en los parámetros');
          }

          // Si no hay ofertaId en el external_reference, intentar obtener del AsyncStorage
          if (!ofertaId) {
            try {
              // Primero intentar desde pago_pendiente_data (más completo)
              const pagoPendienteDataStr = await AsyncStorage.getItem('pago_pendiente_data');
              if (pagoPendienteDataStr) {
                const pagoPendienteData = JSON.parse(pagoPendienteDataStr);
                ofertaId = pagoPendienteData.ofertaId;
                tipoPago = pagoPendienteData.tipoPago || 'total';
                console.log('   - Pago pendiente recuperado de pago_pendiente_data:', pagoPendienteData);
              } else {
                // Fallback a pago_pendiente (formato anterior)
                const pagoPendienteStr = await AsyncStorage.getItem('pago_pendiente');
                if (pagoPendienteStr) {
                  const pagoPendiente = JSON.parse(pagoPendienteStr);
                  ofertaId = pagoPendiente.ofertaId;
                  tipoPago = pagoPendiente.tipoPago || 'total';
                  console.log('   - Pago pendiente recuperado de AsyncStorage:', pagoPendiente);
                }
              }
            } catch (e) {
              console.warn('Error recuperando pago pendiente:', e);
            }
          }
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'I',
              location: 'PaymentCallbackScreen.js:processPaymentWithParams:before_confirm',
              message: 'Antes de confirmar pago',
              data: { 
                ofertaId, 
                tipoPago, 
                externalReference,
                finalStatus,
                paymentId
              },
              timestamp: Date.now()
            })
          }).catch(() => {});
          // #endregion

          if (!ofertaId) {
            console.warn('⚠️ No se encontró ofertaId para confirmar el pago');
            setStatus('success');
            setMessage('¡Pago recibido!');
            
            await AsyncStorage.removeItem('pago_pendiente');
            
            setTimeout(() => {
              Alert.alert(
                '¡Pago Recibido!',
                'Tu pago fue procesado. Verifica el estado de tu solicitud.',
                [
                  {
                    text: 'Ver mis solicitudes',
                    onPress: () => {
                      navigation.reset({
                        index: 0,
                        routes: [{ 
                          name: 'TabNavigator', 
                          params: { screen: ROUTES.MIS_SOLICITUDES } 
                        }],
                      });
                    },
                  },
                ]
              );
            }, 1000);
            return;
          }

          // Confirmar el pago con el backend
          try {
            console.log('📤 Confirmando pago con backend:', { ofertaId, tipoPago, paymentId });
            
            const confirmResult = await MercadoPagoService.confirmarPagoOferta(
              ofertaId,
              tipoPago,
              finalPaymentId || paymentId,
              finalStatus,
              finalExternalReference || externalReference
            );

                console.log('✅ Resultado de confirmación:', confirmResult);

                // Limpiar todos los datos pendientes
                await AsyncStorage.removeItem('pago_pendiente');
                await AsyncStorage.removeItem('pago_pendiente_data');
                await AsyncStorage.removeItem('expected_deep_link');
                await AsyncStorage.removeItem('pending_deep_link');

            if (confirmResult.success) {
              setStatus('success');
              setMessage(confirmResult.message || '¡Pago confirmado!');
              
              setTimeout(() => {
                Alert.alert(
                  '¡Pago Exitoso!',
                  confirmResult.message || 'Tu pago ha sido procesado correctamente.',
                  [
                    {
                      text: 'Ver mis solicitudes',
                      onPress: () => {
                        navigation.reset({
                          index: 0,
                          routes: [{ 
                            name: 'TabNavigator', 
                            params: { screen: ROUTES.MIS_SOLICITUDES } 
                          }],
                        });
                      },
                    },
                  ]
                );
              }, 1000);
            } else {
              throw new Error(confirmResult.error || 'Error confirmando pago');
            }
          } catch (confirmError) {
            console.error('❌ Error confirmando pago:', confirmError);
            
            setStatus('success');
            setMessage('¡Pago recibido! Actualizando...');
            
            await AsyncStorage.removeItem('pago_pendiente');
            
            setTimeout(() => {
              Alert.alert(
                'Pago Recibido',
                'Tu pago fue procesado. El estado de tu solicitud se actualizará pronto.',
                [
                  {
                    text: 'Ver mis solicitudes',
                    onPress: () => {
                      navigation.reset({
                        index: 0,
                        routes: [{ 
                          name: 'TabNavigator', 
                          params: { screen: ROUTES.MIS_SOLICITUDES } 
                        }],
                      });
                    },
                  },
                ]
              );
            }, 1500);
          }
        } else {
          console.warn('⚠️ Estado de pago desconocido:', finalStatus);
          setStatus('processing');
          setMessage('No pudimos interpretar la respuesta del pago');

          setTimeout(() => {
            Alert.alert(
              'Revisar pago',
              'No recibimos un resultado claro de Mercado Pago. Revisa en «Mis solicitudes» si el pago quedó registrado; si no, vuelve a intentar el pago.',
              [
                {
                  text: 'Ir a mis solicitudes',
                  onPress: () => {
                    navigation.reset({
                      index: 0,
                      routes: [{
                        name: 'TabNavigator',
                        params: { screen: ROUTES.MIS_SOLICITUDES },
                      }],
                    });
                  },
                },
              ]
            );
          }, 400);
        }
      } catch (error) {
        console.error('❌ Error procesando callback:', error);
        setStatus('error');
        setMessage('Error procesando el pago');
        
        setTimeout(() => {
          Alert.alert(
            'Error',
            'Hubo un problema al procesar tu pago. Por favor, verifica en tus solicitudes.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [{ 
                      name: 'TabNavigator', 
                      params: { screen: ROUTES.MIS_SOLICITUDES } 
                    }],
                  });
                },
              },
            ]
          );
        }, 1500);
      }
    };

    // Listener para deep links cuando la app está abierta
    const handleDeepLink = async (event) => {
      const { url } = event;
      console.log('🔗 Deep link recibido en PaymentCallbackScreen:', url);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'E',
          location: 'PaymentCallbackScreen.js:deep_link_received',
          message: 'Deep link recibido',
          data: { url },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
      
      if (url && (url.includes('payment') || url.includes('status') || url.includes('payment_id'))) {
        const urlParams = parseQueryParams(url);
        console.log('   - Parámetros extraídos de URL:', urlParams);
        // Procesar el pago con los parámetros de la URL
        await processPaymentWithParams(urlParams);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Verificar URL inicial
    Linking.getInitialURL().then(url => {
      if (url && (url.includes('payment') || url.includes('status') || url.includes('payment_id'))) {
        console.log('🔗 URL inicial en PaymentCallbackScreen:', url);
        const urlParams = parseQueryParams(url);
        processPaymentWithParams(urlParams);
      }
    });

    const processPayment = async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'A',
            location: 'PaymentCallbackScreen.js:entry',
            message: 'PaymentCallbackScreen iniciado',
            data: {
              route_params: route.params,
              route_name: route.name,
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        
        console.log('📤 PaymentCallbackScreen: Procesando callback de Mercado Pago');
        console.log('   - Route params:', route.params);
        console.log('   - Route name:', route.name);
        
        // PRIMERO: Verificar si hay un deep link pendiente en AsyncStorage (cuando la app se reinicia)
        const hasPendingDeepLink = await checkPendingDeepLink();
        if (hasPendingDeepLink) {
          console.log('✅ Deep link pendiente procesado, no procesar route.params');
          return; // Ya se procesó el deep link pendiente
        }
        
        // Obtener parámetros del deep link
        // Mercado Pago envía los parámetros como query params en la URL:
        // mecanimovil://payment/success?status=approved&payment_id=123&external_reference=oferta_xxx_total&collection_status=approved
        let paymentParams = { ...route.params };
        
        console.log('   - Route params iniciales:', paymentParams);
        
        // Intentar obtener la URL actual para extraer query params
        try {
          const currentUrl = await Linking.getInitialURL();
          if (currentUrl && currentUrl.includes('payment')) {
            console.log('   - URL inicial detectada:', currentUrl);
            const urlParams = parseQueryParams(currentUrl);
            console.log('   - Query params extraídos de URL:', urlParams);
            paymentParams = { ...paymentParams, ...urlParams };
          }
        } catch (e) {
          console.warn('Error obteniendo URL inicial:', e);
        }
        
        // También verificar si hay params en la navegación
        const navParams = navigation.getState()?.routes?.find(r => r.name === 'PaymentCallback')?.params;
        if (navParams) {
          console.log('   - Params de navegación:', navParams);
          paymentParams = { ...paymentParams, ...navParams };
        }
        
        // Si aún no tenemos parámetros, intentar obtenerlos del route.state
        if (!paymentParams.status && !paymentParams.payment_id) {
          const routeState = route.state;
          if (routeState && routeState.params) {
            console.log('   - Params de route.state:', routeState.params);
            paymentParams = { ...paymentParams, ...routeState.params };
          }
        }
        
        console.log('   - Parámetros finales combinados:', paymentParams);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'F',
            location: 'PaymentCallbackScreen.js:processPayment:params_extracted',
            message: 'Parámetros extraídos del deep link',
            data: {
              route_params: route.params,
              final_params: paymentParams,
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        
        // Procesar el pago
        await processPaymentWithParams(paymentParams);
      } catch (error) {
        console.error('❌ Error general en PaymentCallbackScreen:', error);
        setStatus('error');
        setMessage('Ocurrió un error inesperado.');
        await AsyncStorage.removeItem('pago_pendiente');
        setTimeout(() => {
          Alert.alert(
            'Error',
            'Ocurrió un error inesperado al procesar tu pago. Por favor, verifica el estado de tu solicitud.',
            [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'TabNavigator', params: { screen: ROUTES.MIS_SOLICITUDES } }] }) }]
          );
        }, 1500);
      }
    };

    // Procesar pago inicial con route.params
    processPayment();

    // Cleanup
    return () => {
      subscription?.remove();
    };
  }, [route.params, navigation]);

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={80} color="#28A745" />;
      case 'error':
        return <Ionicons name="close-circle" size={80} color="#DC3545" />;
      default:
        return <ActivityIndicator size="large" color={COLORS.primary} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {getIcon()}
        </View>
        <Text style={styles.message}>{message}</Text>
        {status === 'processing' && (
          <Text style={styles.subMessage}>
            Por favor, no cierres la aplicación
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  iconContainer: {
    marginBottom: 30,
  },
  message: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
});

export default PaymentCallbackScreen;

