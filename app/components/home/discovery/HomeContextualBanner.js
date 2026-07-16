import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ClipboardList, HeartPulse, ChevronRight } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING, SHADOWS } from '../../../design-system/tokens';
import BrandIconWell from '../../base/BrandIconWell/BrandIconWell';

function pickBanner({ solicitud, healthScore }) {
  if (solicitud) {
    const titulo =
      solicitud.titulo ||
      solicitud.descripcion_problema?.slice(0, 56) ||
      solicitud.estado_display ||
      'Solicitud en curso';
    return {
      key: 'solicitud',
      Icon: ClipboardList,
      title: 'Solicitud en curso',
      subtitle: titulo,
    };
  }
  if (healthScore != null && healthScore < 60) {
    return {
      key: 'health-critical',
      Icon: HeartPulse,
      title: 'Tu auto necesita atención',
      subtitle: `Salud ${Math.round(healthScore)}% · Agenda un servicio recomendado`,
    };
  }
  if (healthScore != null && healthScore < 75) {
    return {
      key: 'health-warn',
      Icon: HeartPulse,
      title: 'Mantenimiento preventivo',
      subtitle: `Salud ${Math.round(healthScore)}% · Anticipa revisiones a tiempo`,
    };
  }
  return null;
}

/**
 * Banner contextual home.
 * Salud → VehicleHealthScreen (toda la card).
 * «Ver salud del vehículo» es solo indicativo, no CTA aparte.
 */
const HomeContextualBanner = ({
  solicitud,
  healthScore,
  onPressSolicitud,
  onPressHealth,
}) => {
  const banner = useMemo(
    () => pickBanner({ solicitud, healthScore }),
    [solicitud, healthScore],
  );

  if (!banner) return null;

  const { Icon } = banner;
  const isHealth = banner.key.startsWith('health');

  const onPrimary = () => {
    if (banner.key === 'solicitud') onPressSolicitud?.();
    else if (isHealth) onPressHealth?.();
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPrimary}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={
        isHealth ? `${banner.title}. Ver salud del vehículo` : banner.title
      }
    >
      <View style={styles.row}>
        <BrandIconWell size={40}>
          <Icon size={20} strokeWidth={2} fill="none" />
        </BrandIconWell>

        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={2}>
            {banner.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {banner.subtitle}
          </Text>
          {isHealth ? (
            <View style={styles.healthHint} pointerEvents="none">
              <Text style={styles.healthHintText}>Ver salud del vehículo</Text>
            </View>
          ) : null}
        </View>

        <ChevronRight size={20} color={COLORS.text.tertiary} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  healthHint: {
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
    borderRadius: BORDERS.radius.full,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.buttonSecondary.background,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.buttonSecondary.border,
  },
  healthHintText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.buttonSecondary.outlineText,
  },
});

export default React.memo(HomeContextualBanner);
