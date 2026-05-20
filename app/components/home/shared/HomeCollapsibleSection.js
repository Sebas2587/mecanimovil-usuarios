import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS } from '../../../design-system/tokens';

/**
 * Sección colapsable reutilizable (header + cuerpo).
 */
const HomeCollapsibleSection = ({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
  highlightHeader = false,
}) => (
  <View style={styles.wrap}>
    <TouchableOpacity
      style={[styles.header, highlightHeader && styles.headerHighlight]}
      onPress={onToggle}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${title}. ${expanded ? 'Contraer' : 'Expandir'}`}
    >
      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <ChevronDown
        size={20}
        color={COLORS.text.tertiary}
        style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
      />
    </TouchableOpacity>
    {expanded ? <View style={styles.body}>{children}</View> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  headerHighlight: {
    borderColor: COLORS.primary[200],
    backgroundColor: COLORS.primary[50],
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
  body: {
    marginTop: 12,
    gap: 0,
  },
});

export default React.memo(HomeCollapsibleSection);
