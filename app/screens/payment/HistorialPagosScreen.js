import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import pagosService from '../../services/pagosService';
import { COLORS, SPACING, BORDERS } from '../../utils/constants';

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

/**
 * Pantalla que muestra el historial de pagos del usuario
 */
const HistorialPagosScreen = () => {
  const navigation = useNavigation();
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Paleta dark glass (evita depender del tema claro)
  const colors = {
    background: {
      default: '#030712',
      paper: GLASS_BG,
    },
    text: {
      primary: '#F9FAFB',
      secondary: 'rgba(255,255,255,0.6)',
    },
    neutral: { gray: { 200: 'rgba(255,255,255,0.10)' } },
    primary: { 500: '#93C5FD' },
    success: { 50: 'rgba(16,185,129,0.12)', 500: '#6EE7B7', 600: '#10B981', 700: '#34D399' },
    warning: { 500: '#F59E0B' },
    info: { 500: '#93C5FD' },
    error: { 50: 'rgba(239,68,68,0.12)', 500: '#F87171', 700: '#FCA5A5' },
  };
  const typography = {};
  const spacing = {};
  const borders = {};

  // Asegurar que typography tenga todas las propiedades necesarias
  const safeTypography = typography?.fontSize && typography?.fontWeight
    ? typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
    };

  // Validar que borders esté completamente inicializado
  const safeBorders = (borders?.radius && typeof borders.radius.full !== 'undefined')
    ? borders
    : {
      radius: {
        none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 24,
        full: 9999,
        button: { sm: 8, md: 12, lg: 16, full: 9999 },
        input: { sm: 8, md: 12, lg: 16 },
        card: { sm: 8, md: 12, lg: 16, xl: 20 },
        modal: { sm: 12, md: 16, lg: 20, xl: 24 },
        avatar: { sm: 16, md: 24, lg: 32, full: 9999 },
        badge: { sm: 4, md: 8, lg: 12, full: 9999 },
      },
      width: { none: 0, thin: 1, medium: 2, thick: 4 }
    };

  const styles = createStyles(colors, safeTypography, spacing, safeBorders);

  useEffect(() => {
    cargarPagos();
  }, []);

  const cargarPagos = async () => {
    try {
      setError(null);
      const datos = await pagosService.obtenerHistorialPagos();
      console.log('HistorialPagosScreen: Datos recibidos:', datos);
      
      // El endpoint historial_completo ya filtra solo pagos aprobados
      // Pero por seguridad, filtrar nuevamente
      const pagosAprobados = Array.isArray(datos) 
        ? datos.filter(pago => pago.status === 'approved' || !pago.status) // Incluir pagos virtuales sin status
        : [];
      
      console.log('HistorialPagosScreen: Pagos aprobados:', pagosAprobados.length);
      setPagos(pagosAprobados);
    } catch (err) {
      console.error('HistorialPagosScreen: Error cargando pagos:', err);
      setError(err.message || 'No se pudo cargar el historial de pagos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarPagos();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount) => {
    return `$${parseInt(amount).toLocaleString('es-CL')}`;
  };

  const getTipoPagoLabel = (tipoPago) => {
    const labels = {
      'servicio_completo': 'Servicio Completo',
      'servicio_parcial': 'Pago Parcial',
      'servicio_secundario': 'Servicio Adicional',
    };
    return labels[tipoPago] || 'Pago';
  };

  const getTipoPagoColor = (tipoPago) => {
    const colorMap = {
      'servicio_completo': colors.success?.[500] || '#10B981',
      'servicio_parcial': colors.warning?.[500] || '#F59E0B',
      'servicio_secundario': colors.info?.[500] || colors.primary?.[500] || '#003459',
    };
    return colorMap[tipoPago] || colors.text?.secondary || '#5D6F75';
  };

  const renderPagoItem = ({ item }) => {
    const tipoPago = item.tipo_pago || 'servicio_completo';
    const tipoPagoColor = getTipoPagoColor(tipoPago);
    
    return (
      <View style={styles.pagoCard}>
        {/* Header con tipo de pago y monto */}
        <View style={styles.pagoHeader}>
          <View style={[styles.tipoPagoBadge, { backgroundColor: tipoPagoColor + '20', borderColor: tipoPagoColor }]}>
            <Text style={[styles.tipoPagoText, { color: tipoPagoColor }]}>
              {getTipoPagoLabel(tipoPago)}
            </Text>
          </View>
          <Text style={styles.monto}>{formatAmount(item.transaction_amount)}</Text>
        </View>

        {/* Información del proveedor */}
        {item.proveedor_info && (
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color={colors.text?.secondary || '#5D6F75'} />
            <Text style={styles.infoText}>
              {item.proveedor_info.nombre}
              {item.proveedor_info.tipo && ` (${item.proveedor_info.tipo === 'taller' ? 'Taller' : 'Mecánico'})`}
            </Text>
          </View>
        )}

        {/* Información de la oferta */}
        {item.oferta_info && (
          <View style={styles.infoRow}>
            <Ionicons name="pricetag-outline" size={16} color={colors.text?.secondary || '#5D6F75'} />
            <Text style={styles.infoText}>
              Oferta: {formatAmount(item.oferta_info.precio_total)}
            </Text>
          </View>
        )}

        {/* Información de la solicitud */}
        {item.solicitud_info && (
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={16} color={colors.text?.secondary || '#5D6F75'} />
            <Text style={styles.infoText} numberOfLines={2}>
              {item.solicitud_info.descripcion || 'Solicitud de servicio'}
            </Text>
          </View>
        )}

        {/* Fecha y hora */}
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.text?.secondary || '#5D6F75'} />
          <Text style={styles.infoText}>
            {formatDate(item.date_approved_mp || item.fecha_creacion)}
          </Text>
        </View>

        {/* Estado del pago */}
        <View style={styles.estadoContainer}>
          <View style={[styles.estadoBadge, { backgroundColor: colors.success?.[50] || '#ECFDF5' }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success?.[600] || '#10B981'} />
            <Text style={[styles.estadoText, { color: colors.success?.[700] || '#047857' }]}>
              Aprobado
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={80} color={colors.text?.secondary || '#5D6F75'} />
      <Text style={styles.emptyTitle}>No hay pagos registrados</Text>
      <Text style={styles.emptySubtitle}>
        Tus pagos aprobados aparecerán aquí
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#030712" />
        <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
          <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.08)' }} />
          <View style={{ position: 'absolute', top: 400, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(99,102,241,0.06)' }} />
          <View style={{ position: 'absolute', bottom: -40, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(6,182,212,0.05)' }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6EE7B7" />
          <Text style={styles.loadingText}>Cargando pagos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.08)' }} />
        <View style={{ position: 'absolute', top: 400, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(99,102,241,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -40, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(6,182,212,0.05)' }} />
      </View>

      {/* Lista de pagos */}
      <FlatList
        data={pagos}
        keyExtractor={(item) => item.id}
        renderItem={renderPagoItem}
        contentContainerStyle={[
          styles.listContent,
          pagos.length === 0 && styles.listContentEmpty
        ]}
        ListEmptyComponent={!loading && renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6EE7B7']}
            tintColor={'#6EE7B7'}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.error?.[500] || '#EF4444'} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  listContent: {
    padding: spacing.md || SPACING.md,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  pagoCard: {
    backgroundColor: colors.background?.paper || GLASS_BG,
    borderRadius: borders.radius?.card?.md || BORDERS.radius.md,
    padding: spacing.md || SPACING.md,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
  },
  pagoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm || SPACING.sm,
  },
  tipoPagoBadge: {
    paddingHorizontal: spacing.sm || SPACING.sm,
    paddingVertical: spacing.xs || SPACING.xs,
    borderRadius: borders.radius?.badge?.sm || BORDERS.radius.sm,
    borderWidth: 1,
  },
  tipoPagoText: {
    fontSize: typography.fontSize?.xs || 11,
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  monto: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: '#F9FAFB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs || SPACING.xs,
    gap: spacing.xs || SPACING.xs,
  },
  infoText: {
    fontSize: typography.fontSize?.sm || 13,
    color: 'rgba(255,255,255,0.6)',
    flex: 1,
  },
  estadoContainer: {
    marginTop: spacing.sm || SPACING.sm,
    paddingTop: spacing.sm || SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm || SPACING.sm,
    paddingVertical: spacing.xs || SPACING.xs,
    borderRadius: borders.radius?.badge?.sm || BORDERS.radius.sm,
    gap: spacing.xs || SPACING.xs,
  },
  estadoText: {
    fontSize: typography.fontSize?.xs || 11,
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  separator: {
    height: spacing.sm || SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['3xl'] || 60,
  },
  emptyTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: '#F9FAFB',
    marginTop: spacing.md || SPACING.md,
    marginBottom: spacing.xs || SPACING.xs,
  },
  emptySubtitle: {
    fontSize: typography.fontSize?.sm || 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md || SPACING.md,
    fontSize: typography.fontSize?.sm || 13,
    color: 'rgba(255,255,255,0.6)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error?.[50] || 'rgba(239,68,68,0.12)',
    padding: spacing.md || SPACING.md,
    margin: spacing.md || SPACING.md,
    borderRadius: borders.radius?.md || BORDERS.radius.md,
    gap: spacing.sm || SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.22)',
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSize?.sm || 13,
    color: colors.error?.[700] || '#FCA5A5',
  },
});

export default HistorialPagosScreen;

