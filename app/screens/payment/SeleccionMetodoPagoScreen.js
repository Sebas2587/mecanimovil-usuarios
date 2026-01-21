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
import { TOKENS } from '../../design-system/tokens';
import Card from '../../components/base/Card/Card';
import Button from '../../components/base/Button/Button';
import Badge from '../../components/base/Badge/Badge';
import Divider from '../../components/base/Divider/Divider';
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
          <ActivityIndicator size="large" color={TOKENS.colors.primary[500]} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!datosOferta) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={TOKENS.colors.error.main} />
          <Text style={styles.errorText}>No se encontraron datos de la oferta</Text>
          <Button
            title="Volver"
            onPress={() => navigation.goBack()}
            style={styles.volverButton}
          />
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
      <StatusBar barStyle="dark-content" backgroundColor={TOKENS.colors.background.default} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={TOKENS.colors.text.primary} />
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
        <Card variant="elevated" padding="md" style={styles.cardContainer}>
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

          <Divider style={{ marginVertical: TOKENS.spacing.md }} />

          {/* Desglose de costos */}
          <Text style={styles.desgloseTitle}>Desglose de Costos</Text>
          <View style={styles.infoRow}>
            <View style={styles.labelWithIcon}>
              <MaterialIcons name="build" size={18} color={TOKENS.colors.text.tertiary} />
              <Text style={styles.infoLabel}>Repuestos (con IVA)</Text>
            </View>
            <Text style={styles.infoValueBold}>${costoRepuestosConIva.toLocaleString('es-CL')}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.labelWithIcon}>
              <MaterialIcons name="engineering" size={18} color={TOKENS.colors.text.tertiary} />
              <Text style={styles.infoLabel}>Mano de obra (con IVA)</Text>
            </View>
            <Text style={styles.infoValueBold}>${costoManoObraConIva.toLocaleString('es-CL')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${totalConIva.toLocaleString('es-CL')}</Text>
          </View>
        </Card>

        {/* Selección de Método de Pago */}
        <Text style={styles.sectionTitle}>¿Cómo deseas pagar?</Text>

        {/* Opción 1: Repuestos Adelantado */}
        <Card
          variant="outlined"
          padding="md"
          onPress={() => handleSeleccionarMetodo('repuestos_adelantado')}
          style={[
            styles.opcionCard,
            metodoSeleccionado === 'repuestos_adelantado' && styles.opcionCardSelected
          ]}
        >
          {metodoSeleccionado === 'repuestos_adelantado' && (
            <View style={styles.selectedBadgeContainer}>
              <Badge content="Seleccionado" type="primary" size="sm" variant="solid" />
            </View>
          )}

          <View style={styles.opcionHeader}>
            <View style={styles.opcionTextContainer}>
              <View style={styles.titleRow}>
                <Text style={styles.opcionTitle}>💳 Pagar Repuestos Ahora</Text>
                <Badge content="Recomendado" type="success" size="sm" variant="soft" />
              </View>
              <Text style={styles.opcionSubtitle}>
                Paga ${costoRepuestosConIva.toLocaleString('es-CL')} ahora para que el mecánico compre los repuestos.
              </Text>
            </View>
          </View>

          <Divider style={{ marginVertical: TOKENS.spacing.sm }} />

          <View style={styles.opcionInfo}>
            <MaterialIcons name="info-outline" size={16} color={TOKENS.colors.info.main} />
            <Text style={styles.opcionInfoText}>
              El servicio (${costoManoObraConIva.toLocaleString('es-CL')}) lo pagas después de que termine el trabajo.
            </Text>
          </View>
        </Card>

        {/* Opción 2: Todo Adelantado */}
        <Card
          variant="outlined"
          padding="md"
          onPress={() => handleSeleccionarMetodo('todo_adelantado')}
          style={[
            styles.opcionCard,
            metodoSeleccionado === 'todo_adelantado' && styles.opcionCardSelected
          ]}
        >
          {metodoSeleccionado === 'todo_adelantado' && (
            <View style={styles.selectedBadgeContainer}>
              <Badge content="Seleccionado" type="primary" size="sm" variant="solid" />
            </View>
          )}

          <View style={styles.opcionHeader}>
            <View style={styles.opcionTextContainer}>
              <Text style={styles.opcionTitle}>💵 Pagar Todo Ahora</Text>
              <Text style={styles.opcionSubtitle}>
                Paga el monto total de ${totalConIva.toLocaleString('es-CL')} ahora.
              </Text>
            </View>
          </View>

          <Divider style={{ marginVertical: TOKENS.spacing.sm }} />

          <View style={styles.opcionInfo}>
            <MaterialIcons name="check-circle" size={16} color={TOKENS.colors.success.main} />
            <Text style={styles.opcionInfoText}>
              No tendrás que preocuparte por pagos adicionales.
            </Text>
          </View>
        </Card>

        {/* Información adicional */}
        <View style={styles.infoBox}>
          <MaterialIcons name="security" size={20} color={TOKENS.colors.primary[500]} />
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
            <MaterialIcons name="warning" size={20} color={TOKENS.colors.warning.main} />
            <View style={styles.infoBoxContent}>
              <Text style={[styles.infoBoxTitle, { color: TOKENS.colors.warning.dark }]}>Proveedor sin configurar</Text>
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
        <Button
          title={metodoSeleccionado === 'repuestos_adelantado'
            ? `Pagar Repuestos ($${costoRepuestosConIva.toLocaleString('es-CL')})`
            : metodoSeleccionado === 'todo_adelantado'
              ? `Pagar Todo ($${totalConIva.toLocaleString('es-CL')})`
              : 'Selecciona un método de pago'
          }
          onPress={handleProcesarPago}
          isLoading={procesando}
          disabled={!metodoSeleccionado || procesando || !datosOferta.proveedor_puede_recibir_pagos}
          type="primary"
          size="lg"
          icon="card-outline"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.background?.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: TOKENS.spacing.md,
    fontSize: TOKENS.typography.fontSize.md,
    color: TOKENS.colors.text.secondary,
    fontWeight: TOKENS.typography.fontWeight.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: TOKENS.spacing.lg,
  },
  errorText: {
    marginTop: TOKENS.spacing.md,
    fontSize: TOKENS.typography.fontSize.md,
    color: TOKENS.colors.text.secondary,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.lg,
  },
  volverButton: {
    minWidth: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.md,
    backgroundColor: TOKENS.colors.background?.paper,
    borderBottomWidth: TOKENS.borders.width.thin,
    borderBottomColor: TOKENS.colors.border.light,
    ...TOKENS.shadows.sm, // Add shadow for better separation
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: TOKENS.borders.radius.full,
    backgroundColor: TOKENS.colors.background.default, // Subtle background for button
  },
  headerTitle: {
    fontSize: TOKENS.typography.fontSize.lg,
    fontWeight: TOKENS.typography.fontWeight.bold,
    color: TOKENS.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: TOKENS.spacing.md,
    gap: TOKENS.spacing.md, // Use gap for consistent vertical spacing
  },
  cardContainer: {
    marginBottom: TOKENS.spacing.md,
  },
  infoTitle: {
    fontSize: TOKENS.typography.fontSize.lg,
    fontWeight: TOKENS.typography.fontWeight.bold,
    color: TOKENS.colors.text.primary,
    marginBottom: TOKENS.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: TOKENS.spacing.xs,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.sm,
  },
  infoLabel: {
    fontSize: TOKENS.typography.fontSize.sm,
    color: TOKENS.colors.text.secondary,
  },
  infoValue: {
    fontSize: TOKENS.typography.fontSize.sm,
    color: TOKENS.colors.text.primary,
    fontWeight: TOKENS.typography.fontWeight.medium,
    textAlign: 'right',
    flex: 1,
    marginLeft: TOKENS.spacing.md,
  },
  infoValueBold: {
    fontSize: TOKENS.typography.fontSize.md,
    color: TOKENS.colors.text.primary,
    fontWeight: TOKENS.typography.fontWeight.bold,
  },
  desgloseTitle: {
    fontSize: TOKENS.typography.fontSize.xs,
    fontWeight: TOKENS.typography.fontWeight.bold,
    color: TOKENS.colors.text.tertiary,
    marginBottom: TOKENS.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1, // Increased letter spacing for premium label look
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.sm,
    borderTopWidth: 1, // Use thin border
    borderTopColor: TOKENS.colors.border.light,
  },
  totalLabel: {
    fontSize: TOKENS.typography.fontSize.lg,
    fontWeight: TOKENS.typography.fontWeight.bold,
    color: TOKENS.colors.text.primary,
  },
  totalValue: {
    fontSize: TOKENS.typography.fontSize['2xl'],
    fontWeight: TOKENS.typography.fontWeight.extrabold,
    color: TOKENS.colors.primary[600], // Slightly darker for better visibility
  },
  sectionTitle: {
    fontSize: TOKENS.typography.fontSize.xl,
    fontWeight: TOKENS.typography.fontWeight.bold,
    color: TOKENS.colors.text.primary,
    marginTop: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.sm,
  },
  opcionCard: {
    marginBottom: TOKENS.spacing.md,
    borderWidth: TOKENS.borders.width.thin,
    borderColor: TOKENS.colors.border.main,
    backgroundColor: TOKENS.colors.background.paper,
  },
  opcionCardSelected: {
    borderColor: TOKENS.colors.primary[500],
    backgroundColor: TOKENS.colors.primary[50],
    borderWidth: 2,
    ...TOKENS.shadows.md, // Add shadow to selected item
  },
  selectedBadgeContainer: {
    position: 'absolute',
    top: -10,
    right: 16, // Moved to right for better aesthetics
    zIndex: 10,
  },
  opcionHeader: {
    marginBottom: TOKENS.spacing.xs,
  },
  opcionTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: TOKENS.spacing.xs,
    flexWrap: 'wrap',
    gap: TOKENS.spacing.xs,
  },
  opcionTitle: {
    fontSize: TOKENS.typography.fontSize.lg,
    fontWeight: TOKENS.typography.fontWeight.bold,
    color: TOKENS.colors.text.primary,
  },
  opcionSubtitle: {
    fontSize: TOKENS.typography.fontSize.sm,
    color: TOKENS.colors.text.secondary,
    lineHeight: TOKENS.typography.lineHeight.relaxed,
  },
  opcionInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: TOKENS.spacing.sm,
    marginTop: TOKENS.spacing.xs,
  },
  opcionInfoText: {
    flex: 1,
    fontSize: TOKENS.typography.fontSize.xs,
    color: TOKENS.colors.text.secondary,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: TOKENS.colors.info.light,
    borderRadius: TOKENS.borders.radius.md,
    padding: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.sm,
    gap: TOKENS.spacing.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.info.main + '40', // Semi-transparent border
  },
  warningBox: {
    backgroundColor: TOKENS.colors.warning.light,
    borderColor: TOKENS.colors.warning.dark + '40',
  },
  infoBoxContent: {
    flex: 1,
  },
  infoBoxTitle: {
    fontSize: TOKENS.typography.fontSize.sm,
    fontWeight: TOKENS.typography.fontWeight.bold,
    color: TOKENS.colors.info.dark,
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: TOKENS.typography.fontSize.xs,
    color: TOKENS.colors.text.secondary,
    lineHeight: 18,
  },
  bottomContainer: {
    backgroundColor: TOKENS.colors.background.paper,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.border.light,
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.md,
    ...TOKENS.shadows.lg, // Reversed shadow for top elevation effect
  },
});

export default SeleccionMetodoPagoScreen;

