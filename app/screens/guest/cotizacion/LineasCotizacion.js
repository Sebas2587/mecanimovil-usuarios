import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BORDERS, COLORS, SPACING, TYPOGRAPHY } from '../../../design-system/tokens';
import { formatCLP, formatRangoCLP } from './cotizacionPublicaFormat';

const LineaRow = memo(function LineaRow({ item, wide, last }) {
  const isServicio = item.tipo !== 'Repuesto';
  const qtyLabel = item.unitLabel
    ? `${item.qty} ${item.unitLabel}`
    : String(item.qty);
  const min = Number(item.unitario_min) || 0;
  const max = Number(item.unitario_max) || 0;
  const muestraRango = min > 0 && max > 0 && min !== max;
  const unitarioLabel = muestraRango ? formatRangoCLP(min, max) : formatCLP(item.unitario);
  return (
    <View style={[styles.row, wide && styles.rowWide, !last && styles.rowBorder]}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={3}>{item.nombre}</Text>
          <View style={[styles.badge, isServicio ? styles.badgeServicio : styles.badgeRepuesto]}>
            <Text style={[styles.badgeText, isServicio && styles.badgeServicioText]}>
              {item.tipo}
            </Text>
          </View>
        </View>
        {item.meta ? <Text style={styles.meta}>{item.meta}</Text> : null}
        <Text style={styles.qty}>
          {qtyLabel} × {unitarioLabel}
        </Text>
      </View>
      {wide ? (
        <View style={styles.amounts}>
          <Text style={styles.unit}>{unitarioLabel}</Text>
          <Text style={styles.subtotal}>{formatCLP(item.subtotal)}</Text>
        </View>
      ) : (
        <Text style={styles.subtotal}>{formatCLP(item.subtotal)}</Text>
      )}
    </View>
  );
});

function LineasCotizacionInner({ lineas, wide, titulo, subtitulo }) {
  const renderItem = useCallback(
    (item, idx) => (
      <LineaRow
        key={item.key}
        item={item}
        wide={wide}
        last={idx === lineas.length - 1}
      />
    ),
    [lineas, wide],
  );

  if (!lineas.length) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Detalle</Text>
      <Text style={styles.title} numberOfLines={3}>{titulo || 'Detalle'}</Text>
      {subtitulo ? <Text style={styles.subtitle}>{subtitulo}</Text> : null}
      <View style={styles.rule} />
      {wide ? (
        <View style={styles.headRow}>
          <Text style={[styles.head, styles.headFlex]}>Descripción</Text>
          <Text style={[styles.head, styles.headAmt]}>Unitario</Text>
          <Text style={[styles.head, styles.headAmt]}>Subtotal</Text>
        </View>
      ) : null}
      {lineas.map(renderItem)}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  eyebrow: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: COLORS.text.secondary,
  },
  title: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    lineHeight: 26,
    color: COLORS.text.primary,
  },
  subtitle: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    color: COLORS.text.secondary,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
    marginVertical: SPACING.xs,
  },
  headRow: {
    flexDirection: 'row',
    paddingBottom: SPACING.xs,
  },
  head: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: COLORS.text.secondary,
  },
  headFlex: { flex: 1 },
  headAmt: { width: 88, textAlign: 'right' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  rowWide: {
    alignItems: 'center',
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  name: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
    color: COLORS.text.primary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.sm,
    flexShrink: 0,
  },
  badgeRepuesto: {
    backgroundColor: COLORS.badge.meta.background,
  },
  badgeServicio: {
    backgroundColor: COLORS.selection.background,
  },
  badgeText: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.badge.meta.text,
  },
  badgeServicioText: {
    color: COLORS.selection.text,
  },
  meta: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  qty: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  amounts: {
    flexDirection: 'row',
    width: 176,
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  unit: {
    width: 80,
    textAlign: 'right',
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  subtotal: {
    flexShrink: 0,
    minWidth: 72,
    textAlign: 'right',
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
  },
});

export default memo(LineasCotizacionInner);
