import React from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS } from '../../../design-system/tokens';

/**
 * CTA principal del home: abre agendamiento asistido (IA + comparador de proveedores).
 */
const HomeAgendamientoRapidoButton = ({
  onPress,
  disabled = false,
  title = 'Agendamiento rápido',
  subtitle = 'Crea una solicitud y elige servicio, ubicación y fecha',
}) => (
  <TouchableOpacity
    style={[styles.btn, disabled && styles.btnDisabled]}
    onPress={onPress}
    activeOpacity={0.88}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
    <View style={styles.iconWrap}>
      <Sparkles size={22} color={COLORS.primary[600]} />
    </View>
    <View style={styles.textCol}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitle}
      </Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary[200],
    ...SHADOWS.sm,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary[800],
    marginBottom: 2,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
});

export default React.memo(HomeAgendamientoRapidoButton);
