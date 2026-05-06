import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProviderReviews } from '../../services/providers';
import ReviewCard from '../../components/reviews/ReviewCard';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';

const ProviderReviewsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { providerId, providerType } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Hide default Stack header (it's light by default)
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
                name={star <= Math.round(data.rating_average) ? 'star' : 'star-outline'}
                size={14}
                color={COLORS.warning.main}
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
                <Ionicons name="star" size={10} color={COLORS.text.tertiary} style={{ marginRight: 6 }} />
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
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      <View style={styles.body}>
        {/* Sticky Custom Header */}
        <View style={styles.stickyHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Opiniones</Text>
        </View>

        <FlatList
          style={styles.listScroll}
          data={data?.reviews || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <ReviewCard review={item} />}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aún no hay reseñas para este proveedor.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: COLORS.background.default,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  listScroll: {
    flex: 1,
    minHeight: 0,
    ...Platform.select({
      web: {
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        height: 0,
        overflow: 'auto',
      },
      default: {},
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.default,
  },
  // Sticky Header Styling
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.container.horizontal,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    overflow: 'hidden',
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.neutral.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: -0.25,
    color: COLORS.text.primary,
  },
  listContent: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: 16,
    paddingBottom: 40,
  },
  // Summary Card Styling (Light Yellow)
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  ratingLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 24,
    borderRightWidth: 1,
    borderRightColor: COLORS.border.light,
  },
  bigRating: {
    fontSize: 42,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: -0.5,
    color: COLORS.text.primary,
    lineHeight: 48,
  },
  starsRow: {
    flexDirection: 'row',
    marginVertical: 6,
    gap: 2,
  },
  totalReviewsText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
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
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    width: 14,
    textAlign: 'left',
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: COLORS.warning.main,
    borderRadius: 3,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
});

export default ProviderReviewsScreen;