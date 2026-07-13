import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ClipboardList } from 'lucide-react-native';
import { ROUTES } from '../../utils/constants';
import * as vehicleService from '../../services/vehicle';
import HistoryItemCard from '../../components/cards/HistoryItemCard';
import ChecklistViewerModal from '../../components/modals/ChecklistViewerModal';
import BackButton from '../../components/navigation/BackButton';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import Button from '../../components/base/Button/Button';

function parseHistoryCost(item, oferta) {
  const candidates = [
    item.cost,
    item.total,
    item.price,
    item.monto,
    oferta.precio_total,
    oferta.precio_total_ofrecido,
  ];
  for (const c of candidates) {
    const n = typeof c === 'number' ? c : parseFloat(String(c || '').replace(/\./g, ''));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return NaN;
}

function resolveHistoryRow(item) {
  const oferta = item.oferta_seleccionada_detail || item.oferta_seleccionada || {};
  const lineas = item.lineas || item.lineas_detail || [];

  let providerName = 'Proveedor';
  if (item.nombre_proveedor) providerName = item.nombre_proveedor;
  else if (oferta.nombre_proveedor) providerName = oferta.nombre_proveedor;
  else if (item.taller_nombre) providerName = item.taller_nombre;
  else if (item.mecanico_nombre) providerName = item.mecanico_nombre;

  const serviceName =
    item.servicio_nombre ||
    item.service_name ||
    (lineas[0]?.servicio_nombre) ||
    (lineas[0]?.nombre) ||
    'Servicio';

  const dateObj = item.fecha_servicio ? new Date(item.fecha_servicio) : new Date();
  const dateLabel = dateObj.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const cost = parseHistoryCost(item, oferta);
  const amountLabel = Number.isFinite(cost) && cost > 0
    ? `$${Math.round(cost).toLocaleString('es-CL')}`
    : null;

  return { providerName, serviceName, dateLabel, amountLabel };
}

const VehicleHistoryScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const vehicleId = route.params?.vehicleId;
  const initialVehicle = route.params?.vehicle || null;

  const [vehicle, setVehicle] = useState(initialVehicle);
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checklistModalVisible, setChecklistModalVisible] = useState(false);
  const [selectedChecklistId, setSelectedChecklistId] = useState(null);
  const [selectedServiceName, setSelectedServiceName] = useState('');
  const [checklistProveedorPreview, setChecklistProveedorPreview] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!vehicleId) {
      setHistoryItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [history, vehicleData] = await Promise.all([
        vehicleService.getVehicleServiceHistory(vehicleId),
        !vehicle && vehicleId ? vehicleService.getVehicleById(vehicleId).catch(() => null) : Promise.resolve(null),
      ]);

      setHistoryItems(Array.isArray(history) ? history : []);
      if (!vehicle && vehicleData) setVehicle(vehicleData);
    } catch (err) {
      console.error('Error cargando historial del vehículo:', err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, vehicle]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);

  const handleViewChecklist = useCallback((item, proveedorPreview) => {
    const ordenId = item.id;
    if (!ordenId) return;
    setSelectedChecklistId(ordenId);
    setSelectedServiceName(item.servicio_nombre || 'Servicio');
    setChecklistProveedorPreview(proveedorPreview || null);
    setChecklistModalVisible(true);
  }, []);

  const closeChecklistModal = useCallback(() => {
    setChecklistModalVisible(false);
    setChecklistProveedorPreview(null);
  }, []);

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <ClipboardList size={40} color={COLORS.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>Sin servicios completados</Text>
      <Text style={styles.emptySubtitle}>
        Cuando este vehículo tenga servicios completados, aparecerán aquí.
      </Text>
      <Button
        title="Crear solicitud"
        onPress={() => navigation.navigate(ROUTES.CREAR_SOLICITUD)}
        icon="add"
      />
    </View>
  );

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.headerCard}>
        <Text style={styles.vehicleTitle}>
          {vehicle?.marca_nombre || vehicle?.marca || ''}{' '}
          {vehicle?.modelo_nombre || vehicle?.modelo || ''} • {vehicle?.patente || ''}
        </Text>
        {historyItems.length > 0 && (
          <Text style={styles.sectionSubtitle}>
            {historyItems.length}{' '}
            {historyItems.length === 1 ? 'servicio completado' : 'servicios completados'}
          </Text>
        )}
      </View>
    </View>
  );

  const renderHistoryItem = ({ item, index }) => {
    const { providerName, serviceName, dateLabel, amountLabel } = resolveHistoryRow(item);

    return (
      <View style={styles.timelineCard}>
        <HistoryItemCard
          title={serviceName}
          dateLabel={dateLabel}
          providerName={providerName}
          amountLabel={amountLabel}
          isLast={index === historyItems.length - 1}
        />
        <TouchableOpacity
          style={styles.checklistButton}
          onPress={() =>
            handleViewChecklist(item, {
              nombre: providerName,
              fotoUrl: item.proveedor_foto || null,
              tipo: item.tipo_proveedor || 'taller',
            })
          }
          activeOpacity={0.75}
        >
          <ClipboardList size={16} color={COLORS.primary[600]} />
          <Text style={styles.checklistButtonText}>Ver informe de servicio</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.navHeader}>
            <BackButton onPress={() => navigation.goBack()} />
            <Text style={styles.navTitle}>Historial</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary[500]} />
            <Text style={styles.loadingText}>Cargando historial...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.navHeader}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.navTitle}>Historial</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={historyItems}
          keyExtractor={(item) => `history-${item.id}`}
          renderItem={renderHistoryItem}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary[500]}
              colors={[COLORS.primary[500]]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      <ChecklistViewerModal
        visible={checklistModalVisible}
        onClose={closeChecklistModal}
        ordenId={selectedChecklistId}
        servicioNombre={selectedServiceName}
        proveedorPreview={checklistProveedorPreview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background.default },
  flex: { flex: 1 },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: SPACING.sm,
  },
  navTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  listHeader: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  headerCard: {
    borderRadius: BORDERS.radius.card.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    overflow: 'hidden',
    backgroundColor: COLORS.background.paper,
    ...SHADOWS.sm,
  },
  vehicleTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.xxs,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  timelineCard: {
    marginHorizontal: SPACING.container.horizontal,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  checklistButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[50],
    gap: SPACING.xs,
  },
  checklistButtonText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[700],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING['2xl'],
    minHeight: 280,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
});

export default VehicleHistoryScreen;
