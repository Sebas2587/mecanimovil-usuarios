import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';
import { getProviderReviews } from '../../services/providers';
import ReviewCard from '../../components/reviews/ReviewCard';

const ProviderReviewsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { providerId, providerType } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Hide default header to prevent duplication
  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    fetchReviews();
  }, [providerId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const result = await getProviderReviews(providerId, providerType);
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    if (!data) return null;

    return (
      <View style={styles.summaryCard}>
        {/* Left: Big Rating */}
        <View style={styles.ratingLeft}>
          <Text style={styles.bigRating}>{data.rating_average}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= Math.round(data.rating_average) ? "star" : "star-outline"}
                size={14}
                color="#F59E0B" // Yellow-500
              />
            ))}
          </View>
          <Text style={styles.totalReviewsText}>{data.total_reviews} opiniones</Text>
        </View>

        {/* Right: Progress Bars */}
        <View style={styles.barsRight}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = data.rating_breakdown[star.toString()] || 0;
            const percentage = data.total_reviews > 0 ? (count / data.total_reviews) * 100 : 0;

            return (
              <View key={star} style={styles.barRow}>
                <Text style={styles.starLabel}>{star}</Text>
                <Ionicons name="star" size={10} color={COLORS.neutral.gray[400]} style={{ marginRight: 6 }} />
                <View style={styles.track}>
                  <View style={[styles.progress, { width: `${percentage}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.base.white} />

      {/* Sticky Custom Header */}
      <View style={styles.stickyHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.neutral.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Opiniones</Text>
      </View>

      <FlatList
        data={data?.reviews || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ReviewCard review={item} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />} // Space between cards
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aún no hay reseñas para este proveedor.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default, // F5F7F8
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.base.white,
  },
  // Sticky Header Styling
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.base.white,
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.gray[100],
    zIndex: 10,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.neutral.gray[900],
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  // Summary Card Styling (Light Yellow)
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.warning.light, // #FFF8E6
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FEF3C7', // Amber-100 equivalent for outline
  },
  ratingLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 24,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.05)', // Very subtle divider
  },
  bigRating: {
    fontSize: 42,
    fontWeight: '800', // Extra bold
    color: COLORS.neutral.gray[900],
    lineHeight: 48,
  },
  starsRow: {
    flexDirection: 'row',
    marginVertical: 6,
    gap: 2,
  },
  totalReviewsText: {
    fontSize: 12,
    color: COLORS.neutral.gray[500],
    fontWeight: '500',
  },
  barsRight: {
    flex: 1,
    paddingLeft: 24,
    justifyContent: 'center',
    gap: 6,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starLabel: {
    fontSize: 12,
    color: COLORS.neutral.gray[500],
    width: 14,
    textAlign: 'left',
    fontWeight: '600',
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.05)', // Darker track on yellow bg
    borderRadius: 3,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#F59E0B', // Amber-500
    borderRadius: 3,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.neutral.gray[500],
    fontSize: 14,
  },
});

export default ProviderReviewsScreen;