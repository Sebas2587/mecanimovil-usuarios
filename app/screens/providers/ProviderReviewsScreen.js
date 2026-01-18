import React, { useEffect, useState, useCallback } from 'react';
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
  Image,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { get } from '../../services/api';
import { useTheme } from '../../design-system/theme/useTheme';

const RATINGS = [5, 4, 3, 2, 1];

const ProviderReviewsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { providerId, providerName, averageRating, reviewCount } = route.params;

  // Extraer valores del tema de forma segura
  const colors = theme?.colors || {};
  const typography = theme?.typography && theme?.typography?.fontSize && theme?.typography?.fontWeight
    ? theme.typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
    };
  const spacing = theme?.spacing || {};
  const borders = (theme?.borders?.radius && typeof theme.borders.radius.full !== 'undefined')
    ? theme.borders
    : {
      radius: {
        none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 24,
        full: 9999,
        button: { sm: 8, md: 12, lg: 16, full: 9999 },
        card: { sm: 8, md: 12, lg: 16, xl: 20 },
        badge: { sm: 4, md: 8, lg: 12, full: 9999 },
        avatar: { sm: 16, md: 24, lg: 32, full: 9999 },
      },
      width: { none: 0, thin: 1, medium: 2, thick: 4 }
    };

  // Crear estilos dinámicos
  const styles = createStyles(colors, typography, spacing, borders);

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [stats, setStats] = useState({});

  // Cargar estadísticas y reviews al montar
  useEffect(() => {
    fetchStats();
    fetchReviews(1, selectedRating, true);
  }, [providerId]);

  // Cargar reviews cuando cambia el filtro
  useEffect(() => {
    if (providerId) {
      fetchReviews(1, selectedRating, true);
    }
  }, [selectedRating]);

  const fetchStats = async () => {
    try {
      const statsResp = await get(`/usuarios/providers/${providerId}/reviews/stats/`);
      setStats(statsResp);
    } catch (err) {
      // No es crítico
    }
  };

  const fetchReviews = async (pageToLoad = 1, rating = null, reset = false) => {
    try {
      if (reset) setLoading(true);
      setError(null);
      let url = `/usuarios/providers/${providerId}/reviews/?page=${pageToLoad}`;
      if (rating) url += `&rating=${rating}`;
      const resp = await get(url);
      const results = resp.results || resp;
      if (reset) {
        setReviews(results);
      } else {
        setReviews(prev => [...prev, ...results]);
      }
      setHasMore(!!resp.next);
      setPage(pageToLoad);
    } catch (err) {
      // Si es un error 404 de página inválida, no mostrar error
      if (err.status === 404 && err.data?.detail === 'Página inválida.') {
        setHasMore(false);
        if (!reset) {
          setIsFetchingMore(false);
        }
      } else {
        setError('Error al cargar comentarios');
      }
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews(1, selectedRating, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !isFetchingMore && !loading && reviews.length > 0) {
      setIsFetchingMore(true);
      fetchReviews(page + 1, selectedRating);
    }
  };

  const handleSelectRating = (rating) => {
    const newRating = rating === selectedRating ? null : rating;
    setSelectedRating(newRating);
    setPage(1);
    setReviews([]);
    setHasMore(true);
    setError(null);
  };

  // ELIMINADO: renderHeader() - Ya se usa CustomHeader desde AppNavigator

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={styles.filtersScrollView}
      >
        <TouchableOpacity
          style={[styles.filterButton, !selectedRating && styles.filterButtonSelected]}
          onPress={() => handleSelectRating(null)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, !selectedRating && styles.filterTextSelected]}>Todos</Text>
        </TouchableOpacity>
        {RATINGS.map(rating => (
          <TouchableOpacity
            key={rating}
            style={[styles.filterButton, selectedRating === rating && styles.filterButtonSelected]}
            onPress={() => handleSelectRating(rating)}
            activeOpacity={0.7}
          >
            <View style={styles.starsRow}>
              {[...Array(rating)].map((_, i) => (
                <Ionicons 
                  key={i} 
                  name="star" 
                  size={14} 
                  color={selectedRating === rating 
                    ? '#FFFFFF' 
                    : (colors.warning?.[500] || '#F59E0B')} 
                />
              ))}
            </View>
            <Text style={[styles.filterText, selectedRating === rating && styles.filterTextSelected]}>
              {rating}★ {stats.rating_distribution ? `(${stats.rating_distribution[`${rating}_star`] || 0})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderReview = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {item.client_info?.profile_photo ? (
          <Image 
            source={{ uri: item.client_info.profile_photo }} 
            style={styles.clientPhoto}
            onError={() => console.log('Error cargando foto del cliente')}
          />
        ) : (
          <View style={styles.clientPhotoPlaceholder}>
            <Ionicons 
              name="person-circle" 
              size={24} 
              color={colors.primary?.[500] || '#003459'} 
            />
          </View>
        )}
        <View style={styles.reviewHeaderInfo}>
          <Text style={styles.reviewClient}>
            {item.client_info?.full_name || item.client_info?.username || 'Usuario'}
          </Text>
          <Text style={styles.reviewDate}>
            {item.created_at_formatted || item.created_at?.slice(0, 10) || ''}
          </Text>
        </View>
        <View style={styles.reviewStars}>
          {[...Array(5)].map((_, i) => (
            <Ionicons 
              key={i} 
              name={i < item.rating ? "star" : "star-outline"} 
              size={14} 
              color={colors.warning?.[500] || '#F59E0B'} 
            />
          ))}
        </View>
      </View>
      
      {/* Modelo del auto debajo del usuario */}
      {item.car_info?.full_name && item.car_info.full_name !== 'N/A' && (
        <View style={styles.carInfo}>
          <Ionicons name="car" size={14} color={colors.primary?.[500] || '#003459'} />
          <Text style={styles.carText}>
            {item.car_info.brand} {item.car_info.model}
          </Text>
        </View>
      )}
      
      {/* Comentario */}
      {item.comment && (
        <Text style={styles.reviewComment}>{item.comment}</Text>
      )}
      
      {/* Servicio prestado debajo del comentario */}
      {item.service_info && item.service_info.name && item.service_info.name !== 'N/A' && (
        <View style={styles.serviceInfo}>
          <Ionicons name="construct" size={14} color={colors.text?.secondary || '#5D6F75'} />
          <Text style={styles.serviceText}>
            {item.service_info.name}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
        <Text style={styles.loadingText}>Cargando comentarios...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background?.paper || '#FFFFFF'} />
      {/* ELIMINADO: renderHeader() - Ya se usa CustomHeader desde AppNavigator */}
      {renderFilters()}
      <FlatList
        data={reviews}
        keyExtractor={(item, index) => `review-${item.id || index}`}
        renderItem={renderReview}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.md }
        ]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Ionicons 
                name="chatbubble-ellipses-outline" 
                size={60} 
                color={colors.text?.secondary || '#5D6F75'} 
              />
              <Text style={styles.emptyText}>
                {selectedRating
                  ? 'No hay comentarios para esta calificación.'
                  : 'Este proveedor aún no tiene comentarios.'}
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary?.[500] || '#003459']}
            tintColor={colors.primary?.[500] || '#003459'}
          />
        }
        ListFooterComponent={
          isFetchingMore && (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={colors.primary?.[500] || '#003459'} />
            </View>
          )
        }
      />
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  // ELIMINADO: header, backButton, headerContent, title, ratingRow, averageRating, reviewCount
  // Ya se usa CustomHeader desde AppNavigator
  filtersContainer: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  filtersScrollView: {
    paddingVertical: spacing.sm || 10,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md || 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm || 12,
    paddingVertical: spacing.xs || 6,
    borderRadius: borders.radius?.badge?.full || 16,
    backgroundColor: colors.background?.default || '#F8F9FA',
    marginRight: spacing.sm || 8,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  filterButtonSelected: {
    backgroundColor: colors.primary?.[500] || '#003459',
    borderColor: colors.primary?.[500] || '#003459',
  },
  filterText: {
    marginLeft: spacing.xs || 4,
    fontSize: typography.fontSize?.sm || 14,
    color: colors.text?.primary || '#00171F',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  filterTextSelected: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeight?.bold || '700',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || 2,
  },
  listContent: {
    padding: spacing.md || 16,
  },
  reviewCard: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.md || 12,
    padding: spacing.md || 16,
    marginBottom: spacing.md || 16,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm || 10,
  },
  reviewHeaderInfo: {
    flex: 1,
    marginLeft: spacing.sm || 10,
  },
  reviewClient: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing.xs || 2,
  },
  reviewDate: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#5D6F75',
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || 2,
  },
  clientPhoto: {
    width: 40,
    height: 40,
    borderRadius: borders.radius?.avatar?.md || 20,
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
  },
  clientPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: borders.radius?.avatar?.md || 20,
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm || 8,
    paddingHorizontal: spacing.sm || 8,
    paddingVertical: spacing.xs || 4,
    backgroundColor: colors.primary?.[50] || '#E6F2F7',
    borderRadius: borders.radius?.button?.sm || 8,
    alignSelf: 'flex-start',
  },
  serviceText: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
    marginLeft: spacing.xs || 6,
  },
  carInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs || 6,
    marginBottom: spacing.sm || 8,
    paddingHorizontal: spacing.sm || 8,
    paddingVertical: spacing.xs || 4,
    backgroundColor: colors.primary?.[50] || '#E6F2F7',
    borderRadius: borders.radius?.button?.sm || 8,
    alignSelf: 'flex-start',
  },
  carText: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.primary?.[600] || '#002A47',
    fontWeight: typography.fontWeight?.semibold || '600',
    marginLeft: spacing.xs || 6,
  },
  reviewComment: {
    fontSize: typography.fontSize?.base || 14,
    color: colors.text?.primary || '#00171F',
    marginTop: spacing.sm || 8,
    lineHeight: typography.fontSize?.base ? typography.fontSize.base * 1.4 : 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: spacing.xl || 40,
    paddingHorizontal: spacing.md || 16,
  },
  emptyText: {
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
    marginTop: spacing.md || 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  loadingText: {
    marginTop: spacing.md || 16,
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
  },
  errorContainer: {
    padding: spacing.md || 16,
    alignItems: 'center',
  },
  errorText: {
    color: colors.error?.[500] || '#EF4444',
    fontSize: typography.fontSize?.base || 14,
    marginTop: spacing.sm || 10,
  },
  footerLoading: {
    padding: spacing.md || 16,
    alignItems: 'center',
  },
});

export default ProviderReviewsScreen;