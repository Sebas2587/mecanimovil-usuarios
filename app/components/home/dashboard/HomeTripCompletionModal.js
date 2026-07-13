import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS } from '../../../design-system/tokens';
import { SCREEN_WIDTH } from '../shared/homeLayoutConstants';
import { formatDuration, formatKm } from '../shared/homeFormatters';

const HomeTripCompletionModal = ({
  visible,
  onDismiss,
  onConfirm,
  registering,
  tripKm,
  tripElapsed,
  avgSpeed,
  vehicleLabel,
  projectedOdometer,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
    <View style={[styles.overlay, { justifyContent: 'center' }]}>
      <View style={styles.modal}>
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Check size={32} color={COLORS.success.main} />
          </View>
          <Text style={styles.title}>Viaje completado</Text>
          <Text style={styles.sub}>{vehicleLabel}</Text>

          <View style={styles.stats}>
            <Stat value={tripKm.toFixed(1)} label="km recorridos" />
            <Stat value={formatDuration(tripElapsed)} label="duración" />
            <Stat value={avgSpeed.toFixed(0)} label="km/h prom." />
          </View>

          <Text style={styles.hint}>Nuevo odómetro: {formatKm(projectedOdometer)} km</Text>

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={onConfirm}
            activeOpacity={0.85}
            disabled={registering}
          >
            {registering ? (
              <ActivityIndicator color={COLORS.text.inverse} size="small" />
            ) : (
              <>
                <Check size={18} color={COLORS.text.inverse} />
                <Text style={styles.confirmText}>Registrar kilometraje</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={styles.dismissText}>Descartar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.background.overlay,
  },
  modal: {
    marginHorizontal: 20,
    borderRadius: BORDERS.radius.xl,
    overflow: 'hidden',
    alignSelf: 'center',
    width: SCREEN_WIDTH - 40,
    backgroundColor: COLORS.background.paper,
    ...SHADOWS.lg,
  },
  content: {
    padding: 28,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.success.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontWeight: TYPOGRAPHY.styles.h3.fontWeight,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  sub: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginBottom: 20,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: BORDERS.radius.md,
    minWidth: 92,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  hint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: 20,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: BORDERS.radius.full,
    width: '100%',
    marginBottom: 10,
  },
  confirmText: {
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  dismissBtn: {
    paddingVertical: 10,
  },
  dismissText: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
});

export default React.memo(HomeTripCompletionModal);
