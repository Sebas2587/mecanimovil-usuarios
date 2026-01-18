import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Skeleton from '../feedback/Skeleton/Skeleton';
import { SPACING } from '../../utils/constants';

const UserPanelSkeleton = ({ tabBarHeight = 0 }) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + (SPACING?.xl || 32) }
        ]}
      >
        {/* Header Skeleton */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Skeleton width={120} height={24} borderRadius={4} />
            <Skeleton width={100} height={16} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>

        {/* Selector de Dirección Skeleton */}
        <View style={styles.locationBadgeContainer}>
          <Skeleton width="100%" height={50} borderRadius={12} />
        </View>

        {/* Categorías Skeleton */}
        <View style={styles.sectionWithHorizontalScroll}>
          <View style={styles.sectionHeaderWithPadding}>
            <Skeleton width={180} height={20} borderRadius={4} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesHorizontal}
          >
            {[1, 2, 3, 4].map((item) => (
              <View key={item} style={styles.categorySkeleton}>
                <Skeleton width={85} height={85} borderRadius={42.5} />
                <Skeleton width={85} height={14} borderRadius={4} style={{ marginTop: 8 }} />
                <Skeleton width={60} height={12} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Selector de Vehículo Skeleton */}
        <View style={styles.section}>
          <Skeleton width="100%" height={80} borderRadius={12} />
        </View>

        {/* Alertas Skeleton */}
        <View style={styles.sectionWithHorizontalScroll}>
          <View style={styles.sectionHeaderWithPadding}>
            <View style={styles.sectionHeaderLeft}>
              <Skeleton width={20} height={20} borderRadius={10} />
              <Skeleton width={150} height={20} borderRadius={4} style={{ marginLeft: 8 }} />
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.alertsHorizontal}
          >
            {[1, 2].map((item) => (
              <View key={item} style={styles.alertSkeleton}>
                <Skeleton width={280} height={120} borderRadius={12} />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Solicitudes Activas Skeleton */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Skeleton width={180} height={20} borderRadius={4} />
            <Skeleton width={80} height={16} borderRadius={4} />
          </View>
          {[1, 2].map((item) => (
            <View key={item} style={styles.solicitudSkeleton}>
              <Skeleton width="100%" height={140} borderRadius={12} style={{ marginBottom: 12 }} />
            </View>
          ))}
        </View>

        {/* Talleres Cercanos Skeleton */}
        <View style={styles.sectionWithHorizontalScroll}>
          <View style={styles.sectionHeaderWithPadding}>
            <Skeleton width={150} height={20} borderRadius={4} />
            <Skeleton width={80} height={16} borderRadius={4} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.providersHorizontal}
          >
            {[1, 2, 3].map((item) => (
              <View key={item} style={styles.providerSkeleton}>
                <Skeleton width={200} height={180} borderRadius={12} />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Mecánicos Cercanos Skeleton */}
        <View style={styles.sectionWithHorizontalScroll}>
          <View style={styles.sectionHeaderWithPadding}>
            <Skeleton width={160} height={20} borderRadius={4} />
            <Skeleton width={80} height={16} borderRadius={4} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.providersHorizontal}
          >
            {[1, 2, 3].map((item) => (
              <View key={item} style={styles.providerSkeleton}>
                <Skeleton width={200} height={180} borderRadius={12} />
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING?.md || 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerContent: {
    flex: 1,
  },
  locationBadgeContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: SPACING?.md || 16,
    marginTop: SPACING?.sm || 8,
    marginBottom: SPACING?.xs || 4,
    borderRadius: 12,
    paddingHorizontal: SPACING?.sm || 12,
    paddingVertical: SPACING?.xs || 8,
  },
  sectionWithHorizontalScroll: {
    marginTop: SPACING?.md || 16,
  },
  sectionHeaderWithPadding: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING?.sm || 8,
    paddingHorizontal: SPACING?.md || 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  section: {
    marginTop: SPACING?.md || 16,
    paddingHorizontal: SPACING?.md || 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING?.sm || 8,
  },
  categoriesHorizontal: {
    paddingVertical: SPACING?.sm || 8,
    paddingLeft: SPACING?.md || 16,
    paddingRight: 0,
  },
  categorySkeleton: {
    marginRight: SPACING?.md || 16,
    alignItems: 'center',
  },
  alertsHorizontal: {
    paddingVertical: SPACING?.xs || 4,
    paddingLeft: SPACING?.md || 16,
    paddingRight: 0,
  },
  alertSkeleton: {
    marginRight: SPACING?.md || 16,
  },
  solicitudSkeleton: {
    marginBottom: SPACING?.sm || 8,
  },
  providersHorizontal: {
    paddingVertical: SPACING?.sm || 8,
    paddingLeft: SPACING?.md || 16,
    paddingRight: 0,
  },
  providerSkeleton: {
    marginRight: SPACING?.md || 16,
  },
});

export default UserPanelSkeleton;

