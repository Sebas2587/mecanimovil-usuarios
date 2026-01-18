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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import pagosService from '../../services/pagosService';
import { COLORS, SPACING, BORDERS } from '../../utils/constants';

/**
 * Pantalla que muestra el historial de pagos del usuario
 */
const HistorialPagosScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Extraer valores del tema
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};

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
        <StatusBar barStyle="dark-content" backgroundColor={colors.background?.paper || '#FFFFFF'} />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text?.primary || '#00171F'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historial de Pagos</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
          <Text style={styles.loadingText}>Cargando pagos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background?.paper || '#FFFFFF'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text?.primary || '#00171F'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Pagos</Text>
        <View style={styles.backButton} />
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
            colors={[colors.primary?.[500] || '#003459']}
            tintColor={colors.primary?.[500] || '#003459'}
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
    backgroundColor: colors.background?.default || '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md || SPACING.md,
    paddingVertical: spacing.md || SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    backgroundColor: colors.background?.paper || '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
  },
  listContent: {
    padding: spacing.md || SPACING.md,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  pagoCard: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.md || BORDERS.radius.md,
    padding: spacing.md || SPACING.md,
    borderWidth: 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    color: colors.text?.primary || '#00171F',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs || SPACING.xs,
    gap: spacing.xs || SPACING.xs,
  },
  infoText: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
    flex: 1,
  },
  estadoContainer: {
    marginTop: spacing.sm || SPACING.sm,
    paddingTop: spacing.sm || SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral?.gray?.[200] || '#E5E7EB',
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
    color: colors.text?.primary || '#00171F',
    marginTop: spacing.md || SPACING.md,
    marginBottom: spacing.xs || SPACING.xs,
  },
  emptySubtitle: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
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
    color: colors.text?.secondary || '#5D6F75',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error?.[50] || '#FEF2F2',
    padding: spacing.md || SPACING.md,
    margin: spacing.md || SPACING.md,
    borderRadius: borders.radius?.md || BORDERS.radius.md,
    gap: spacing.sm || SPACING.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSize?.sm || 13,
    color: colors.error?.[700] || '#B91C1C',
  },
});

export default HistorialPagosScreen;

