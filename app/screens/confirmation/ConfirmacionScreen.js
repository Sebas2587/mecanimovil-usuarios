import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  XCircle,
  Building2,
  User,
  CreditCard,
  ArrowLeftRight,
  Download,
  RefreshCw,
  CircleCheck,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAgendamiento } from '../../context/AgendamientoContext';
import { ROUTES } from '../../utils/constants';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../design-system/tokens';
import SolicitudFlowHeader from '../../components/solicitudes/SolicitudFlowHeader';
import StickyFooterCTA from '../../components/base/StickyFooterCTA/StickyFooterCTA';
import MercadoPagoService from '../../services/mercadopago';

const METODOS_PAGO = {
  MERCADOPAGO: 'mercadopago',
  TRANSFERENCIA: 'transferencia'
};

const ConfirmacionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
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
                    params: { screen: ROUTES.ACTIVIDAD } 
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
                    params: { screen: ROUTES.ACTIVIDAD } 
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
      <SafeAreaView style={styles.focusRoot} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={[TYPOGRAPHY.styles.body, styles.loadingText]}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pagoRechazado = !isPaymentSuccessful && metodoPago === METODOS_PAGO.MERCADOPAGO;

  return (
    <SafeAreaView style={styles.focusRoot} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      <SolicitudFlowHeader
        title="Confirmar agendamiento"
        subtitle="Revisa el resumen antes de finalizar"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <View style={[
            styles.iconCircle,
            pagoRechazado && styles.iconCircleError,
          ]}>
            {loadingPaymentInfo ? (
              <ActivityIndicator size="large" color={COLORS.primary[500]} />
            ) : pagoRechazado ? (
              <XCircle size={72} color={COLORS.error.main} strokeWidth={1.75} />
            ) : (
              <Check size={72} color={COLORS.success.main} strokeWidth={2} />
            )}
          </View>
        </View>

        <View style={styles.mensajeContainer}>
          <Text style={[TYPOGRAPHY.styles.h2, styles.titulo]}>
            {pagoRechazado
              ? 'Pago rechazado'
              : isPaymentSuccessful && metodoPago === METODOS_PAGO.MERCADOPAGO
                ? '¡Pago exitoso!'
                : '¡Todo listo!'}
          </Text>
          <Text style={[TYPOGRAPHY.styles.body, styles.subtitulo]}>
            {pagoRechazado
              ? paymentInfo?.status_detail || 'El pago no pudo ser procesado. Por favor, intenta con otro método.'
              : isPaymentSuccessful && metodoPago === METODOS_PAGO.MERCADOPAGO
                ? 'Tu pago fue procesado exitosamente con Mercado Pago'
                : 'Estás a un paso de confirmar tu agendamiento'}
          </Text>
        </View>

        <View style={styles.seccion}>
          <Text style={[TYPOGRAPHY.styles.h6, styles.seccionTitulo]}>Servicios agendados</Text>
          {resumen.serviciosDetalle.map((servicio, index) => (
            <View key={index} style={[styles.servicioCard, SHADOWS.sm]}>
              <View style={styles.servicioIcon}>
                {servicio.tipoProveedor === 'Taller' ? (
                  <Building2 size={22} color={COLORS.primary[500]} strokeWidth={1.75} />
                ) : (
                  <User size={22} color={COLORS.primary[500]} strokeWidth={1.75} />
                )}
              </View>
              <View style={styles.servicioInfo}>
                <Text style={[TYPOGRAPHY.styles.h5, styles.servicioNombre]}>{servicio.servicio}</Text>
                <Text style={[TYPOGRAPHY.styles.caption, styles.servicioProveedor]}>
                  {servicio.tipoProveedor} • {servicio.proveedor}
                </Text>
                <Text style={[TYPOGRAPHY.styles.small, styles.servicioFecha]}>
                  {servicio.fecha} a las {servicio.hora}
                </Text>
              </View>
              <CircleCheck size={20} color={COLORS.success.main} strokeWidth={2} />
            </View>
          ))}
        </View>

        <View style={styles.seccion}>
          <Text style={[TYPOGRAPHY.styles.h6, styles.seccionTitulo]}>Método de pago</Text>
          <View style={[styles.pagoCard, SHADOWS.sm]}>
            {metodoPago === METODOS_PAGO.MERCADOPAGO ? (
              <CreditCard size={22} color={COLORS.primary[500]} strokeWidth={1.75} />
            ) : (
              <ArrowLeftRight size={22} color={COLORS.primary[500]} strokeWidth={1.75} />
            )}
            <Text style={[TYPOGRAPHY.styles.h5, styles.pagoTexto]}>
              {metodoPago === METODOS_PAGO.MERCADOPAGO
                ? 'Mercado Pago'
                : 'Transferencia bancaria'}
            </Text>
          </View>
        </View>

        {paymentInfo && metodoPago === METODOS_PAGO.MERCADOPAGO && (
          <View style={styles.seccion}>
            <View style={[
              styles.alertaCard,
              pagoRechazado && styles.alertaCardError,
              isPaymentSuccessful && styles.alertaCardSuccess,
            ]}>
              {pagoRechazado ? (
                <XCircle size={22} color={COLORS.error.main} strokeWidth={1.75} />
              ) : (
                <CircleCheck size={22} color={COLORS.success.main} strokeWidth={2} />
              )}
              <View style={styles.alertaContent}>
                <Text style={[
                  TYPOGRAPHY.styles.captionBold,
                  styles.alertaTexto,
                  pagoRechazado && styles.alertaTextoError,
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
                {paymentInfo.status_detail ? (
                  <Text style={[TYPOGRAPHY.styles.small, styles.alertaSubtexto]}>
                    {paymentInfo.status_detail}
                  </Text>
                ) : null}
                {paymentInfo.id ? (
                  <Text style={[TYPOGRAPHY.styles.small, styles.alertaSubtexto]}>
                    ID de pago: {paymentInfo.id}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {comprobanteEnviado ? (
          <View style={styles.seccion}>
            <View style={[styles.alertaCard, styles.alertaCardSuccess]}>
              <CircleCheck size={22} color={COLORS.success.main} strokeWidth={2} />
              <Text style={[TYPOGRAPHY.styles.captionBold, styles.alertaTexto]}>
                Comprobante enviado por WhatsApp
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.seccion}>
          <View style={styles.totalCard}>
            <Text style={[TYPOGRAPHY.styles.h5, styles.totalLabel]}>Total a pagar</Text>
            <Text style={[TYPOGRAPHY.styles.numberDisplay, styles.totalValue]}>
              ${Math.round(resumen.totalGeneral).toLocaleString('es-CL')}
            </Text>
          </View>
        </View>
      </ScrollView>

      <StickyFooterCTA>
        {isPaymentSuccessful && metodoPago === METODOS_PAGO.MERCADOPAGO && (paymentId || paymentInfo?.id) ? (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownloadReceipt}
            disabled={downloadingReceipt}
            activeOpacity={0.8}
          >
            {downloadingReceipt ? (
              <ActivityIndicator size="small" color={COLORS.text.inverse} />
            ) : (
              <>
                <Download size={20} color={COLORS.text.inverse} strokeWidth={2} />
                <Text style={[TYPOGRAPHY.styles.button, styles.downloadButtonText]}>Descargar comprobante</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {(!metodoPago || metodoPago !== METODOS_PAGO.MERCADOPAGO || isPaymentSuccessful) ? (
          <TouchableOpacity
            style={[
              styles.confirmarButton,
              confirmando && styles.confirmarButtonDisabled,
            ]}
            onPress={handleConfirmar}
            disabled={confirmando}
            activeOpacity={0.8}
          >
            {confirmando ? (
              <ActivityIndicator size="small" color={COLORS.text.inverse} />
            ) : (
              <>
                <Text style={[TYPOGRAPHY.styles.button, styles.confirmarButtonText]}>Confirmar agendamiento</Text>
                <Check size={20} color={COLORS.text.inverse} strokeWidth={2.5} />
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {pagoRechazado ? (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.navigate('OpcionesPago')}
            activeOpacity={0.8}
          >
            <RefreshCw size={20} color={COLORS.text.inverse} strokeWidth={2} />
            <Text style={[TYPOGRAPHY.styles.button, styles.retryButtonText]}>Reintentar pago</Text>
          </TouchableOpacity>
        ) : null}
      </StickyFooterCTA>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  focusRoot: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  iconContainer: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: COLORS.success.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleError: {
    backgroundColor: COLORS.error.light,
  },
  mensajeContainer: {
    paddingHorizontal: SPACING.container.horizontal,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  titulo: {
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitulo: {
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  seccion: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingVertical: SPACING.sm,
  },
  seccionTitulo: {
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  servicioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.card.md,
    marginBottom: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  servicioIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  servicioInfo: {
    flex: 1,
  },
  servicioNombre: {
    color: COLORS.text.primary,
    marginBottom: SPACING.xxs,
  },
  servicioProveedor: {
    color: COLORS.text.secondary,
    marginBottom: SPACING.xxs,
  },
  servicioFecha: {
    color: COLORS.text.tertiary,
  },
  pagoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.card.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  pagoTexto: {
    color: COLORS.text.primary,
    marginLeft: SPACING.sm,
  },
  alertaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success.light,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.card.md,
    gap: SPACING.sm,
  },
  alertaCardSuccess: {
    backgroundColor: COLORS.success.light,
  },
  alertaCardError: {
    backgroundColor: COLORS.error.light,
  },
  alertaContent: {
    flex: 1,
  },
  alertaTexto: {
    color: COLORS.success.main,
  },
  alertaTextoError: {
    color: COLORS.error.main,
  },
  alertaSubtexto: {
    color: COLORS.text.secondary,
    marginTop: SPACING.xxs,
  },
  totalCard: {
    backgroundColor: COLORS.text.primary,
    padding: SPACING.lg,
    borderRadius: BORDERS.radius.card.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: COLORS.text.inverse,
  },
  totalValue: {
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    lineHeight: 30,
  },
  confirmarButton: {
    backgroundColor: COLORS.primary[500],
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDERS.radius.button.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  confirmarButtonDisabled: {
    backgroundColor: COLORS.states.disabled.background,
  },
  confirmarButtonText: {
    color: COLORS.text.inverse,
  },
  downloadButton: {
    backgroundColor: COLORS.primary[600],
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDERS.radius.button.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  downloadButtonText: {
    color: COLORS.text.inverse,
  },
  retryButton: {
    backgroundColor: COLORS.primary[500],
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDERS.radius.button.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  retryButtonText: {
    color: COLORS.text.inverse,
  },
});

export default ConfirmacionScreen;

