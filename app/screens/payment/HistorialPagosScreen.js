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
import { Receipt, AlertCircle } from 'lucide-react-native';
import pagosService from '../../services/pagosService';
import PaymentHistoryCard from '../../components/cards/PaymentHistoryCard';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';

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

  const renderPagoItem = ({ item }) => (
    <PaymentHistoryCard item={item} formatAmount={formatAmount} formatDate={formatDate} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Receipt size={80} color={COLORS.neutral.gray[300]} />
      <Text style={styles.emptyTitle}>No hay pagos registrados</Text>
      <Text style={styles.emptySubtitle}>Tus pagos aprobados aparecerán aquí</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.icon.active} />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.icon.active} />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {error && (
        <View style={styles.errorContainer}>
          <AlertCircle size={20} color={COLORS.error.main} />
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
    gap: SPACING.sm,
  },
  listContentEmpty: {
    flexGrow: 1,
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
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.styles.caption,
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
    ...TYPOGRAPHY.styles.caption,
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
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.error.dark,
  },
});

export default HistorialPagosScreen;
