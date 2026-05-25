import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClipboardList, HeartPulse, CloudRain } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';
import Button from '../../base/Button/Button';

function pickBanner({ solicitud, healthScore, climateRiskPct, weatherAvailable }) {
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
      primaryCta: 'Ver estado',
    };
  }
  if (healthScore != null && healthScore < 60) {
    return {
      key: 'health-critical',
      tone: 'danger',
      Icon: HeartPulse,
      title: 'Tu auto necesita atención',
      subtitle: `Salud ${Math.round(healthScore)}% · Agenda un servicio recomendado`,
      primaryCta: 'Agendar servicio',
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
    };
  }
  if (healthScore != null && healthScore < 75) {
    return {
      key: 'health-warn',
      tone: 'warning',
      Icon: HeartPulse,
      title: 'Mantenimiento preventivo',
      subtitle: `Salud ${Math.round(healthScore)}% · Anticipa revisiones a tiempo`,
      primaryCta: 'Agendar',
    };
  }
  return null;
}

/** Icono semántico; superficie canvas + borde neutro (Coinbase). */
const TONE_CONFIG = {
  info: {
    iconBg: COLORS.neutral.gray[100],
    iconColor: COLORS.primary[600],
  },
  danger: {
    iconBg: COLORS.neutral.gray[100],
    iconColor: COLORS.error.main,
  },
  warning: {
    iconBg: COLORS.neutral.gray[100],
    iconColor: COLORS.warning.dark,
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

  const tone = TONE_CONFIG[banner.tone] || TONE_CONFIG.info;
  const { Icon } = banner;

  const onPrimary = () => {
    if (banner.key === 'solicitud') onPressSolicitud?.();
    else if (banner.key === 'weather') onPressAgendar?.() || onPressClima?.();
    else onPressAgendar?.();
  };

  const showHealthLink =
    banner.key.startsWith('health') && typeof onPressHealth === 'function';

  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: tone.iconBg }]}>
            <Icon size={20} color={tone.iconColor} strokeWidth={2} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title} numberOfLines={2}>
              {banner.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {banner.subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.primaryBtnWrap}>
          <Button
            title={banner.primaryCta}
            onPress={onPrimary}
            type="primary"
            variant="solid"
            size="md"
            fullWidth
            accessibilityLabel={banner.primaryCta}
          />
        </View>

        {showHealthLink ? (
          <View style={styles.secondaryBtnWrap}>
            <Button
              title="Ver salud del vehículo"
              onPress={onPressHealth}
              type="primary"
              variant="text"
              size="md"
              fullWidth
              accessibilityLabel="Ver salud del vehículo"
            />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  body: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.base * TYPOGRAPHY.lineHeight.tight),
    marginBottom: 4,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: COLORS.text.secondary,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal),
  },
  primaryBtnWrap: {
    marginTop: SPACING.sm,
    width: '100%',
  },
  secondaryBtnWrap: {
    marginTop: SPACING.xxs,
    width: '100%',
  },
});

export default React.memo(HomeContextualBanner);
