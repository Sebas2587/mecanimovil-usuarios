import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  BORDERS,
  SHADOWS,
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
          <Ionicons name="card-outline" size={22} color={COLORS.warning.dark} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Pago pendiente para cerrar el servicio</Text>
          <Text style={styles.subtitle}>
            El técnico completó el checklist. Ya pagaste los repuestos; para firmar y cerrar el
            servicio debes pagar la mano de obra restante (${formatearMontoCLP(montoSaldo)}).
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.cta} onPress={onPagar} activeOpacity={0.85}>
        <Ionicons name="wallet-outline" size={20} color={COLORS.text.inverse} />
        <Text style={styles.ctaText}>Pagar mano de obra</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.warning,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.warning[200],
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
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
    backgroundColor: COLORS.warning[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  cta: {
    backgroundColor: COLORS.primary[500],
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDERS.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  ctaText: {
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
