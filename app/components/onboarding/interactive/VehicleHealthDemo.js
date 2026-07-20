import React, { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Activity } from 'lucide-react-native';
import { BORDERS, SPACING, TYPOGRAPHY, COLORS } from '../../../design-system/tokens';
import { HEALTH_METRICS } from '../onboardingSlides';
import { ONBOARDING_GLASS, glassPanel } from '../onboardingTheme';

const webCursor = Platform.OS === 'web' ? { cursor: 'pointer' } : null;

function toneColor(tone) {
  if (tone === 'good') return '#5DDBA5';
  if (tone === 'warn') return COLORS.brand.orange;
  return '#FF8FB8';
}

function toneLabel(tone) {
  if (tone === 'good') return 'OK';
  if (tone === 'warn') return 'Revisar';
  return 'Atención';
}

const MetricCell = React.memo(function MetricCell({ metric, selected, onPress }) {
  const color = toneColor(metric.tone);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${metric.label}, ${metric.value} por ciento`}
      style={({ pressed }) => [
        styles.cell,
        selected && styles.cellSelected,
        pressed && styles.pressed,
        webCursor,
      ]}
    >
      <Text style={[styles.cellLabel, selected && styles.cellLabelOn]} numberOfLines={1}>
        {metric.label}
      </Text>
      <Text style={[styles.cellValue, { color }]}>{metric.value}%</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { backgroundColor: color, width: `${metric.value}%` }]} />
      </View>
    </Pressable>
  );
});

/**
 * Demo 2×2 estático — sin Animated (cero costo en transición de slides).
 */
const VehicleHealthDemo = () => {
  const [selectedId, setSelectedId] = useState(HEALTH_METRICS[0].id);

  const select = useCallback((id) => {
    setSelectedId(id);
  }, []);

  const selected = HEALTH_METRICS.find((m) => m.id === selectedId) || HEALTH_METRICS[0];
  const color = toneColor(selected.tone);

  return (
    <View style={glassPanel.rootCompact} accessibilityRole="summary">
      <View style={styles.header}>
        <View style={styles.iconWell}>
          <Activity size={14} color={COLORS.brand.orange} strokeWidth={2} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          Salud de tu auto
        </Text>
        <Text style={[styles.status, { color }]} numberOfLines={1}>
          {selected.label}: {toneLabel(selected.tone)}
        </Text>
      </View>

      <View style={styles.grid}>
        {HEALTH_METRICS.map((m) => (
          <View key={m.id} style={styles.gridItem}>
            <MetricCell
              metric={m}
              selected={m.id === selectedId}
              onPress={() => select(m.id)}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    minWidth: 0,
  },
  iconWell: {
    width: 28,
    height: 28,
    borderRadius: BORDERS.radius.full,
    backgroundColor: ONBOARDING_GLASS.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    ...TYPOGRAPHY.styles.captionBold,
    color: ONBOARDING_GLASS.text,
    flexShrink: 1,
  },
  status: {
    ...TYPOGRAPHY.styles.caption,
    marginLeft: 'auto',
    flexShrink: 1,
    textAlign: 'right',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  gridItem: {
    flexBasis: '47%',
    flexGrow: 1,
    maxWidth: '49%',
    minWidth: 0,
  },
  cell: {
    borderRadius: BORDERS.radius.md,
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    gap: 4,
    minHeight: 64,
  },
  cellSelected: {
    backgroundColor: ONBOARDING_GLASS.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ONBOARDING_GLASS.border,
  },
  pressed: {
    opacity: 0.88,
  },
  cellLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: ONBOARDING_GLASS.textSoft,
  },
  cellLabelOn: {
    color: ONBOARDING_GLASS.text,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
  },
  cellValue: {
    ...TYPOGRAPHY.styles.captionBold,
    fontSize: 16,
  },
  track: {
    height: 4,
    borderRadius: 999,
    backgroundColor: ONBOARDING_GLASS.track,
    overflow: 'hidden',
    marginTop: 2,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});

export default React.memo(VehicleHealthDemo);
