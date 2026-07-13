import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Star } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProviderReviews } from '../../services/providers';
import ReviewCard from '../../components/reviews/ReviewCard';
import AppHeader from '../../components/navigation/AppHeader';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';

const StarRating = ({ value, size = 14 }) => {
  const rounded = Math.round(value);
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rounded;
        return (
          <Star
            key={star}
            size={size}
            color={COLORS.warning.main}
            fill={filled ? COLORS.warning.main : 'transparent'}
            strokeWidth={2}
          />
        );
      })}
    </View>
  );
};

const ProviderReviewsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { providerId, providerType } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

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
        <View style={styles.ratingLeft}>
          <Text style={[TYPOGRAPHY.styles.numberDisplay, styles.bigRating]}>
            {data.rating_average}
          </Text>
          <StarRating value={data.rating_average} />
          <Text style={[TYPOGRAPHY.styles.caption, styles.totalReviewsText]}>
            {data.total_reviews} opiniones
          </Text>
        </View>

        <View style={styles.barsRight}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = data.rating_breakdown[star.toString()] || 0;
            const percentage = data.total_reviews > 0 ? (count / data.total_reviews) * 100 : 0;

            return (
              <View key={star} style={styles.barRow}>
                <Text style={[TYPOGRAPHY.styles.captionBold, styles.starLabel]}>{star}</Text>
                <Star size={10} color={COLORS.text.tertiary} fill={COLORS.text.tertiary} strokeWidth={2} />
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
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      <AppHeader title="Opiniones" onBack={() => navigation.goBack()} />

      <FlatList
        style={styles.listScroll}
        data={data?.reviews || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ReviewCard review={item} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[TYPOGRAPHY.styles.body, styles.emptyText]}>
              Aún no hay reseñas para este proveedor.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: COLORS.background.default,
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
  listContent: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
    paddingBottom: SPACING['2xl'],
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  ratingLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: SPACING.xl,
    borderRightWidth: BORDERS.width.thin,
    borderRightColor: COLORS.border.light,
  },
  bigRating: {
    color: COLORS.text.primary,
    lineHeight: 48,
  },
  starsRow: {
    flexDirection: 'row',
    marginVertical: SPACING.xs,
    gap: 2,
  },
  totalReviewsText: {
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  barsRight: {
    flex: 1,
    paddingLeft: SPACING.xl,
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  starLabel: {
    color: COLORS.text.tertiary,
    width: 14,
    textAlign: 'left',
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
  separator: {
    height: SPACING.md,
  },
  emptyContainer: {
    padding: SPACING['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default ProviderReviewsScreen;
