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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, ClipboardList, Plus } from 'lucide-react-native';
import { ROUTES } from '../../utils/constants';
import * as vehicleService from '../../services/vehicle';
import { VehicleServiceHistoryRow } from '../../components/vehicles/VehicleHistoryCard';
import ChecklistViewerModal from '../../components/modals/ChecklistViewerModal';

const GLASS_BG = Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)';
const BLUR_I = Platform.OS === 'ios' ? 30 : 0;

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

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <ClipboardList size={40} color="rgba(255,255,255,0.25)" />
      </View>
      <Text style={styles.emptyTitle}>Sin servicios completados</Text>
      <Text style={styles.emptySubtitle}>
        Cuando este vehículo tenga servicios completados, aparecerán aquí.
      </Text>
      <TouchableOpacity style={styles.emptyButton} activeOpacity={0.85} onPress={() => navigation.navigate(ROUTES.CREAR_SOLICITUD)}>
        <LinearGradient colors={['#007EA7', '#00A8E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <Plus size={18} color="#FFF" />
        <Text style={styles.emptyButtonText}>Crear solicitud</Text>
      </TouchableOpacity>
    </View>
  );

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.headerCard}>
        {Platform.OS === 'ios' && <BlurView intensity={BLUR_I} tint="dark" style={StyleSheet.absoluteFill} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS_BG }]} />
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
      <VehicleServiceHistoryRow item={item} onViewChecklist={() => handleViewChecklist(item)} variant="dark" />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.navHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Historial</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6EE7B7" />
            <Text style={styles.loadingText}>Cargando historial...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color="#FFF" />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6EE7B7" />}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      <ChecklistViewerModal
        visible={checklistModalVisible}
        onClose={() => setChecklistModalVisible(false)}
        ordenId={selectedChecklistId}
        servicioNombre={selectedServiceName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030712' },
  flex: { flex: 1 },
  blob1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(16,185,129,0.08)',
  },
  blob2: {
    position: 'absolute',
    bottom: 120,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
  },
  listContent: {
    paddingBottom: 32,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
    overflow: 'hidden',
  },
  vehicleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
  cardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    minHeight: 280,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    overflow: 'hidden',
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default VehicleHistoryScreen;
