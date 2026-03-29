import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { get, post } from '../../services/api';
import { COLORS } from '../../utils/constants';

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

const PendingReviewsScreen = () => {
  const navigation = useNavigation();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadServicesWithoutReview();
  }, []);

  const loadServicesWithoutReview = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await get('/usuarios/servicios-completados-sin-resena/');
      setServices(response.services_without_review || []);
    } catch (err) {
      console.error('Error al cargar servicios:', err);
      setError('Error al cargar servicios completados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadServicesWithoutReview();
  };

  const handleCreateReview = (service) => {
    navigation.navigate('CreateReview', { service });
  };

  const renderServiceItem = ({ item }) => (
    <View style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <View style={styles.providerInfo}>
          {item.provider.provider_photo ? (
            <Image
              source={{ uri: item.provider.provider_photo }}
              style={styles.providerPhoto}
              contentFit="cover"
            />
          ) : (
            <View style={styles.providerPhotoPlaceholder}>
              <Ionicons name="person" size={24} color={COLORS.textLight} />
            </View>
          )}
          <View style={styles.providerDetails}>
            <Text style={styles.providerName}>{item.provider.provider_name}</Text>
            <Text style={styles.serviceName}>{item.service_name}</Text>
          </View>
        </View>
        <View style={styles.vehicleInfo}>
          <Ionicons name="car" size={16} color={COLORS.textLight} />
          <Text style={styles.vehicleText}>
            {item.vehicle.full_name}
          </Text>
        </View>
      </View>

      <View style={styles.serviceFooter}>
        <Text style={styles.completionDate}>
          Completado: {new Date(item.completion_date).toLocaleDateString()}
        </Text>
        <TouchableOpacity
          style={styles.reviewButton}
          onPress={() => handleCreateReview(item)}
        >
          <Ionicons name="star-outline" size={16} color="white" />
          <Text style={styles.reviewButtonText}>Dejar Reseña</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-circle-outline" size={80} color={COLORS.textLight} />
      <Text style={styles.emptyTitle}>¡Excelente!</Text>
      <Text style={styles.emptyText}>
        Ya has dejado reseñas para todos tus servicios completados.
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#030712" />
        <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#6EE7B7" />
        <Text style={styles.loadingText}>Cargando servicios...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.08)' }} />
        <View style={{ position: 'absolute', top: 340, left: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(99,102,241,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -50, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(6,182,212,0.05)' }} />
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => `service-${item.service_order_id}`}
        renderItem={renderServiceItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading && renderEmptyState()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6EE7B7']}
            tintColor={'#6EE7B7'}
          />
        }
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadServicesWithoutReview}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: GLASS_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  serviceCard: {
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
  },
  serviceHeader: {
    marginBottom: 12,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerPhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  providerPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.62)',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.62)',
    marginLeft: 4,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007EA7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.25)',
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030712',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 15,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(239,68,68,0.25)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PendingReviewsScreen; 