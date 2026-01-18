import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAgendamiento } from '../../context/AgendamientoContext';
import { COLORS } from '../../utils/constants';
import MercadoPagoService from '../../services/mercadopago';

const METODOS_PAGO = {
  MERCADOPAGO: 'mercadopago',
  TRANSFERENCIA: 'transferencia'
};

const ConfirmacionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { 
    metodoPago, 
    comprobanteEnviado,
    paymentResult,
    paymentSuccess,
    paymentId,
    paymentStatus, // Nuevo: estado del pago desde Checkout Pro
    externalReference, // Nuevo: referencia externa (carrito ID)
  } = route.params || {};
  const { carritos, carrito, confirmarAgendamiento } = useAgendamiento();
  const [confirmando, setConfirmando] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loadingPaymentInfo, setLoadingPaymentInfo] = useState(false);

  // Determinar si el pago es exitoso basado en el estado
  const isPaymentSuccessful = React.useMemo(() => {
    if (paymentStatus === 'approved' || paymentStatus === 'success') {
      return true;
    }
    if (paymentStatus === 'rejected' || paymentStatus === 'failure' || paymentStatus === 'error') {
      return false;
    }
    // Si hay paymentSuccess explícito, usarlo
    if (paymentSuccess !== undefined) {
      return paymentSuccess;
    }
    // Si hay paymentResult con status approved
    if (paymentResult?.status === 'approved') {
      return true;
    }
    // Por defecto, si no hay información de pago de Mercado Pago, es transferencia
    return metodoPago !== METODOS_PAGO.MERCADOPAGO;
  }, [paymentStatus, paymentSuccess, paymentResult, metodoPago]);

  // Cargar información del pago si hay paymentId de Mercado Pago
  useEffect(() => {
    const loadPaymentInfo = async () => {
      // Solo cargar si es un pago de Mercado Pago y hay paymentId
      if (metodoPago === METODOS_PAGO.MERCADOPAGO && paymentId) {
        setLoadingPaymentInfo(true);
        try {
          console.log('📥 Cargando información del pago:', paymentId);
          
          const paymentStatusData = await MercadoPagoService.getPaymentStatus(paymentId);
          
          if (paymentStatusData.success) {
            setPaymentInfo(paymentStatusData.payment);
            console.log('✅ Información del pago cargada:', paymentStatusData);
          } else {
            console.warn('⚠️ No se pudo obtener información del pago');
          }
        } catch (error) {
          console.error('❌ Error cargando información del pago:', error);
          // No mostrar error al usuario, solo log
        } finally {
          setLoadingPaymentInfo(false);
        }
      } else if (paymentResult) {
        // Si hay paymentResult directamente, usarlo
        setPaymentInfo(paymentResult.payment || paymentResult);
      }
    };
    
    loadPaymentInfo();
  }, [paymentId, metodoPago, paymentResult]);

  // Calcular resumen
  const resumen = React.useMemo(() => {
    const carritosArray = carritos || (carrito ? [carrito] : []);
    
    if (!carritosArray || carritosArray.length === 0) return null;
    
    let totalServicios = 0;
    let serviciosDetalle = [];
    let totalGeneral = 0;
    
    carritosArray.forEach(carrito => {
      const items = carrito.items_detail || carrito.items || [];
      totalServicios += items.length;
      
      const totalConIVA = parseFloat(carrito.total || 0);
      const totalSinIVA = totalConIVA / 1.19;
      totalGeneral += totalSinIVA;
      
      items.forEach(item => {
        serviciosDetalle.push({
          servicio: item.servicio_nombre,
          proveedor: item.taller_nombre || item.mecanico_nombre,
          tipoProveedor: item.taller_nombre ? 'Taller' : 'Mecánico',
          fecha: item.fecha_servicio,
          hora: item.hora_servicio
        });
      });
    });
    
    return {
      totalServicios,
      serviciosDetalle,
      totalGeneral
    };
  }, [carritos, carrito]);

  // Descargar comprobante de pago de Mercado Pago
  const handleDownloadReceipt = async () => {
    if (!paymentId || metodoPago !== METODOS_PAGO.MERCADOPAGO) {
      Alert.alert('Info', 'Comprobante no disponible');
      return;
    }

    try {
      setDownloadingReceipt(true);
      
      // Obtener la URL del comprobante desde el backend
      const paymentStatusData = await MercadoPagoService.getPaymentStatus(paymentId);
      
      if (paymentStatusData.success && paymentStatusData.payment?.receipt_url) {
        const receiptUrl = paymentStatusData.payment.receipt_url;
        
        // Abrir la URL del comprobante
        const canOpen = await Linking.canOpenURL(receiptUrl);
        
        if (canOpen) {
          await Linking.openURL(receiptUrl);
        } else {
          // Si no se puede abrir, intentar compartir
          await Share.share({
            message: `Comprobante de pago: ${receiptUrl}`,
            url: receiptUrl,
          });
        }
      } else {
        Alert.alert('Info', 'Comprobante no disponible aún. Intenta más tarde.');
      }
    } catch (error) {
      console.error('❌ Error descargando comprobante:', error);
      Alert.alert('Error', 'No se pudo descargar el comprobante. Intenta más tarde.');
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const handleConfirmar = async () => {
    // Si el pago fue exitoso, confirmar agendamiento automáticamente
    if (isPaymentSuccessful && (paymentId || metodoPago !== METODOS_PAGO.MERCADOPAGO)) {
      setConfirmando(true);
      
      try {
        console.log('✅ Confirmando agendamiento después de pago exitoso...');
        
        // Obtener el carrito activo
        const carritoActivo = carrito || (carritos && carritos.length > 0 ? carritos[0] : null);
        
        if (!carritoActivo) {
          Alert.alert('Error', 'No se encontró el carrito para confirmar');
          setConfirmando(false);
          return;
        }

        if (!metodoPago) {
          Alert.alert('Error', 'No se seleccionó un método de pago');
          setConfirmando(false);
          return;
        }
        
        // Construir notas del pago
        let notas = '';
        if (metodoPago === METODOS_PAGO.MERCADOPAGO && paymentId) {
          notas = `Pago con Mercado Pago. Payment ID: ${paymentId}`;
          if (paymentInfo?.status) {
            notas += `. Estado: ${paymentInfo.status}`;
          }
        } else if (comprobanteEnviado) {
          notas = 'Comprobante de transferencia enviado por WhatsApp';
        }
        
        console.log('🔄 Confirmando carrito ID:', carritoActivo.id);
        const solicitudCreada = await confirmarAgendamiento(
          carritoActivo.id,
          metodoPago,
          true, // aceptaTerminos (ya fue aceptado en la pantalla anterior)
          notas
        );
        
        console.log('✅ Agendamiento confirmado exitosamente:', solicitudCreada);
        
        Alert.alert(
          '¡Agendamiento Exitoso!',
          metodoPago === METODOS_PAGO.MERCADOPAGO
            ? 'Tu servicio ha sido agendado correctamente y el pago fue procesado exitosamente.'
            : 'Tu servicio ha sido agendado correctamente.',
          [
            {
              text: 'Ver Mis Citas',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ 
                    name: 'TabNavigator', 
                    params: { screen: 'MisCitas' } 
                  }],
                });
              }
            },
            {
              text: 'Volver al Inicio',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ 
                    name: 'TabNavigator', 
                    params: { screen: 'Home' } 
                  }],
                });
              }
            }
          ]
        );
      } catch (error) {
        console.error('❌ Error confirmando agendamiento:', error);
        Alert.alert('Error', error.message || 'No se pudo confirmar el agendamiento. Intenta nuevamente.');
      } finally {
        setConfirmando(false);
      }
    } else if (!isPaymentSuccessful && metodoPago === METODOS_PAGO.MERCADOPAGO) {
      // Si el pago falló, mostrar error
      Alert.alert(
        'Pago Rechazado',
        paymentInfo?.status_detail || paymentResult?.error || 'El pago no pudo ser procesado. Por favor, intenta con otro método de pago.',
        [
          {
            text: 'Volver',
            onPress: () => navigation.goBack(),
          },
          {
            text: 'Reintentar',
            onPress: () => {
              navigation.navigate('OpcionesPago');
            },
          },
        ]
      );
    } else {
      // Flujo sin Mercado Pago (transferencia, etc.)
      setConfirmando(true);
      
      try {
        console.log('✅ Confirmando agendamiento...');
        console.log('📋 Datos para confirmación:', {
          metodoPago,
          comprobanteEnviado,
          carritos: carritos?.length || 0
        });
        
        // Obtener el carrito activo
        const carritoActivo = carrito || (carritos && carritos.length > 0 ? carritos[0] : null);
        
        if (!carritoActivo) {
          Alert.alert('Error', 'No se encontró el carrito para confirmar');
          setConfirmando(false);
          return;
        }

        if (!metodoPago) {
          Alert.alert('Error', 'No se seleccionó un método de pago');
          setConfirmando(false);
          return;
        }
        
        let notas = '';
        if (comprobanteEnviado) {
          notas = 'Comprobante de transferencia enviado por WhatsApp';
        }
        
        console.log('🔄 Confirmando carrito ID:', carritoActivo.id);
        const solicitudCreada = await confirmarAgendamiento(
          carritoActivo.id,
          metodoPago,
          true, // aceptaTerminos (ya fue aceptado en la pantalla anterior)
          notas
        );
        
        console.log('✅ Agendamiento confirmado exitosamente:', solicitudCreada);
        
        Alert.alert(
          '¡Agendamiento Exitoso!',
          'Tu servicio ha sido agendado correctamente',
          [
            {
              text: 'Ver Mis Citas',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ 
                    name: 'TabNavigator', 
                    params: { screen: 'MisCitas' } 
                  }],
                });
              }
            },
            {
              text: 'Volver al Inicio',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ 
                    name: 'TabNavigator', 
                    params: { screen: 'Home' } 
                  }],
                });
              }
            }
          ]
        );
      } catch (error) {
        console.error('❌ Error confirmando agendamiento:', error);
        Alert.alert('Error', error.message || 'No se pudo confirmar el agendamiento. Intenta nuevamente.');
      } finally {
        setConfirmando(false);
      }
    }
  };

  if (!resumen) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#333333" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Confirmar Agendamiento</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Ícono de éxito/error */}
          <View style={styles.iconContainer}>
            <View style={[
              styles.iconCircle,
              !isPaymentSuccessful && metodoPago === METODOS_PAGO.MERCADOPAGO && styles.iconCircleError
            ]}>
              {loadingPaymentInfo ? (
                <ActivityIndicator size="large" color={COLORS.primary} />
              ) : (
                <Ionicons 
                  name={!isPaymentSuccessful && metodoPago === METODOS_PAGO.MERCADOPAGO ? "close-circle" : "checkmark-circle"} 
                  size={80} 
                  color={!isPaymentSuccessful && metodoPago === METODOS_PAGO.MERCADOPAGO ? "#E74C3C" : "#28A745"} 
                />
              )}
            </View>
          </View>

          {/* Mensaje de confirmación */}
          <View style={styles.mensajeContainer}>
            <Text style={styles.titulo}>
              {!isPaymentSuccessful && metodoPago === METODOS_PAGO.MERCADOPAGO
                ? 'Pago Rechazado' 
                : isPaymentSuccessful && metodoPago === METODOS_PAGO.MERCADOPAGO
                ? '¡Pago Exitoso!' 
                : '¡Todo Listo!'}
            </Text>
            <Text style={styles.subtitulo}>
              {!isPaymentSuccessful && metodoPago === METODOS_PAGO.MERCADOPAGO
                ? paymentInfo?.status_detail || 'El pago no pudo ser procesado. Por favor, intenta con otro método.'
                : isPaymentSuccessful && metodoPago === METODOS_PAGO.MERCADOPAGO
                ? 'Tu pago fue procesado exitosamente con Mercado Pago'
                : 'Estás a un paso de confirmar tu agendamiento'}
            </Text>
          </View>

          {/* Resumen de servicios */}
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Servicios Agendados</Text>
            {resumen.serviciosDetalle.map((servicio, index) => (
              <View key={index} style={styles.servicioCard}>
                <View style={styles.servicioIcon}>
                  <Ionicons 
                    name={servicio.tipoProveedor === 'Taller' ? 'business' : 'person'} 
                    size={24} 
                    color={COLORS.primary} 
                  />
                </View>
                <View style={styles.servicioInfo}>
                  <Text style={styles.servicioNombre}>{servicio.servicio}</Text>
                  <Text style={styles.servicioProveedor}>
                    {servicio.tipoProveedor} • {servicio.proveedor}
                  </Text>
                  <Text style={styles.servicioFecha}>
                    {servicio.fecha} a las {servicio.hora}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color="#28A745" />
              </View>
            ))}
          </View>

          {/* Método de pago */}
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Método de Pago</Text>
            <View style={styles.pagoCard}>
              <Ionicons 
                name={
                  metodoPago === METODOS_PAGO.MERCADOPAGO
                    ? 'card' 
                    : 'swap-horizontal'
                } 
                size={24} 
                color={COLORS.primary} 
              />
              <Text style={styles.pagoTexto}>
                {metodoPago === METODOS_PAGO.MERCADOPAGO
                  ? 'Mercado Pago' 
                  : 'Transferencia Bancaria'}
              </Text>
            </View>
          </View>

          {/* Estado del pago (si hay información de pago de Mercado Pago) */}
          {paymentInfo && metodoPago === METODOS_PAGO.MERCADOPAGO && (
            <View style={styles.seccion}>
              <View style={[
                styles.alertaCard,
                !isPaymentSuccessful && styles.alertaCardError,
                isPaymentSuccessful && styles.alertaCardSuccess,
              ]}>
                <Ionicons 
                  name={!isPaymentSuccessful ? "close-circle" : "checkmark-circle"} 
                  size={24} 
                  color={!isPaymentSuccessful ? "#E74C3C" : "#28A745"} 
                />
                <View style={styles.alertaContent}>
                  <Text style={[
                    styles.alertaTexto,
                    !isPaymentSuccessful && styles.alertaTextoError,
                  ]}>
                    {paymentInfo.status === 'approved' 
                      ? 'Pago aprobado' 
                      : paymentInfo.status === 'rejected'
                      ? 'Pago rechazado'
                      : paymentInfo.status === 'pending'
                      ? 'Pago pendiente'
                      : paymentInfo.status === 'in_process'
                      ? 'Pago en proceso'
                      : `Estado: ${paymentInfo.status}`}
                  </Text>
                  {paymentInfo.status_detail && (
                    <Text style={styles.alertaSubtexto}>
                      {paymentInfo.status_detail}
                    </Text>
                  )}
                  {paymentInfo.id && (
                    <Text style={styles.alertaSubtexto}>
                      ID de pago: {paymentInfo.id}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Comprobante enviado (si aplica) */}
          {comprobanteEnviado && (
            <View style={styles.seccion}>
              <View style={styles.alertaCard}>
                <Ionicons name="checkmark-circle" size={24} color="#28A745" />
                <Text style={styles.alertaTexto}>
                  Comprobante enviado por WhatsApp
                </Text>
              </View>
            </View>
          )}

          {/* Total */}
          <View style={styles.seccion}>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total a pagar</Text>
              <Text style={styles.totalValue}>
                ${Math.round(resumen.totalGeneral).toLocaleString('es-CL')}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer con botones */}
        <View style={styles.footer}>
          {/* Botón de descargar comprobante (si hay pago exitoso de Mercado Pago) */}
          {isPaymentSuccessful && metodoPago === METODOS_PAGO.MERCADOPAGO && (paymentId || paymentInfo?.id) && (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={handleDownloadReceipt}
              disabled={downloadingReceipt}
              activeOpacity={0.8}
            >
              {downloadingReceipt ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="download" size={20} color="#FFFFFF" />
                  <Text style={styles.downloadButtonText}>Descargar Comprobante</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Botón de confirmación (solo si el pago fue exitoso o no hay pago de Mercado Pago) */}
          {(!metodoPago || metodoPago !== METODOS_PAGO.MERCADOPAGO || isPaymentSuccessful) && (
          <TouchableOpacity
            style={[
              styles.confirmarButton,
              confirmando && styles.confirmarButtonDisabled
            ]}
            onPress={handleConfirmar}
            disabled={confirmando}
            activeOpacity={0.8}
          >
            {confirmando ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.confirmarButtonText}>Confirmar Agendamiento</Text>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
          )}

          {/* Botón para reintentar si el pago falló */}
          {!isPaymentSuccessful && metodoPago === METODOS_PAGO.MERCADOPAGO && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => navigation.navigate('OpcionesPago')}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Reintentar Pago</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleError: {
    backgroundColor: '#FFEBEE',
  },
  mensajeContainer: {
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 30,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitulo: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  seccion: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
  },
  servicioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  servicioIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  servicioInfo: {
    flex: 1,
  },
  servicioNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  servicioProveedor: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  servicioFecha: {
    fontSize: 13,
    color: '#999999',
  },
  pagoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  pagoTexto: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 12,
  },
  alertaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
  },
  alertaCardSuccess: {
    backgroundColor: '#E8F5E9',
  },
  alertaCardError: {
    backgroundColor: '#FFEBEE',
  },
  alertaContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertaTexto: {
    fontSize: 14,
    color: '#28A745',
    fontWeight: '600',
  },
  alertaTextoError: {
    color: '#E74C3C',
  },
  alertaSubtexto: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  totalCard: {
    backgroundColor: '#333333',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  confirmarButton: {
    backgroundColor: '#28A745',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  confirmarButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  confirmarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  downloadButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ConfirmacionScreen;

