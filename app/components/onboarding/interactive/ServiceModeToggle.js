import React, { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MapPin, Store } from 'lucide-react-native';
import { BORDERS, SPACING, TYPOGRAPHY, COLORS } from '../../../design-system/tokens';
import { SERVICE_MODES } from '../onboardingSlides';
import { ONBOARDING_GLASS, glassPanel } from '../onboardingTheme';

const webCursor = Platform.OS === 'web' ? { cursor: 'pointer' } : null;

/**
 * Demo glass: toggle taller ↔ domicilio (sin auto-hint ni preview).
 */
const ServiceModeToggle = ({ modeId: controlledMode, onModeChange }) => {
  const [internalMode, setInternalMode] = useState(controlledMode || 'taller');
  const modeId = controlledMode ?? internalMode;
  const mode = SERVICE_MODES.find((m) => m.id === modeId) || SERVICE_MODES[0];

  const setMode = useCallback(
    (id) => {
      if (id === modeId) return;
      if (controlledMode == null) setInternalMode(id);
      onModeChange?.(id);
    },
    [controlledMode, modeId, onModeChange],
  );

  return (
    <View style={glassPanel.rootTight}>
      <View style={styles.segment}>
        {SERVICE_MODES.map((m) => {
          const on = m.id === modeId;
          const Icon = m.id === 'taller' ? Store : MapPin;
          return (
            <Pressable
              key={m.id}
              onPress={() => setMode(m.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={m.label}
              style={({ pressed }) => [
                styles.segBtn,
                on && styles.segBtnOn,
                pressed && styles.pressed,
                webCursor,
              ]}
            >
              <Icon
                size={16}
                color={on ? COLORS.brand.orange : ONBOARDING_GLASS.textSoft}
                strokeWidth={2}
              />
              <Text style={[styles.segLabel, on && styles.segLabelOn]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hint}>{mode.hint}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: BORDERS.radius.full,
    padding: 4,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    minWidth: 0,
    borderRadius: BORDERS.radius.full,
    paddingHorizontal: SPACING.sm,
  },
  segBtnOn: {
    backgroundColor: ONBOARDING_GLASS.surfaceStrong,
  },
  pressed: {
    opacity: 0.88,
  },
  segLabel: {
    ...TYPOGRAPHY.styles.captionBold,
    color: ONBOARDING_GLASS.textSoft,
    flexShrink: 1,
  },
  segLabelOn: {
    color: ONBOARDING_GLASS.text,
  },
  hint: {
    ...TYPOGRAPHY.styles.caption,
    color: ONBOARDING_GLASS.textMuted,
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
    paddingBottom: 2,
    fontSize: 12,
  },
});

export default React.memo(ServiceModeToggle);
