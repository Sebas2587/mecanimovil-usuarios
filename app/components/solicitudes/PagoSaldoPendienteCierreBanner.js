import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '../base/Icon/Icon';
import PrimaryGradientFill from '../base/PrimaryGradientFill/PrimaryGradientFill';
import {
  COLORS,
  SPACING,
  BORDERS,
  TYPOGRAPHY,
} from '../../design-system/tokens';
import { formatearMontoCLP } from '../../utils/calcularMontoPagoOferta';

/**
 * Aviso en detalle de solicitud: el técnico cerró el checklist pero el cliente
 * aún debe pagar la mano de obra antes de firmar y cerrar el servicio.
 */
export default function PagoSaldoPendienteCierreBanner({ montoSaldo, onPagar }) {
  if (montoSaldo == null || Number.isNaN(Number(montoSaldo))) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Icon name="card-outline" size={22} color={COLORS.primary[500]} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Pago pendiente para cerrar el servicio</Text>
          <Text style={styles.subtitle}>
            El técnico completó el checklist. Ya pagaste los repuestos; para firmar y cerrar el
            servicio debes pagar la mano de obra restante (${formatearMontoCLP(montoSaldo)}).
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.ctaWrap} onPress={onPagar} activeOpacity={0.85}>
        <PrimaryGradientFill style={styles.cta}>
          <Icon name="wallet-outline" size={20} color={COLORS.text.inverse} />
          <Text style={styles.ctaText}>Pagar mano de obra</Text>
        </PrimaryGradientFill>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  ctaWrap: {
    borderRadius: BORDERS.radius.pill,
    overflow: 'hidden',
  },
  cta: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  ctaText: {
    color: COLORS.text.inverse,
    ...TYPOGRAPHY.styles.bodyBold,
  },
});
