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
import { ArrowLeft, ClipboardList, Plus } from 'lucide-react-native';
import { ROUTES } from '../../utils/constants';
import * as vehicleService from '../../services/vehicle';
import { VehicleServiceHistoryRow } from '../../components/vehicles/VehicleHistoryCard';
import ChecklistViewerModal from '../../components/modals/ChecklistViewerModal';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import Button from '../../components/base/Button/Button';

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

  const handleViewChecklist = useCallback((item) => {
    const ordenId = item.id;
    if (!ordenId) return;
    setSelectedChecklistId(ordenId);
    setSelectedServiceName(item.servicio_nombre || 'Servicio');
    setChecklistModalVisible(true);
  }, []);

  const closeChecklistModal = useCallback(() => {
    setChecklistModalVisible(false);
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
          {vehicle?.marca_nombre || vehicle?.marca || ''} {vehicle?.modelo_nombre || vehicle?.modelo || ''} • {vehicle?.patente || ''}
        </Text>
        {historyItems.length > 0 && (
          <Text style={styles.sectionSubtitle}>
            {historyItems.length} {historyItems.length === 1 ? 'servicio completado' : 'servicios completados'}
          </Text>
        )}
      </View>
    </View>
  );

  const renderHistoryItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <VehicleServiceHistoryRow item={item} onViewChecklist={() => handleViewChecklist(item)} variant="light" />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.navHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <ArrowLeft size={22} color={COLORS.text.primary} />
            </TouchableOpacity>
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
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
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
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xxs,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  cardWrapper: {
    paddingHorizontal: SPACING.container.horizontal,
    marginBottom: SPACING.md,
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
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: SPACING.lg,
  },
});

export default VehicleHistoryScreen;
