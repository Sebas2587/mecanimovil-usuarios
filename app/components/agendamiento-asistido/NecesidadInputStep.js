import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Mic, Sparkles } from 'lucide-react-native';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { useNecesidadSpeech } from '../../hooks/useNecesidadSpeech';
import { AGENDAMIENTO_THEME as T } from './theme';

/**
 * Paso «¿Qué necesitas?» — texto editable; voz vía STT on-device (sin audio al servidor).
 */
export default function NecesidadInputStep({
  value,
  onChangeText,
  onAnalizar,
  loading = false,
  temperatura,
  urgenciaLabel,
  interpretacion,
  resumenSalud,
  alertasCruce = [],
  errorMessage,
}) {
  const { listening, startListening } = useNecesidadSpeech({
    onTranscript: (text) => onChangeText?.(text),
    onEnd: () => onAnalizar?.(),
  });

  const handleMic = useCallback(() => {
    startListening(value || '');
  }, [startListening, value]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Sparkles size={20} color={T.primary} />
        <Text style={styles.title}>¿Qué necesitas?</Text>
      </View>
      <Text style={styles.subtitle}>
        Describe el problema o usa el micrófono. Al escribir, sugerimos servicios según tu descripción.
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ej: ruido al frenar, humo blanco..."
          placeholderTextColor={T.textDisabled}
          value={value}
          onChangeText={onChangeText}
          onEndEditing={() => onAnalizar?.()}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.micBtn, listening && styles.micActive]}
          onPress={handleMic}
          accessibilityLabel={listening ? 'Detener dictado' : 'Dictar necesidad'}
        >
          {listening ? (
            <ActivityIndicator size="small" color={T.primary} />
          ) : (
            <Mic size={22} color={T.primary} />
          )}
        </TouchableOpacity>
      </View>

      {listening ? (
        <Text style={styles.listeningHint}>Escuchando… toca el micrófono para terminar</Text>
      ) : null}

      {resumenSalud ? (
        <View style={styles.saludBox}>
          <Text style={styles.saludText}>{resumenSalud}</Text>
        </View>
      ) : null}

      {interpretacion ? (
        <View style={styles.interpretacionBox}>
          <Text style={styles.interpretacionText}>{interpretacion}</Text>
        </View>
      ) : null}

      {Array.isArray(alertasCruce) && alertasCruce.length > 0 ? (
        <View style={styles.alertasBox}>
          {alertasCruce.map((msg, idx) => (
            <Text key={`alerta-${idx}`} style={styles.alertaText}>
              • {msg}
            </Text>
          ))}
        </View>
      ) : null}

      {(temperatura != null || urgenciaLabel) && (
        <View style={styles.badgeRow}>
          {urgenciaLabel ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Prioridad: {urgenciaLabel}</Text>
            </View>
          ) : null}
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={T.primary} />
      ) : null}

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: T.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 96,
    borderWidth: BORDERS.width?.thin ?? 1,
    borderColor: T.borderLight,
    borderRadius: BORDERS.radius?.lg ?? 12,
    padding: 12,
    fontSize: 16,
    color: T.textPrimary,
    backgroundColor: T.backgroundPaper,
    ...SHADOWS.sm,
  },
  micBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.backgroundSubtle,
    borderWidth: 1,
    borderColor: T.borderLight,
  },
  micActive: {
    backgroundColor: T.primaryMuted,
  },
  listeningHint: {
    marginTop: 8,
    fontSize: 12,
    color: T.primary,
    fontWeight: '600',
  },
  saludBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: BORDERS.radius?.md ?? 10,
    backgroundColor: T.backgroundSubtle,
    borderWidth: 1,
    borderColor: T.borderLight,
  },
  saludText: {
    fontSize: 13,
    lineHeight: 19,
    color: T.textSecondary,
  },
  interpretacionBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: BORDERS.radius?.md ?? 10,
    backgroundColor: T.primaryLight,
    borderWidth: 1,
    borderColor: T.primaryMuted,
  },
  alertasBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: BORDERS.radius?.md ?? 10,
    backgroundColor: '#FFF7E6',
    borderWidth: 1,
    borderColor: '#F4B00055',
  },
  alertaText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#9E6F00',
    marginBottom: 4,
  },
  interpretacionText: {
    fontSize: 14,
    lineHeight: 20,
    color: T.textPrimary,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius?.full ?? 999,
    backgroundColor: T.warningLight,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.warningDark,
  },
  loader: {
    marginTop: 12,
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: '#CF202F',
  },
});
