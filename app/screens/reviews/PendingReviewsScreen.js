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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { get } from '../../services/api';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS, SPACING, SHADOWS } from '../../design-system/tokens';

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
      if (!refreshing) setLoading(true);
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
              <Ionicons name="person" size={24} color={COLORS.text.tertiary} />
            </View>
          )}
          <View style={styles.providerDetails}>
            <Text style={styles.providerName}>{item.provider.provider_name}</Text>
            <Text style={styles.serviceName}>{item.service_name}</Text>
          </View>
        </View>
        <View style={styles.vehicleInfo}>
          <Ionicons name="car" size={16} color={COLORS.text.secondary} />
          <Text style={styles.vehicleText}>{item.vehicle.full_name}</Text>
        </View>
      </View>

      <View style={styles.serviceFooter}>
        <Text style={styles.completionDate}>
          Completado: {new Date(item.completion_date).toLocaleDateString()}
        </Text>
        <TouchableOpacity style={styles.reviewButton} onPress={() => handleCreateReview(item)}>
          <Ionicons name="star-outline" size={16} color={COLORS.text.onPrimary} />
          <Text style={styles.reviewButtonText}>Dejar Reseña</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-circle-outline" size={80} color={COLORS.success[400]} />
      <Text style={styles.emptyTitle}>¡Excelente!</Text>
      <Text style={styles.emptyText}>Ya has dejado reseñas para todos tus servicios completados.</Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
        <Text style={styles.loadingText}>Cargando servicios...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

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
            tintColor={COLORS.primary[500]}
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
    backgroundColor: COLORS.background.default,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  serviceCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md + 4,
    marginBottom: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.sm,
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
    backgroundColor: COLORS.neutral.gray[100],
  },
  providerPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.neutral.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionDate: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BORDERS.radius.pill,
    gap: 6,
  },
  reviewButtonText: {
    color: COLORS.text.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.default,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error.main,
    fontSize: 15,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.error.light,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.error[200],
  },
  retryButtonText: {
    color: COLORS.error.dark,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PendingReviewsScreen;
