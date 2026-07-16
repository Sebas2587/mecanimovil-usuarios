import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Package, Wrench } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';
import SegmentedControl from '../base/SegmentedControl/SegmentedControl';

/**
 * Con / sin repuestos — mismo patrón Airbnb que SegmentedControl
 * (selected: paper + orange; sin track gris; no CTA gradient).
 */
export default function SolicitudRepuestosToggle({
  value = true,
  onChange,
  disabled = false,
  catalogoFijo = false,
  fijoConRepuestos = true,
  compact = false,
}) {
  const conRepuestos = value !== false;

  const segments = useMemo(
    () => [
      {
        id: 'con',
        label: compact ? 'Con rep.' : 'Con repuestos',
        Icon: Package,
      },
      {
        id: 'sin',
        label: compact ? 'M. de obra' : 'Solo mano de obra',
        Icon: Wrench,
      },
    ],
    [compact],
  );

  if (catalogoFijo) {
    const conRep = fijoConRepuestos;
    return (
      <View style={[styles.wrap, compact && styles.wrapCompact]}>
        {!compact ? <Text style={styles.label}>Repuestos</Text> : null}
        <View style={styles.fijoChip}>
          {conRep ? (
            <Package size={15} color={COLORS.tab.selectedText} strokeWidth={2} />
          ) : (
            <Wrench size={15} color={COLORS.tab.selectedText} strokeWidth={2} />
          )}
          <Text style={styles.fijoText}>
            {conRep ? 'Con repuestos (catálogo)' : 'Solo mano de obra (catálogo)'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]} pointerEvents={disabled ? 'none' : 'auto'}>
      {!compact ? <Text style={styles.label}>¿Incluir repuestos?</Text> : null}
      <SegmentedControl
        segments={segments}
        value={conRepuestos ? 'con' : 'sin'}
        onChange={(id) => {
          if (disabled) return;
          onChange?.(id === 'con');
        }}
        style={styles.control}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.md,
  },
  wrapCompact: {
    marginBottom: 6,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  control: {
    alignSelf: 'stretch',
  },
  fijoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: 999,
    backgroundColor: COLORS.tab.selectedBg,
    borderWidth: 1,
    borderColor: COLORS.tab.selectedBorder,
  },
  fijoText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.tab.selectedText,
  },
});
