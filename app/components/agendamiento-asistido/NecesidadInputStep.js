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
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { useNecesidadSpeech } from '../../hooks/useNecesidadSpeech';

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
        <Sparkles size={20} color={COLORS.primary?.main || COLORS.primary} />
        <Text style={styles.title}>¿Qué necesitas?</Text>
      </View>
      <Text style={styles.subtitle}>
        Describe el problema o usa el micrófono. El dictado es local; no guardamos audio en el servidor.
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ej: ruido al frenar, humo blanco..."
          placeholderTextColor={COLORS.text?.disabled || '#9CA3AF'}
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
            <ActivityIndicator size="small" color={COLORS.primary?.main || COLORS.primary} />
          ) : (
            <Mic size={22} color={COLORS.primary?.main || COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      {listening ? (
        <Text style={styles.listeningHint}>Escuchando… toca el micrófono para terminar</Text>
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
        <ActivityIndicator style={styles.loader} color={COLORS.primary?.main || COLORS.primary} />
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
    color: COLORS.text?.primary || '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text?.secondary || '#6B7280',
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
    borderColor: COLORS.border?.light || '#E5E7EB',
    borderRadius: BORDERS.radius?.lg ?? 12,
    padding: 12,
    fontSize: 16,
    color: COLORS.text?.primary || '#111827',
    backgroundColor: COLORS.background?.paper || '#FFFFFF',
    ...SHADOWS.sm,
  },
  micBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background?.subtle || '#F3F4F6',
    borderWidth: 1,
    borderColor: COLORS.border?.light || '#E5E7EB',
  },
  micActive: {
    backgroundColor: COLORS.primary?.light || '#DBEAFE',
  },
  listeningHint: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.primary?.main || COLORS.primary,
    fontWeight: '600',
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
    backgroundColor: COLORS.warning?.light || '#FEF3C7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning?.dark || '#92400E',
  },
  loader: {
    marginTop: 12,
  },
});
