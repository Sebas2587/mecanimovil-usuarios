import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { CloudRain, Disc, Wind, Zap, Droplets } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS } from '../../../design-system/tokens';
import { riskColorForLevel } from './riskColorMap';

const HomeWeatherDetailModal = ({
  visible,
  onClose,
  available,
  weatherCity,
  weatherCondition,
  weatherTemp,
  weatherHumidity,
  weatherAgeLabel,
  weatherComponents = [],
  aiInsight,
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.content}>
          <View style={styles.header}>
            <CloudRain size={32} color={COLORS.primary[500]} />
            <Text style={styles.title}>Análisis climático para conducir</Text>
            {available ? (
              <Text style={styles.subtitle}>
                {weatherCity} · {weatherCondition} · {weatherTemp != null ? `${weatherTemp}°C` : '—'}{' '}
                · Humedad {weatherHumidity ?? '—'}%
                {weatherAgeLabel ? `\nReporte: ${weatherAgeLabel}` : ''}
              </Text>
            ) : null}
          </View>

          <View style={styles.wearBlock}>
            {weatherComponents.map((comp) => {
              const lvl = comp.risk_level || 'optimo';
              const lvlColor = riskColorForLevel(lvl);
              const iconMap = {
                frenos: <Disc size={18} color={lvlColor} />,
                neumaticos: <Wind size={18} color={lvlColor} />,
                bateria: <Zap size={18} color={lvlColor} />,
                refrigerante: <Droplets size={18} color={lvlColor} />,
              };
              const riskPct = comp.driving_risk ?? comp.wear_increase ?? 0;
              return (
                <View key={comp.type} style={styles.wearRow}>
                  {iconMap[comp.type] || <Disc size={18} color={COLORS.text.tertiary} />}
                  <View style={styles.wearMain}>
                    <View style={styles.wearTitleRow}>
                      <Text style={styles.wearTitle}>{comp.name}</Text>
                      {comp.salud_actual != null ? (
                        <Text style={[styles.wearHealth, { color: lvlColor }]}>
                          Salud {comp.salud_actual}%
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${Math.min(riskPct, 100)}%`, backgroundColor: lvlColor },
                        ]}
                      />
                    </View>
                    <Text style={styles.wearReason} numberOfLines={2}>
                      {comp.risk_label || comp.reason}
                    </Text>
                  </View>
                  <View style={styles.wearPctCol}>
                    <Text style={[styles.wearPct, { color: lvlColor }]}>{riskPct}%</Text>
                    {comp.wear_increase > 0 ? (
                      <Text style={styles.wearBoost}>+{comp.wear_increase}% clima</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.tipsBox}>
            <Zap size={18} color={COLORS.success.main} />
            <Text style={styles.tipsText}>{aiInsight || 'Condiciones óptimas para conducir.'}</Text>
          </View>

          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,11,13,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    overflow: 'hidden',
    maxHeight: '78%',
    backgroundColor: COLORS.background.paper,
    ...SHADOWS.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.gray[300],
    marginTop: 10,
    marginBottom: 4,
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 28,
    paddingTop: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontWeight: TYPOGRAPHY.styles.h3.fontWeight,
    color: COLORS.text.primary,
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 6,
    textAlign: 'center',
  },
  wearBlock: {
    gap: 16,
    marginBottom: 20,
  },
  wearRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wearMain: {
    flex: 1,
    marginLeft: 10,
  },
  wearTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  wearTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  wearHealth: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginLeft: 6,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.neutral.gray[200],
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  wearReason: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 3,
  },
  wearPctCol: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  wearPct: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  wearBoost: {
    color: COLORS.warning.main,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  tipsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.success.light,
    borderWidth: 1,
    borderColor: COLORS.success.main,
    marginBottom: 20,
  },
  tipsText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: COLORS.primary[500],
    borderRadius: BORDERS.radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
});

export default React.memo(HomeWeatherDetailModal);
