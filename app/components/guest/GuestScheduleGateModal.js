import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarCheck, X } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS, GRADIENTS } from '../../design-system/tokens';
import GuestGradientButton from './GuestGradientButton';

/**
 * Gate de registro al intentar agendar un servicio sin cuenta.
 */
const GuestScheduleGateModal = ({
  visible,
  servicioNombre,
  providerNombre,
  onClose,
  onRegister,
  onLogin,
}) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <X size={20} color={COLORS.text.secondary} />
        </TouchableOpacity>

        <LinearGradient
          colors={GRADIENTS.guestCta}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          <CalendarCheck size={28} color={COLORS.base.white} strokeWidth={2.25} />
        </LinearGradient>

        <Text style={styles.title}>Debes registrarte para agendar este servicio</Text>
        <Text style={styles.subtitle}>
          {servicioNombre ? (
            <>
              <Text style={styles.highlight}>{servicioNombre}</Text>
              {providerNombre ? ` con ${providerNombre}` : ''}
            </>
          ) : (
            'Crea tu cuenta gratis y continúa el agendamiento donde lo dejaste.'
          )}
        </Text>

        <GuestGradientButton title="Crear cuenta gratis" onPress={onRegister} style={styles.primaryBtn} />

        <TouchableOpacity onPress={onLogin} style={styles.secondaryBtn} activeOpacity={0.85}>
          <Text style={styles.secondaryText}>Ya tengo cuenta</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.background.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl + 8 : SPACING.xl,
    paddingTop: SPACING.sm,
    ...SHADOWS.lg,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.border.light,
  },
  closeBtn: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.lg,
    zIndex: 2,
    padding: 4,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: BORDERS.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  highlight: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
  primaryBtn: {
    marginBottom: SPACING.sm,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  secondaryText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[600],
  },
});

export default GuestScheduleGateModal;
