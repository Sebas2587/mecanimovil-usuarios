import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import { especialidadesTecnicoTexto } from '../../utils/solicitudTecnicoPreferido';
import Icon from '../base/Icon/Icon';

/**
 * Fila compacta de técnico preferido (avatar + nombre + especialidad).
 * variant: 'grid' para ServiceSummaryCard, 'inline' para OfferCardDetailed.
 */
export default function TecnicoPreferidoRow({ tecnico, variant = 'grid' }) {
  if (!tecnico?.nombre) return null;

  const especialidades = especialidadesTecnicoTexto(tecnico);
  const modalidad = tecnico.modalidad_display || null;

  if (variant === 'inline') {
    return (
      <View style={styles.inlineRow}>
        {tecnico.foto_url ? (
          <Image source={{ uri: tecnico.foto_url }} style={styles.inlineAvatar} />
        ) : (
          <View style={styles.inlineAvatarPlaceholder}>
            <Icon name="person" size={16} color={COLORS.primary[600]} />
          </View>
        )}
        <View style={styles.inlineInfo}>
          <Text style={styles.inlineLabel}>Técnico asignado</Text>
          <Text style={styles.inlineNombre} numberOfLines={1}>
            {tecnico.nombre}
          </Text>
          {especialidades ? (
            <Text style={styles.inlineSub} numberOfLines={1}>
              {especialidades}
            </Text>
          ) : modalidad ? (
            <Text style={styles.inlineSub} numberOfLines={1}>
              {modalidad}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.gridItem}>
      {tecnico.foto_url ? (
        <Image source={{ uri: tecnico.foto_url }} style={styles.gridAvatar} />
      ) : (
        <View style={styles.gridIconWrap}>
          <Icon name="person-outline" size={18} color={COLORS.text.secondary} />
        </View>
      )}
      <View style={styles.gridInfo}>
        <Text style={styles.gridLabel}>Técnico</Text>
        <Text style={styles.gridValue} numberOfLines={1}>
          {tecnico.nombre}
        </Text>
        {especialidades ? (
          <Text style={styles.gridSub} numberOfLines={2}>
            {especialidades}
          </Text>
        ) : modalidad ? (
          <Text style={styles.gridSub} numberOfLines={1}>
            {modalidad}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gridItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  gridIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: COLORS.background.paper,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  gridAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary[50],
  },
  gridInfo: {
    flex: 1,
    minWidth: 0,
  },
  gridLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  gridSub: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
    lineHeight: 16,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
  },
  inlineAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.secondary,
  },
  inlineAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineInfo: {
    flex: 1,
    minWidth: 0,
  },
  inlineLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  inlineNombre: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  inlineSub: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
});
