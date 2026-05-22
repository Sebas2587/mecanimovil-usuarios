import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BORDERS, TYPOGRAPHY, withOpacity } from '../../design-system/tokens';
import { getKpiTierPresentation } from '../../utils/providerUtils';

/**
 * Insignia KPI (Elite / Máster / Pro / …) alineada con ProviderPreviewCard del home.
 */
export default function ProviderKpiTierBadge({
  kpiBadge = null,
  provider = null,
  /** En perfil: confiar en kpi_badge del API (como en cards), sin filtrar por contadores del objeto proveedor. */
  trustBadgeFields = false,
  variant = 'floating',
  style,
  iconSize = 11,
}) {
  const presentation = getKpiTierPresentation(kpiBadge, provider, { trustBadgeFields });
  if (!presentation) return null;

  if (variant === 'profile') {
    return (
      <View
        style={[
          styles.profile,
          {
            backgroundColor: presentation.bg_color,
            borderColor: presentation.border_color,
          },
          style,
        ]}
        accessibilityRole="text"
        accessibilityLabel={`Nivel ${presentation.label}`}
      >
        <Ionicons name="ribbon-outline" size={15} color={presentation.text_color} />
        <Text style={[styles.profileText, { color: presentation.text_color }]} numberOfLines={1}>
          {presentation.label}
        </Text>
      </View>
    );
  }

  if (variant === 'inline') {
    return (
      <View
        style={[
          styles.inline,
          {
            backgroundColor: presentation.bg_color,
            borderColor: presentation.border_color,
          },
          style,
        ]}
        accessibilityRole="text"
        accessibilityLabel={`Nivel ${presentation.label}`}
      >
        <Ionicons name="ribbon-outline" size={14} color={presentation.text_color} />
        <Text style={[styles.inlineText, { color: presentation.text_color }]} numberOfLines={1}>
          {presentation.label}
        </Text>
      </View>
    );
  }

  const floatBg = withOpacity(presentation.bg_color, 0.95);
  return (
    <View
      style={[styles.floatingWrap, style]}
      pointerEvents="none"
      accessibilityRole="text"
      accessibilityLabel={`Nivel ${presentation.label}`}
    >
      <View
        style={[
          styles.floatingInner,
          {
            backgroundColor: floatBg,
            borderColor: presentation.border_color,
          },
        ]}
      >
        <Ionicons
          name="ribbon-outline"
          size={iconSize}
          color={presentation.text_color}
          style={styles.floatingIcon}
        />
        <Text
          style={[styles.floatingText, { color: presentation.text_color }]}
          numberOfLines={1}
        >
          {presentation.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.full,
    borderWidth: 1,
    marginBottom: 8,
  },
  profileText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  floatingWrap: {
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  floatingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
    borderWidth: 1,
    maxWidth: '100%',
  },
  floatingIcon: {
    marginRight: 4,
  },
  floatingText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.full,
    borderWidth: 1,
    flexShrink: 0,
    maxWidth: '46%',
  },
  inlineText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 0.2,
  },
});
