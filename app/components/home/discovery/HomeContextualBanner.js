import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ClipboardList, HeartPulse, ChevronRight } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';

function pickBanner({ solicitud, healthScore }) {
  if (solicitud) {
    const titulo =
      solicitud.titulo ||
      solicitud.descripcion_problema?.slice(0, 56) ||
      solicitud.estado_display ||
      'Solicitud en curso';
    return {
      key: 'solicitud',
      tone: 'info',
      Icon: ClipboardList,
      title: 'Solicitud en curso',
      subtitle: titulo,
    };
  }
  if (healthScore != null && healthScore < 60) {
    return {
      key: 'health-critical',
      tone: 'danger',
      Icon: HeartPulse,
      title: 'Tu auto necesita atención',
      subtitle: `Salud ${Math.round(healthScore)}% · Agenda un servicio recomendado`,
    };
  }
  if (healthScore != null && healthScore < 75) {
    return {
      key: 'health-warn',
      tone: 'warning',
      Icon: HeartPulse,
      title: 'Mantenimiento preventivo',
      subtitle: `Salud ${Math.round(healthScore)}% · Anticipa revisiones a tiempo`,
    };
  }
  return null;
}

/** Círculo tonal por severidad — fondo transparente; el color va solo en el trazo. */
const TONE_CONFIG = {
  info: {
    iconBg: 'transparent',
    iconColor: COLORS.primary[600],
  },
  danger: {
    iconBg: 'transparent',
    iconColor: COLORS.error.main,
  },
  warning: {
    iconBg: 'transparent',
    iconColor: COLORS.warning.dark,
  },
};

const HomeContextualBanner = ({
  solicitud,
  healthScore,
  onPressSolicitud,
  onPressHealth,
  onPressAgendar,
}) => {
  const banner = useMemo(
    () => pickBanner({ solicitud, healthScore }),
    [solicitud, healthScore],
  );

  if (!banner) return null;

  const tone = TONE_CONFIG[banner.tone] || TONE_CONFIG.info;
  const { Icon } = banner;

  const onPrimary = () => {
    if (banner.key === 'solicitud') onPressSolicitud?.();
    else onPressAgendar?.();
  };

  const showHealthLink =
    banner.key.startsWith('health') && typeof onPressHealth === 'function';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPrimary}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={banner.title}
    >
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: tone.iconBg }]}>
          <Icon size={20} color={tone.iconColor} strokeWidth={2} fill="none" />
        </View>

        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={2}>
            {banner.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {banner.subtitle}
          </Text>
          {showHealthLink ? (
            <Text
              style={styles.healthLink}
              onPress={onPressHealth}
              suppressHighlighting
              accessibilityRole="link"
              accessibilityLabel="Ver salud del vehículo"
            >
              Ver salud del vehículo
            </Text>
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  healthLink: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[600],
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
  },
});

export default React.memo(HomeContextualBanner);
