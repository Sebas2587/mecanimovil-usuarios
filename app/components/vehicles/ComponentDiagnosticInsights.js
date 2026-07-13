import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { buildComponentDiagnosticInsights } from '../../utils/componentDiagnosticCopy';

/**
 * Bloques segmentados de diagnóstico (modal salud / agendamiento).
 */
export default function ComponentDiagnosticInsights({ component, prediction = null, title = 'Información' }) {
  const sections = useMemo(
    () => buildComponentDiagnosticInsights(component, prediction),
    [component, prediction],
  );

  if (!sections.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {sections.map((section) => (
        <View key={section.id} style={styles.row}>
          <Text style={styles.rowTitle}>{section.title}</Text>
          <Text style={styles.rowText}>{section.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    gap: 10,
  },
  title: {
    ...TYPOGRAPHY.styles.small,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    gap: 2,
    paddingTop: SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
  },
  rowTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  rowText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
});
