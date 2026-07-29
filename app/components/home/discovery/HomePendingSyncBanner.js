import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING, withOpacity } from '../../../design-system/tokens';
import Button from '../../base/Button/Button';

/**
 * Banner para UserPanelScreen cuando un vehículo en el garaje
 * tiene informes de servicio realizados en taller pendientes de sincronizar.
 */
const HomePendingSyncBanner = ({
  patente,
  count = 1,
  syncing = false,
  onSync,
  onDismiss,
}) => {
  if (!onSync || count <= 0) return null;

  const plate = patente ? String(patente).toUpperCase().trim() : '';
  const title = count > 1 ? `${count} servicios de taller sin sincronizar` : 'Servicio de taller sin sincronizar';

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <RefreshCw size={20} color={COLORS.brand.orange} strokeWidth={2} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Encontramos {count} {count > 1 ? 'registros realizados' : 'registro realizado'} en taller para el vehículo {plate ? `(${plate})` : ''}. Sincroniza ahora para actualizar su salud e historial oficial.
        </Text>
        <View style={styles.actions}>
          <Button
            title={syncing ? 'Sincronizando…' : `Sincronizar ${count > 1 ? 'servicios' : 'servicio'}`}
            onPress={onSync}
            disabled={syncing}
            loading={syncing}
            type="primary"
            variant="solid"
            size="sm"
          />
          {onDismiss && !syncing ? (
            <TouchableOpacity
              onPress={onDismiss}
              style={styles.linkBtn}
              accessibilityRole="button"
              accessibilityLabel="Ocultar aviso"
              activeOpacity={0.85}
            >
              <Text style={styles.dismissText}>Más tarde</Text>
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
    borderColor: withOpacity(COLORS.brand.orange, 0.3),
    backgroundColor: withOpacity(COLORS.brand.orange, 0.06),
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
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
  dismissText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
});

export default React.memo(HomePendingSyncBanner);
