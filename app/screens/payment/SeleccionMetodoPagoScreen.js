import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, SPACING, BORDERS } from '../../utils/constants';
import MercadoPagoService from '../../services/mercadopago';
import solicitudesService from '../../services/solicitudesService';

/**
 * Pantalla de selección de método de pago para ofertas con repuestos
 * Permite al cliente elegir entre:
 * - Pagar solo repuestos ahora (y servicio al final)
 * - Pagar todo adelantado
 */
const SeleccionMetodoPagoScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  // Parámetros de la ruta
  const { ofertaId, solicitudId, datosPago } = route.params || {};

  const [metodoSeleccionado, setMetodoSeleccionado] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [datosOferta, setDatosOferta] = useState(datosPago || null);

  // Cargar datos de la oferta si no vienen en los parámetros
  useEffect(() => {
    const cargarDatos = async () => {
      if (datosPago) {
        setDatosOferta(datosPago);
        setCargando(false);
        return;
      }

      if (solicitudId) {
        try {
          const datos = await solicitudesService.obtenerDatosPago(solicitudId);
          setDatosOferta(datos);
        } catch (error) {
          console.error('Error cargando datos de pago:', error);
          Alert.alert('Error', 'No se pudieron cargar los datos de la oferta');
          navigation.goBack();
        }
      }
      setCargando(false);
    };

    cargarDatos();
  }, [datosPago, solicitudId]);

  // Calcular montos con IVA
  const costoRepuestosConIva = datosOferta ? Math.round(datosOferta.costo_repuestos * 1.19) : 0;
  const costoManoObraConIva = datosOferta ? Math.round(datosOferta.costo_mano_obra * 1.19) : 0;
  const totalConIva = datosOferta ? Math.round(datosOferta.monto_total) : 0;

  // Manejar selección de método de pago
  const handleSeleccionarMetodo = (metodo) => {
    setMetodoSeleccionado(metodo);
  };

  // Procesar el pago
  const handleProcesarPago = async () => {
    if (!metodoSeleccionado) {
      Alert.alert('Selecciona un método', 'Por favor selecciona cómo deseas pagar');
      return;
    }

    if (!datosOferta?.proveedor_puede_recibir_pagos) {
      Alert.alert(
        'Proveedor no configurado',
        'El proveedor aún no ha configurado su cuenta de Mercado Pago para recibir pagos. Por favor, contacta al proveedor por el chat.'
      );
      return;
    }

    setProcesando(true);

    try {
      const tipoPago = metodoSeleccionado === 'repuestos_adelantado' ? 'repuestos' : 'total';
      
      const preferencia = await MercadoPagoService.createPreferenceToProvider(
        datosOferta.oferta_id || ofertaId,
        tipoPago,
        {
          success: 'mecanimovil://payment/success',
          failure: 'mecanimovil://payment/failure',
          pending: 'mecanimovil://payment/pending',
        }
      );

      if (preferencia && preferencia.init_point) {
        // Abrir Checkout Pro de Mercado Pago
        await MercadoPagoService.openCheckoutPro(preferencia.init_point);
      } else {
        throw new Error('No se pudo obtener el enlace de pago');
      }
    } catch (error) {
      console.error('Error procesando pago:', error);
      Alert.alert('Error', error.message || 'No se pudo procesar el pago');
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!datosOferta) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={COLORS.danger} />
          <Text style={styles.errorText}>No se encontraron datos de la oferta</Text>
          <TouchableOpacity style={styles.volverButton} onPress={() => navigation.goBack()}>
            <Text style={styles.volverButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Si no hay desglose de repuestos, ir directo al pago total
  if (!datosOferta.incluye_repuestos || datosOferta.costo_repuestos <= 0) {
    // Navegar a pago normal
    navigation.replace('OpcionesPago', {
      solicitudId,
      origen: 'solicitud_publica'
    });
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Método de Pago</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Información del Servicio */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Resumen de la Oferta</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Proveedor</Text>
            <Text style={styles.infoValue}>{datosOferta.proveedor?.nombre}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Servicios</Text>
            <Text style={styles.infoValue}>
              {datosOferta.servicios?.map(s => s.nombre).join(', ') || 'Sin especificar'}
            </Text>
          </View>
          <View style={styles.infoDivider} />
          
          {/* Desglose de costos */}
          <Text style={styles.desgloseTitle}>Desglose de Costos</Text>
          <View style={styles.infoRow}>
            <View style={styles.labelWithIcon}>
              <MaterialIcons name="build" size={18} color="#666" />
              <Text style={styles.infoLabel}>Repuestos (con IVA)</Text>
            </View>
            <Text style={styles.infoValueBold}>${costoRepuestosConIva.toLocaleString('es-CL')}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.labelWithIcon}>
              <MaterialIcons name="engineering" size={18} color="#666" />
              <Text style={styles.infoLabel}>Mano de obra (con IVA)</Text>
            </View>
            <Text style={styles.infoValueBold}>${costoManoObraConIva.toLocaleString('es-CL')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${totalConIva.toLocaleString('es-CL')}</Text>
          </View>
        </View>

        {/* Selección de Método de Pago */}
        <Text style={styles.sectionTitle}>¿Cómo deseas pagar?</Text>

        {/* Opción 1: Repuestos Adelantado */}
        <TouchableOpacity
          style={[
            styles.opcionCard,
            metodoSeleccionado === 'repuestos_adelantado' && styles.opcionCardSelected
          ]}
          onPress={() => handleSeleccionarMetodo('repuestos_adelantado')}
          activeOpacity={0.7}
        >
          <View style={styles.opcionHeader}>
            <View style={[
              styles.radioButton,
              metodoSeleccionado === 'repuestos_adelantado' && styles.radioButtonSelected
            ]}>
              {metodoSeleccionado === 'repuestos_adelantado' && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
            <View style={styles.opcionTextContainer}>
              <Text style={styles.opcionTitle}>💳 Pagar Repuestos Ahora</Text>
              <Text style={styles.opcionSubtitle}>
                Paga ${costoRepuestosConIva.toLocaleString('es-CL')} ahora para que el mecánico compre los repuestos.
              </Text>
            </View>
          </View>
          <View style={styles.opcionInfo}>
            <MaterialIcons name="info-outline" size={16} color={COLORS.info} />
            <Text style={styles.opcionInfoText}>
              El servicio (${costoManoObraConIva.toLocaleString('es-CL')}) lo pagas después de que termine el trabajo.
            </Text>
          </View>
          <View style={styles.opcionBadge}>
            <Text style={styles.opcionBadgeText}>Recomendado</Text>
          </View>
        </TouchableOpacity>

        {/* Opción 2: Todo Adelantado */}
        <TouchableOpacity
          style={[
            styles.opcionCard,
            metodoSeleccionado === 'todo_adelantado' && styles.opcionCardSelected
          ]}
          onPress={() => handleSeleccionarMetodo('todo_adelantado')}
          activeOpacity={0.7}
        >
          <View style={styles.opcionHeader}>
            <View style={[
              styles.radioButton,
              metodoSeleccionado === 'todo_adelantado' && styles.radioButtonSelected
            ]}>
              {metodoSeleccionado === 'todo_adelantado' && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
            <View style={styles.opcionTextContainer}>
              <Text style={styles.opcionTitle}>💵 Pagar Todo Ahora</Text>
              <Text style={styles.opcionSubtitle}>
                Paga el monto total de ${totalConIva.toLocaleString('es-CL')} ahora.
              </Text>
            </View>
          </View>
          <View style={styles.opcionInfo}>
            <MaterialIcons name="check-circle" size={16} color={COLORS.success} />
            <Text style={styles.opcionInfoText}>
              No tendrás que preocuparte por pagos adicionales.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Información adicional */}
        <View style={styles.infoBox}>
          <MaterialIcons name="security" size={20} color={COLORS.primary} />
          <View style={styles.infoBoxContent}>
            <Text style={styles.infoBoxTitle}>Pago Seguro</Text>
            <Text style={styles.infoBoxText}>
              El pago se realiza directamente a la cuenta de Mercado Pago del proveedor. 
              Mecanimovil no interviene en la transacción.
            </Text>
          </View>
        </View>

        {!datosOferta.proveedor_puede_recibir_pagos && (
          <View style={[styles.infoBox, styles.warningBox]}>
            <MaterialIcons name="warning" size={20} color={COLORS.warning} />
            <View style={styles.infoBoxContent}>
              <Text style={[styles.infoBoxTitle, { color: COLORS.warning }]}>Proveedor sin configurar</Text>
              <Text style={styles.infoBoxText}>
                El proveedor aún no ha configurado su cuenta de Mercado Pago. 
                Por favor, contacta al proveedor por el chat para coordinar el pago.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Botón de Pago Fijo */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[
            styles.pagarButton,
            (!metodoSeleccionado || procesando || !datosOferta.proveedor_puede_recibir_pagos) && styles.pagarButtonDisabled
          ]}
          onPress={handleProcesarPago}
          disabled={!metodoSeleccionado || procesando || !datosOferta.proveedor_puede_recibir_pagos}
          activeOpacity={0.8}
        >
          {procesando ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="card-outline" size={22} color="#FFFFFF" />
              <Text style={styles.pagarButtonText}>
                {metodoSeleccionado === 'repuestos_adelantado' 
                  ? `Pagar Repuestos ($${costoRepuestosConIva.toLocaleString('es-CL')})`
                  : metodoSeleccionado === 'todo_adelantado'
                    ? `Pagar Todo ($${totalConIva.toLocaleString('es-CL')})`
                    : 'Selecciona un método de pago'
                }
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  volverButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  volverButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  infoValueBold: {
    fontSize: 15,
    color: '#000',
    fontWeight: '700',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  desgloseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  opcionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
    overflow: 'hidden',
  },
  opcionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F7FF',
  },
  opcionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  opcionTextContainer: {
    flex: 1,
  },
  opcionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  opcionSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  opcionInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  opcionInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  opcionBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.success,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 12,
  },
  opcionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  warningBox: {
    backgroundColor: '#FFF8E6',
  },
  infoBoxContent: {
    flex: 1,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pagarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  pagarButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  pagarButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default SeleccionMetodoPagoScreen;

