import React, { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check, Wrench } from 'lucide-react-native';
import { BORDERS, SPACING, TYPOGRAPHY, COLORS } from '../../../design-system/tokens';
import { BRAND_CHIPS } from '../onboardingSlides';
import { ONBOARDING_GLASS, glassPanel } from '../onboardingTheme';

const webCursor = Platform.OS === 'web' ? { cursor: 'pointer' } : null;

/**
 * Demo compacto de marcas — sin loops de animación (ahorra CPU).
 */
const BrandPickerDemo = () => {
  const [selected, setSelected] = useState(() => new Set(['toyota']));

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const count = selected.size;

  return (
    <View style={glassPanel.rootCompact} accessibilityRole="summary">
      <View style={styles.header}>
        <View style={styles.iconWell}>
          <Wrench size={14} color={COLORS.brand.orange} strokeWidth={2} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          Especialistas por marca
        </Text>
      </View>

      <View style={styles.chips}>
        {BRAND_CHIPS.map((brand) => {
          const isOn = selected.has(brand.id);
          return (
            <Pressable
              key={brand.id}
              onPress={() => toggle(brand.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isOn }}
              accessibilityLabel={`Marca ${brand.label}`}
              style={({ pressed }) => [
                styles.chip,
                isOn && styles.chipOn,
                pressed && styles.chipPressed,
                webCursor,
              ]}
            >
              {isOn ? (
                <Check size={12} color={COLORS.brand.orange} strokeWidth={2.5} />
              ) : null}
              <Text style={[styles.chipLabel, isOn && styles.chipLabelOn]} numberOfLines={1}>
                {brand.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.result}>
        <Text style={styles.resultText} numberOfLines={1}>
          {count} taller{count === 1 ? '' : 'es'} cerca · listos para agendar
        </Text>
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BORDERS.radius.full,
    backgroundColor: ONBOARDING_GLASS.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    minHeight: 32,
    maxWidth: '100%',
  },
  chipOn: {
    backgroundColor: ONBOARDING_GLASS.chipOn,
    borderColor: COLORS.brand.orange,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipLabel: {
    ...TYPOGRAPHY.styles.caption,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    color: ONBOARDING_GLASS.textMuted,
    fontSize: 12,
  },
  chipLabelOn: {
    color: ONBOARDING_GLASS.text,
  },
  result: {
    backgroundColor: ONBOARDING_GLASS.surfaceStrong,
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
  },
  resultText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: '#FFB4D0',
    fontSize: 12,
  },
});

export default React.memo(BrandPickerDemo);
