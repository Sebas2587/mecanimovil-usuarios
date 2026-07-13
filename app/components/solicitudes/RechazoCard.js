import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING } from '../../utils/constants';
import { COLORS } from '../../design-system/tokens/colors';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Icon from '../base/Icon/Icon';

/**
 * Card minimalista para mostrar rechazos de proveedores
 */
const RechazoCard = ({ rechazo }) => {
  if (!rechazo) {
    return null;
  }

  return (
    <View style={styles.rechazoCard}>
      {/* Header */}
      <View style={styles.rechazoHeader}>
        <Icon name="close-circle" size={24} color={COLORS.error.main} />
        <Text style={styles.rechazoProveedorNombre} numberOfLines={1}>
          {rechazo.proveedor_nombre || 'Proveedor'}
        </Text>
      </View>

      {/* Motivo */}
      <Text style={styles.rechazoMotivo}>
        {rechazo.motivo_display || rechazo.motivo}
      </Text>

      {/* Detalle (si existe) */}
      {rechazo.detalle_motivo && rechazo.detalle_motivo.trim() && (
        <View style={styles.rechazoDetalleContainer}>
          <Text style={styles.rechazoDetalle}>
            "{rechazo.detalle_motivo}"
          </Text>
        </View>
      )}

      {/* Fecha */}
      <Text style={styles.rechazoFecha}>
        {formatDistanceToNow(new Date(rechazo.fecha_rechazo), {
          addSuffix: true,
          locale: es
        })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  rechazoCard: {
    backgroundColor: COLORS.neutral.gray[50],
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  rechazoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  rechazoProveedorNombre: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  rechazoMotivo: {
    fontSize: 15,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    lineHeight: 22,
  },
  rechazoDetalleContainer: {
    backgroundColor: COLORS.background.paper,
    padding: SPACING.sm,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  rechazoDetalle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  rechazoFecha: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
});

export default RechazoCard;

