import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ClipboardList } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';
import Button from '../../base/Button/Button';

/**
 * Banner persistente: hay un informe de taller pendiente de vincular
 * (p. ej. el usuario canceló el registro del vehículo).
 * No se borra con "Después": el claim solo se limpia al vincular o al descartar.
 */
const HomePendingInformeClaimBanner = ({
  patente,
  marca,
  modelo,
  anio,
  onRegister,
  onViewInforme,
  onDismiss,
}) => {
  if (!onRegister) return null;

  const vehicleLabel = [marca, modelo, anio].filter(Boolean).join(' ').trim();
  const plate = patente ? String(patente).toUpperCase().trim() : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <ClipboardList size={20} color={COLORS.brand.magenta} strokeWidth={2} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Servicio por vincular</Text>
        <Text style={styles.subtitle}>
          {plate
            ? `Registra ${vehicleLabel ? `${vehicleLabel} · ` : ''}${plate} para ver el checklist del taller en tu garaje.`
            : 'Tienes un informe de servicio listo. Registra el vehículo para vincularlo.'}
        </Text>
        <View style={styles.actions}>
          <Button
            title="Registrar auto"
            onPress={onRegister}
            type="primary"
            variant="solid"
            size="sm"
          />
          {onViewInforme ? (
            <TouchableOpacity
              onPress={onViewInforme}
              style={styles.linkBtn}
              accessibilityRole="button"
              accessibilityLabel="Ver informe"
              activeOpacity={0.85}
            >
              <Text style={styles.linkText}>Ver informe</Text>
            </TouchableOpacity>
          ) : null}
          {onDismiss ? (
            <TouchableOpacity
              onPress={onDismiss}
              style={styles.linkBtn}
              accessibilityRole="button"
              accessibilityLabel="Descartar aviso"
              activeOpacity={0.85}
            >
              <Text style={styles.dismissText}>Descartar</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginHorizontal: SPACING.container.horizontal,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.selection?.border || COLORS.border.light || COLORS.border.main,
    backgroundColor: COLORS.selection?.background || COLORS.base?.soft || COLORS.background.paper,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  linkBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  linkText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.brand.magenta,
  },
  dismissText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
});

export default React.memo(HomePendingInformeClaimBanner);
