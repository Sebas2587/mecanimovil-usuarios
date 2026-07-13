import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Globe, Wrench } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';

/**
 * Resumen de cobertura especialista + multimarca en paso 1.
 */
export default function SolicitudPaso1CoberturaHint({ mensaje, cobertura }) {
  if (!mensaje) return null;

  const tieneMm = (cobertura?.conMultimarca ?? 0) > 0;
  const tieneEsp = (cobertura?.soloEspecialista ?? 0) > 0 || (cobertura?.conAmbosTipos ?? 0) > 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.badges}>
        {tieneEsp ? (
          <View style={styles.badge}>
            <Wrench size={14} color={COLORS.primary[600]} />
            <Text style={styles.badgeText}>Especialistas</Text>
          </View>
        ) : null}
        {tieneMm ? (
          <View style={[styles.badge, styles.badgeMm]}>
            <Globe size={14} color={COLORS.warning?.main ?? COLORS.primary[600]} />
            <Text style={styles.badgeText}>Multimarca</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.mensaje}>{mensaje}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: COLORS.primary[50],
  },
  badgeMm: {
    backgroundColor: COLORS.warning.light,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  mensaje: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    color: COLORS.text.secondary,
  },
});
