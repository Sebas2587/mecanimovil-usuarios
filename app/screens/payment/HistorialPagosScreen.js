import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import pagosService from '../../services/pagosService';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING, BORDERS, SHADOWS } from '../../design-system/tokens';

/**
 * Pantalla que muestra el historial de pagos del usuario
 */
const HistorialPagosScreen = () => {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarPagos();
  }, []);

  const cargarPagos = async () => {
    try {
      setError(null);
      const datos = await pagosService.obtenerHistorialPagos();

      const pagosAprobados = Array.isArray(datos)
        ? datos.filter((pago) => pago.status === 'approved' || !pago.status)
        : [];

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
      servicio_completo: 'Servicio Completo',
      servicio_parcial: 'Pago Parcial',
      servicio_secundario: 'Servicio Adicional',
    };
    return labels[tipoPago] || 'Pago';
  };

  /** Badges alineados a Coinbase: tintes semánticos suaves, borde hairline único, texto ink. */
  const getTipoPagoBadgeTokens = (tipoPago) => {
    switch (tipoPago) {
      case 'servicio_completo':
        return { bg: COLORS.success[50], fg: COLORS.success[700] };
      case 'servicio_parcial':
        return { bg: COLORS.warning[50], fg: COLORS.warning[800] };
      case 'servicio_secundario':
        return { bg: COLORS.primary[50], fg: COLORS.primary[700] };
      default:
        return { bg: COLORS.neutral.gray[100], fg: COLORS.text.secondary };
    }
  };

  const renderPagoItem = ({ item }) => {
    const tipoPago = item.tipo_pago || 'servicio_completo';
    const tipoTokens = getTipoPagoBadgeTokens(tipoPago);

    return (
      <View style={styles.pagoCard}>
        <View style={styles.pagoHeader}>
          <View
            style={[
              styles.tipoPagoBadge,
              {
                backgroundColor: tipoTokens.bg,
              },
            ]}
          >
            <Text style={[styles.tipoPagoText, { color: tipoTokens.fg }]}>
              {getTipoPagoLabel(tipoPago)}
            </Text>
          </View>
          <Text style={styles.monto}>{formatAmount(item.transaction_amount)}</Text>
        </View>

        {item.proveedor_info && (
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.infoText}>
              {item.proveedor_info.nombre}
              {item.proveedor_info.tipo && ` (${item.proveedor_info.tipo === 'taller' ? 'Taller' : 'Mecánico'})`}
            </Text>
          </View>
        )}

        {item.oferta_info && (
          <View style={styles.infoRow}>
            <Ionicons name="pricetag-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.infoText}>Oferta: {formatAmount(item.oferta_info.precio_total)}</Text>
          </View>
        )}

        {item.solicitud_info && (
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.infoText} numberOfLines={2}>
              {item.solicitud_info.descripcion || 'Solicitud de servicio'}
            </Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.text.secondary} />
          <Text style={styles.infoText}>{formatDate(item.date_approved_mp || item.fecha_creacion)}</Text>
        </View>

        <View style={styles.estadoContainer}>
          <View style={styles.estadoBadge}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.success[600]} />
            <Text style={styles.estadoText}>Aprobado</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={80} color={COLORS.neutral.gray[300]} />
      <Text style={styles.emptyTitle}>No hay pagos registrados</Text>
      <Text style={styles.emptySubtitle}>Tus pagos aprobados aparecerán aquí</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Cargando pagos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      <FlatList
        data={pagos}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPagoItem}
        contentContainerStyle={[styles.listContent, pagos.length === 0 && styles.listContentEmpty]}
        ListEmptyComponent={!loading && renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color={COLORS.error.main} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  listContent: {
    padding: SPACING.md,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  pagoCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  pagoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tipoPagoBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDERS.radius.badge.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  tipoPagoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  monto: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    flex: 1,
  },
  estadoContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDERS.radius.badge.md,
    gap: SPACING.xs,
    backgroundColor: COLORS.success[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.success[200],
  },
  estadoText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success[700],
  },
  separator: {
    height: SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error.light,
    padding: SPACING.md,
    margin: SPACING.md,
    borderRadius: BORDERS.radius.md,
    gap: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.error[200],
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error.dark,
  },
});

export default HistorialPagosScreen;
