import React from 'react';
import { View, StyleSheet, ScrollView, Platform, StatusBar } from 'react-native';
import Skeleton from '../feedback/Skeleton/Skeleton';
import { COLORS, SPACING, BORDERS } from '../../design-system/tokens';

const HEADER_CONTENT_HEIGHT = 60;

/**
 * Placeholder de carga inicial para DetalleSolicitudScreen (desde Mis solicitudes u otras rutas).
 * Replica header fijo + vehículo + resumen + tabs + ofertas.
 */
const DetalleSolicitudSkeleton = ({
  paddingTop = 0,
  contentPaddingBottom = 120,
  webScreenFrame = null,
}) => (
  <View style={[styles.container, webScreenFrame]}>
    <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

    <View style={[styles.header, { paddingTop }]}>
      <View style={styles.headerContent}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.headerTitleCol}>
          <Skeleton width={180} height={18} borderRadius={6} />
          <Skeleton width={72} height={12} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
        <View style={{ width: 40 }} />
      </View>
    </View>

    <View style={styles.scrollHost}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: paddingTop + HEADER_CONTENT_HEIGHT,
            paddingBottom: contentPaddingBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        accessibilityElementsHidden
      >
        <View style={styles.card}>
          <View style={styles.vehicleRow}>
            <Skeleton width={48} height={48} borderRadius={BORDERS.radius.md} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width="55%" height={16} borderRadius={6} />
              <Skeleton width="40%" height={14} borderRadius={6} />
              <Skeleton width="85%" height={12} borderRadius={4} />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.summaryHeader}>
            <Skeleton width={140} height={14} borderRadius={4} />
            <Skeleton width={88} height={24} borderRadius={BORDERS.radius.full} />
          </View>
          <Skeleton width="100%" height={16} borderRadius={6} style={{ marginTop: 14 }} />
          <Skeleton width="92%" height={16} borderRadius={6} style={{ marginTop: 10 }} />
          <Skeleton width="78%" height={14} borderRadius={6} style={{ marginTop: 14 }} />
          <View style={styles.summaryMetaRow}>
            <Skeleton width="48%" height={12} borderRadius={4} />
            <Skeleton width="38%" height={12} borderRadius={4} />
          </View>
        </View>

        <View style={styles.segmentRow}>
          <Skeleton width="48%" height={40} borderRadius={BORDERS.radius.md} />
          <Skeleton width="48%" height={40} borderRadius={BORDERS.radius.md} />
        </View>

        <View style={styles.offersHeader}>
          <Skeleton width={160} height={18} borderRadius={6} />
          <Skeleton width={90} height={14} borderRadius={4} style={{ marginTop: 8 }} />
        </View>

        {[0, 1].map((k) => (
          <View key={k} style={styles.offerCard}>
            <View style={styles.offerTop}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="70%" height={16} borderRadius={6} />
                <Skeleton width="45%" height={12} borderRadius={4} />
              </View>
              <Skeleton width={72} height={22} borderRadius={6} />
            </View>
            <Skeleton width="100%" height={12} borderRadius={4} style={{ marginTop: 14 }} />
            <Skeleton width="88%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
            <View style={styles.offerActions}>
              <Skeleton width="48%" height={44} borderRadius={BORDERS.radius.md} />
              <Skeleton width="48%" height={44} borderRadius={BORDERS.radius.md} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  scrollHost: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web' ? { overflow: 'hidden' } : null),
  },
  scroll: {
    ...(Platform.OS === 'web'
      ? {
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          minHeight: 0,
        }
      : { flex: 1 }),
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: HEADER_CONTENT_HEIGHT,
    paddingHorizontal: SPACING.md,
  },
  headerTitleCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  segmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: SPACING.md,
  },
  offersHeader: {
    marginBottom: SPACING.sm,
  },
  offerCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  offerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  offerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
});

export default DetalleSolicitudSkeleton;
