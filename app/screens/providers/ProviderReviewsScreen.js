import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProviderReviews } from '../../services/providers';
import ReviewCard from '../../components/reviews/ReviewCard';

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

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
        {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
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
                <Ionicons name="star" size={10} color="rgba(255,255,255,0.45)" style={{ marginRight: 6 }} />
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
        <StatusBar barStyle="light-content" backgroundColor="#030712" />
        <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#6EE7B7" />
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

      <View style={styles.body}>
        {/* Sticky Custom Header */}
        <View style={styles.stickyHeader}>
          {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#F9FAFB" />
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
    backgroundColor: '#030712',
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
    backgroundColor: '#030712',
  },
  // Sticky Header Styling
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  // Summary Card Styling (Light Yellow)
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
  },
  ratingLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 24,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  bigRating: {
    fontSize: 42,
    fontWeight: '800', // Extra bold
    color: '#F9FAFB',
    lineHeight: 48,
  },
  starsRow: {
    flexDirection: 'row',
    marginVertical: 6,
    gap: 2,
  },
  totalReviewsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
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
    color: 'rgba(255,255,255,0.55)',
    width: 14,
    textAlign: 'left',
    fontWeight: '600',
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
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
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
  },
});

export default ProviderReviewsScreen;