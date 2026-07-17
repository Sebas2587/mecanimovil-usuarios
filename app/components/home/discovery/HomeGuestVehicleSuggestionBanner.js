import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Car } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING, SHADOWS } from '../../../design-system/tokens';
import GuestGradientButton from '../../guest/GuestGradientButton';
import BrandIconWell from '../../base/BrandIconWell/BrandIconWell';

/**
 * Modal centrado estilo Airbnb commitment dialog:
 * flota encima del UserPanel con scrim, card blanca y CTAs apilados
 * (Registrar = gradiente Tinder; Ahora no = outline secondary).
 */
const HomeGuestVehicleSuggestionBanner = ({
  visible = false,
  patente,
  marca,
  modelo,
  anio,
  onAdd,
  onDismiss,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  if (!patente) return null;

  const vehicleLabel = [marca, modelo, anio].filter(Boolean).join(' ').trim();
  const cardMaxW = Math.min(440, Math.max(320, windowWidth - 48));

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable
        style={styles.overlay}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      >
        <Pressable
          style={[styles.card, { maxWidth: cardMaxW }]}
          onPress={(e) => e.stopPropagation?.()}
          accessibilityRole="summary"
          accessibilityLabel={`Registrar ${vehicleLabel || 'vehículo'} ${patente}`}
        >
          <BrandIconWell size={48}>
            <Car size={24} strokeWidth={2} />
          </BrandIconWell>

          <Text style={styles.eyebrow}>Consultaste este vehículo</Text>
          <Text style={styles.title}>
            {vehicleLabel || 'Vehículo encontrado'}
          </Text>
          <Text style={styles.body}>
            Agrega{' '}
            <Text style={styles.patente}>{patente}</Text>
            {' '}
            a tu garaje para ver salud, historial y talleres recomendados para tu auto.
          </Text>

          <View style={styles.actions}>
            <GuestGradientButton
              title="Registrar auto"
              onPress={onAdd}
              fullWidth
              style={styles.primaryBtn}
              accessibilityLabel="Registrar auto en el garaje"
            />
            <TouchableOpacity
              onPress={onDismiss}
              style={styles.secondaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Ahora no"
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryText}>Ahora no</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.background.overlay || 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    ...SHADOWS.lg,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 16px 40px rgba(0,0,0,0.18)' }
      : null),
  },
  eyebrow: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    letterSpacing: -0.4,
    marginBottom: SPACING.sm,
  },
  body: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  patente: {
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    letterSpacing: 0.5,
  },
  actions: {
    gap: SPACING.sm,
  },
  primaryBtn: {
    width: '100%',
    alignSelf: 'stretch',
  },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.main || COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  secondaryText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default React.memo(HomeGuestVehicleSuggestionBanner);
