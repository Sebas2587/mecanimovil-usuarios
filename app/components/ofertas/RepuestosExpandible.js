import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as LEGACY_COLORS, SPACING as LEGACY_SPACING } from '../../utils/constants';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';
import { formatearMontoCLP } from '../../utils/calcularMontoPagoOferta';
import { normalizeRepuestosInfo } from '../../utils/ofertaRepuestos';

/**
 * Componente expandible para mostrar repuestos en una oferta
 */
const RepuestosExpandible = ({
  repuestos,
  servicioNombre,
  /** En comparador el total ya figura en la línea «Repuestos» del desglose */
  showHeaderTotal = true,
  showListTotal = true,
  compact = false,
  coinbase = false,
  headerTitle = null,
}) => {
  const [expandido, setExpandido] = useState(false);

  const repuestosNormalizados = normalizeRepuestosInfo(repuestos);

  if (!repuestosNormalizados || repuestosNormalizados.length === 0) {
    return null;
  }

  const totalRepuestos = repuestosNormalizados.length;
  const totalPrecio = repuestosNormalizados.reduce((sum, rep) => {
    // CORRECCIÓN: Usar precio personalizado del proveedor si existe, sino usar precio_referencia del catálogo
    const precio = parseFloat(rep.precio !== undefined && rep.precio !== null ? rep.precio : (rep.precio_referencia || 0));
    const cantidad = rep.cantidad || 1;
    return sum + (precio * cantidad);
  }, 0);

  const palette = coinbase ? COLORS : LEGACY_COLORS;
  const titleText = headerTitle
    || (compact && !showHeaderTotal ? 'Ver ítems incluidos' : 'Repuestos incluidos');

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        coinbase && styles.containerCoinbase,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.header,
          compact && styles.headerCompact,
          coinbase && styles.headerCoinbase,
          expandido && (coinbase ? styles.headerExpandedCoinbase : styles.headerExpanded),
        ]}
        onPress={() => setExpandido(!expandido)}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            {!coinbase ? (
              <View style={styles.iconContainer}>
                <Ionicons name="construct" size={18} color={palette.primary?.main ?? palette.primary} />
              </View>
            ) : null}
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, coinbase && styles.headerTitleCoinbase]}>
                {titleText}
              </Text>
              <Text style={[styles.headerSubtitle, coinbase && styles.headerSubtitleCoinbase]}>
                {totalRepuestos} {totalRepuestos === 1 ? 'repuesto' : 'repuestos'}
                {servicioNombre ? ` · ${servicioNombre}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {showHeaderTotal && totalPrecio > 0 ? (
              <View style={styles.precioContainer}>
                <Text style={styles.precioLabel}>Total:</Text>
                <Text style={styles.precioTotal}>
                  ${formatearMontoCLP(totalPrecio)}
                </Text>
              </View>
            ) : null}
            <Ionicons
              name={expandido ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={coinbase ? COLORS.text.secondary : (palette.primary?.main ?? palette.primary)}
              style={styles.chevron}
            />
          </View>
        </View>
      </TouchableOpacity>

      {expandido && (
        <View style={[styles.repuestosList, coinbase && styles.repuestosListCoinbase]}>
          {repuestosNormalizados.map((repuesto, index) => {
            const cantidad = repuesto.cantidad || 1;
            const precioUnitario = parseFloat(repuesto.precio !== undefined && repuesto.precio !== null ? repuesto.precio : (repuesto.precio_referencia || 0));
            const subtotal = precioUnitario * cantidad;
            const calidadLabel = repuesto.calidad_repuesto_label || '';
            const marcaDisplay = repuesto.marca_repuesto || repuesto.marca || '';

            return (
              <View
                key={repuesto.id || index}
                style={[styles.repuestoItem, coinbase && styles.repuestoItemCoinbase]}
              >
                <View style={styles.repuestoContent}>
                  <View style={[styles.repuestoInfo, coinbase && styles.repuestoInfoCoinbase]}>
                    <Text
                      style={[styles.repuestoNombre, coinbase && styles.repuestoNombreCoinbase]}
                      numberOfLines={2}
                    >
                      {repuesto.nombre}
                    </Text>
                    <View style={styles.repuestoMetaRow}>
                      {calidadLabel ? (
                        <View
                          style={[
                            styles.calidadBadge,
                            coinbase && styles.calidadBadgeCoinbase,
                          ]}
                        >
                          <Text
                            style={[
                              styles.calidadBadgeText,
                              coinbase && styles.calidadBadgeTextCoinbase,
                            ]}
                          >
                            {calidadLabel}
                          </Text>
                        </View>
                      ) : null}
                      {marcaDisplay ? (
                        <Text
                          style={[styles.repuestoMarca, coinbase && styles.repuestoMarcaCoinbase]}
                          numberOfLines={1}
                        >
                          {marcaDisplay}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.repuestoDetalles}>
                    <View style={styles.detalleRow}>
                      <Text style={[styles.detalleLabel, coinbase && styles.detalleLabelCoinbase]}>
                        Cantidad
                      </Text>
                      <Text style={[styles.detalleValue, coinbase && styles.detalleValueCoinbase]}>
                        {cantidad}
                      </Text>
                    </View>
                    <View style={styles.detalleRow}>
                      <Text style={[styles.detalleLabel, coinbase && styles.detalleLabelCoinbase]}>
                        Precio unitario
                      </Text>
                      <Text style={[styles.detalleValue, coinbase && styles.detalleValueCoinbase]}>
                        ${formatearMontoCLP(precioUnitario)}
                      </Text>
                    </View>
                    <View style={[styles.detalleRow, styles.detalleRowSubtotal, coinbase && styles.detalleRowSubtotalCoinbase]}>
                      <Text style={[styles.detalleLabel, coinbase && styles.detalleLabelCoinbase]}>
                        Subtotal
                      </Text>
                      <Text style={[styles.subtotal, coinbase && styles.subtotalCoinbase]}>
                        ${formatearMontoCLP(subtotal)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
          {showListTotal && totalPrecio > 0 ? (
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total repuestos:</Text>
              <Text style={styles.totalValue}>
                ${formatearMontoCLP(totalPrecio)}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: LEGACY_SPACING.sm,
    marginBottom: LEGACY_SPACING.xs,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E3F2FD',
    backgroundColor: '#FAFBFC',
  },
  containerCompact: {
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 6,
    borderColor: LEGACY_COLORS.borderLight,
    backgroundColor: LEGACY_COLORS.white,
  },
  containerCoinbase: {
    borderRadius: BORDERS.radius.sm,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  headerCompact: {
    backgroundColor: LEGACY_COLORS.white,
    borderBottomWidth: 0,
  },
  headerCoinbase: {
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 0,
  },
  header: {
    backgroundColor: '#F5F7FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E3F2FD',
  },
  headerExpanded: {
    backgroundColor: '#E8F4FD',
    borderBottomWidth: 2,
    borderBottomColor: LEGACY_COLORS.primary,
  },
  headerExpandedCoinbase: {
    backgroundColor: COLORS.neutral.gray[50],
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: LEGACY_SPACING.sm,
    paddingHorizontal: LEGACY_SPACING.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: LEGACY_SPACING.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: LEGACY_COLORS.text,
    marginBottom: 2,
  },
  headerTitleCoinbase: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: LEGACY_COLORS.textLight,
    fontWeight: '500',
  },
  headerSubtitleCoinbase: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LEGACY_SPACING.sm,
  },
  precioContainer: {
    alignItems: 'flex-end',
    marginRight: LEGACY_SPACING.xs,
  },
  precioLabel: {
    fontSize: 10,
    color: LEGACY_COLORS.textLight,
    marginBottom: 2,
  },
  precioTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: LEGACY_COLORS.primary,
  },
  chevron: {
    marginLeft: LEGACY_SPACING.xs,
  },
  repuestosList: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: LEGACY_SPACING.sm,
    paddingVertical: LEGACY_SPACING.xs,
  },
  repuestosListCoinbase: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background.paper,
  },
  repuestoItem: {
    backgroundColor: LEGACY_COLORS.white,
    borderRadius: 8,
    padding: LEGACY_SPACING.md,
    marginBottom: LEGACY_SPACING.sm,
    borderWidth: 1,
    borderColor: LEGACY_COLORS.borderLight,
  },
  repuestoItemCoinbase: {
    borderRadius: BORDERS.radius.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.neutral.gray[50],
  },
  repuestoContent: {
    width: '100%',
  },
  repuestoInfo: {
    marginBottom: LEGACY_SPACING.sm,
    paddingBottom: LEGACY_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: LEGACY_COLORS.borderLight,
  },
  repuestoInfoCoinbase: {
    marginBottom: SPACING.xs,
    paddingBottom: SPACING.xs,
    borderBottomColor: COLORS.border.light,
  },
  repuestoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: LEGACY_COLORS.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  repuestoNombreCoinbase: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  repuestoMarca: {
    fontSize: 12,
    color: LEGACY_COLORS.textLight,
    flexShrink: 1,
  },
  repuestoMarcaCoinbase: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
  },
  repuestoMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 2,
  },
  calidadBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: '#E8F4FD',
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  calidadBadgeCoinbase: {
    backgroundColor: COLORS.neutral.gray[50],
    borderColor: COLORS.border.light,
  },
  calidadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: LEGACY_COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  calidadBadgeTextCoinbase: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  repuestoDetalles: {
    gap: LEGACY_SPACING.xs / 2,
  },
  detalleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detalleRowSubtotal: {
    marginTop: LEGACY_SPACING.xs / 2,
    paddingTop: LEGACY_SPACING.xs / 2,
    borderTopWidth: 1,
    borderTopColor: LEGACY_COLORS.borderLight,
  },
  detalleRowSubtotalCoinbase: {
    borderTopColor: COLORS.border.light,
  },
  detalleLabel: {
    fontSize: 13,
    color: LEGACY_COLORS.textLight,
    fontWeight: '500',
  },
  detalleLabelCoinbase: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  detalleValue: {
    fontSize: 13,
    fontWeight: '600',
    color: LEGACY_COLORS.text,
  },
  detalleValueCoinbase: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    fontVariant: ['tabular-nums'],
  },
  subtotal: {
    fontSize: 14,
    fontWeight: '700',
    color: LEGACY_COLORS.primary,
  },
  subtotalCoinbase: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
  },
  totalContainer: {
    marginTop: LEGACY_SPACING.xs,
    paddingTop: LEGACY_SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: LEGACY_COLORS.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: LEGACY_SPACING.xs,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: LEGACY_COLORS.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: LEGACY_COLORS.primary,
  },
});

export default RepuestosExpandible;

