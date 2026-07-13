import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '../../design-system/tokens';
import { getKpiTierPresentation } from '../../utils/providerUtils';
import Tag from '../base/Tag/Tag';
import Icon from '../base/Icon/Icon';

/**
 * Etiqueta KPI (Elite / Máster / Pro / En progreso…) — Tag + tokens del design system.
 */
export default function ProviderKpiTierBadge({
  kpiBadge = null,
  provider = null,
  /** En perfil: confiar en kpi_badge del API (como en cards), sin filtrar por contadores del objeto proveedor. */
  trustBadgeFields = false,
  variant = 'floating',
  style,
  iconSize = 12,
}) {
  const presentation = getKpiTierPresentation(kpiBadge, provider, { trustBadgeFields });
  if (!presentation) return null;

  const a11yLabel = presentation.reason
    ? `Nivel ${presentation.label}. ${presentation.reason}`
    : `Nivel ${presentation.label}`;

  const size = variant === 'profile' ? 'md' : 'sm';
  const icon = (
    <Icon name="ribbon-outline" size={iconSize} color={presentation.text_color} />
  );

  const tag = (
    <Tag
      label={presentation.label}
      variant={presentation.tagVariant || 'neutral'}
      size={size}
      icon={icon}
      style={[
        variant === 'inline' ? styles.inline : null,
        variant === 'floating' ? styles.floating : null,
        variant === 'profile' ? styles.profile : null,
        style,
      ]}
    />
  );

  if (variant === 'floating') {
    return (
      <View
        style={styles.floatingWrap}
        pointerEvents="none"
        accessibilityRole="text"
        accessibilityLabel={a11yLabel}
      >
        {tag}
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityRole="text" accessibilityLabel={a11yLabel}>
      {tag}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
  },
  floatingWrap: {
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  floating: {
    maxWidth: '100%',
  },
  inline: {
    flexShrink: 0,
  },
  profile: {
    marginBottom: SPACING.xs,
  },
});
