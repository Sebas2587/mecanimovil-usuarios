import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { get, post } from '../../services/api';
import { COLORS } from '../../utils/constants';

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
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando servicios...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

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
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
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
    backgroundColor: '#F5F7F8', // Slightly bluish light gray for modern look
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    backgroundColor: '#F1F5F9',
  },
  providerPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
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
    color: COLORS.text,
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A', // Darker slate for premium feel
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
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
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 15,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PendingReviewsScreen; 