import { StyleSheet } from 'react-native';
import { BORDERS, SPACING } from '../../design-system/tokens';

/** Superficies glass más claras — se leen sobre el scrim oscuro. */
export const ONBOARDING_GLASS = {
  surface: 'rgba(255,255,255,0.20)',
  surfaceStrong: 'rgba(255,255,255,0.28)',
  border: 'rgba(255,255,255,0.38)',
  chip: 'rgba(255,255,255,0.16)',
  chipOn: 'rgba(255,255,255,0.32)',
  track: 'rgba(255,255,255,0.22)',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.86)',
  textSoft: 'rgba(255,255,255,0.70)',
  scrimTop: 'rgba(0,0,0,0.40)',
  scrimMid: 'rgba(0,0,0,0.58)',
  scrimBottom: 'rgba(0,0,0,0.86)',
};

export const glassPanel = StyleSheet.create({
  root: {
    width: '100%',
    backgroundColor: ONBOARDING_GLASS.surface,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ONBOARDING_GLASS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  rootTight: {
    width: '100%',
    backgroundColor: ONBOARDING_GLASS.surface,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ONBOARDING_GLASS.border,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  rootCompact: {
    width: '100%',
    backgroundColor: ONBOARDING_GLASS.surface,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ONBOARDING_GLASS.border,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
});
