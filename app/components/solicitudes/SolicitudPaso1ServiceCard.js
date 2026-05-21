import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle2, Clock, Wrench } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';

/**
 * Card de servicio para grilla 2 columnas (paso 1 nueva solicitud).
 */
export default function SolicitudPaso1ServiceCard({ servicio, selected, onPress, width }) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        width ? { width } : null,
        selected && styles.cardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={servicio.nombre}
    >
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <Wrench size={16} color={selected ? COLORS.primary[600] : COLORS.primary[500]} />
        </View>
        {selected ? (
          <CheckCircle2 size={18} color={COLORS.primary[500]} />
        ) : (
          <View style={styles.checkPlaceholder} />
        )}
      </View>

      <Text style={[styles.nombre, selected && styles.nombreSelected]} numberOfLines={3}>
        {servicio.nombre}
      </Text>

      {servicio.descripcion ? (
        <Text style={styles.descripcion} numberOfLines={3}>
          {servicio.descripcion}
        </Text>
      ) : null}

      {servicio.duracion_estimada || servicio.duracion_estimada_base ? (
        <View style={styles.footer}>
          <View style={styles.duracionRow}>
            <Clock size={11} color={COLORS.text.tertiary} />
            <Text style={styles.duracion} numberOfLines={1}>
              {servicio.duracion_estimada || servicio.duracion_estimada_base}
            </Text>
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 132,
    padding: 12,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  cardSelected: {
    borderColor: COLORS.primary[400],
    backgroundColor: COLORS.primary[50],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkPlaceholder: {
    width: 18,
    height: 18,
  },
  nombre: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    lineHeight: 19,
    marginBottom: 4,
    flex: 1,
  },
  nombreSelected: {
    color: COLORS.primary[800],
  },
  descripcion: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    lineHeight: 16,
    marginBottom: 8,
    flex: 1,
  },
  footer: {
    marginTop: 'auto',
  },
  duracionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  duracion: {
    flex: 1,
    fontSize: 10,
    color: COLORS.text.tertiary,
  },
});
