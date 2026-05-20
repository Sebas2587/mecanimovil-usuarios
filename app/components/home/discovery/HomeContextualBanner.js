import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ClipboardList, HeartPulse, CloudRain, ChevronRight } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';

function pickBanner({ solicitud, healthScore, climateRiskPct, weatherAvailable }) {
  if (solicitud) {
    const titulo =
      solicitud.titulo ||
      solicitud.descripcion_problema?.slice(0, 48) ||
      solicitud.estado_display ||
      'Solicitud en curso';
    return {
      key: 'solicitud',
      tone: 'info',
      Icon: ClipboardList,
      title: 'Solicitud en curso',
      subtitle: titulo,
      primaryCta: 'Ver estado',
      secondaryCta: null,
    };
  }
  if (healthScore != null && healthScore < 60) {
    return {
      key: 'health-critical',
      tone: 'danger',
      Icon: HeartPulse,
      title: 'Tu auto necesita atención',
      subtitle: `Salud ${Math.round(healthScore)}% · Agenda un servicio recomendado`,
      primaryCta: 'Agendar',
      secondaryCta: null,
    };
  }
  if (weatherAvailable && climateRiskPct != null && climateRiskPct >= 65) {
    return {
      key: 'weather',
      tone: 'warning',
      Icon: CloudRain,
      title: 'Riesgo climático elevado',
      subtitle: `Desgaste ${climateRiskPct}% · Revisa frenos y neumáticos`,
      primaryCta: 'Agendar revisión',
      secondaryCta: null,
    };
  }
  if (healthScore != null && healthScore < 75) {
    return {
      key: 'health-warn',
      tone: 'warning',
      Icon: HeartPulse,
      title: 'Mantenimiento preventivo',
      subtitle: `Salud ${Math.round(healthScore)}% · Anticipa revisiones`,
      primaryCta: 'Agendar',
      secondaryCta: null,
    };
  }
  return null;
}

const TONE_STYLES = {
  info: {
    bg: COLORS.primary[50],
    border: COLORS.primary[200],
    title: COLORS.primary[700],
    cta: COLORS.primary[600],
  },
  danger: {
    bg: COLORS.error.light,
    border: COLORS.error.main,
    title: COLORS.error.dark,
    cta: COLORS.error.main,
  },
  warning: {
    bg: COLORS.warning.light,
    border: COLORS.warning.main,
    title: COLORS.warning.dark,
    cta: COLORS.warning.dark,
  },
};

const HomeContextualBanner = ({
  solicitud,
  healthScore,
  climateRiskPct,
  weatherAvailable,
  onPressSolicitud,
  onPressHealth,
  onPressClima,
  onPressAgendar,
}) => {
  const banner = useMemo(
    () => pickBanner({ solicitud, healthScore, climateRiskPct, weatherAvailable }),
    [solicitud, healthScore, climateRiskPct, weatherAvailable],
  );

  if (!banner) return null;

  const tone = TONE_STYLES[banner.tone] || TONE_STYLES.info;
  const { Icon } = banner;

  const onPrimary = () => {
    if (banner.key === 'solicitud') onPressSolicitud?.();
    else if (banner.key === 'weather') onPressAgendar?.() || onPressClima?.();
    else onPressAgendar?.();
  };

  const onSecondary = () => {
    if (banner.key.startsWith('health')) onPressHealth?.();
  };

  return (
    <View style={[styles.card, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={styles.iconWrap}>
        <Icon size={22} color={tone.cta} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: tone.title }]} numberOfLines={1}>
          {banner.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {banner.subtitle}
        </Text>
      </View>
      <View style={styles.actions}>
        {banner.secondaryCta ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onSecondary} activeOpacity={0.85}>
            <Text style={[styles.secondaryText, { color: tone.cta }]}>{banner.secondaryCta}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.primaryBtn, { borderColor: tone.cta }]} onPress={onPrimary} activeOpacity={0.85}>
          <Text style={[styles.primaryText, { color: tone.cta }]}>{banner.primaryCta}</Text>
          <ChevronRight size={14} color={tone.cta} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginBottom: 16,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  actions: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BORDERS.radius.full,
    borderWidth: 1.5,
    backgroundColor: COLORS.background.paper,
  },
  primaryText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  secondaryBtn: {
    paddingVertical: 2,
  },
  secondaryText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default React.memo(HomeContextualBanner);
