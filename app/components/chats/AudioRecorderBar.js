import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { Mic, Square, X } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, withOpacity } from '../../design-system/tokens';

const formatMs = (ms) => {
  const total = Math.floor((ms || 0) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const AudioRecorderBar = ({ onRecorded, onRecordingChange, disabled, variant = 'default' }) => {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 200);
  const [isRecording, setIsRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const isInline = variant === 'inline';
  const activeRef = useRef(false);

  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  const startRecording = useCallback(async () => {
    if (disabled || starting || activeRef.current) return;
    setStarting(true);
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso denegado', 'Se requiere acceso al micrófono para grabar mensajes de voz.');
        return;
      }

      if (Platform.OS !== 'web') {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      }

      // Mostrar UI de grabación de inmediato (el estado nativo puede tardar ~200ms)
      activeRef.current = true;
      setIsRecording(true);

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      console.warn('startRecording failed', e);
      activeRef.current = false;
      setIsRecording(false);
      Alert.alert('Error', 'No se pudo iniciar la grabación.');
    } finally {
      setStarting(false);
    }
  }, [disabled, starting, recorder]);

  const cancelRecording = useCallback(async () => {
    try {
      if (recorder.getStatus?.()?.isRecording || state.isRecording) {
        await recorder.stop();
      }
    } catch (_) {
      // ignore
    }
    activeRef.current = false;
    setIsRecording(false);
  }, [recorder, state.isRecording]);

  const finishRecording = useCallback(async () => {
    try {
      await recorder.stop();
      const status = recorder.getStatus();
      const uri = status?.url;
      activeRef.current = false;
      setIsRecording(false);
      if (uri) {
        onRecorded?.({
          uri,
          type: 'audio',
          name: `voice_${Date.now()}.m4a`,
          mimeType: 'audio/m4a',
        });
      }
    } catch (e) {
      activeRef.current = false;
      setIsRecording(false);
      Alert.alert('Error', 'No se pudo guardar el mensaje de voz.');
    }
  }, [onRecorded, recorder]);

  if (!isRecording) {
    return (
      <TouchableOpacity
        style={[
          isInline ? styles.micBtnInline : styles.micBtn,
          (disabled || starting) && styles.micBtnDisabled,
        ]}
        onPress={startRecording}
        disabled={disabled || starting}
        accessibilityLabel="Grabar mensaje de voz"
      >
        <Mic
          size={isInline ? 16 : 22}
          color={disabled || starting ? COLORS.text.disabled : COLORS.text.secondary}
          strokeWidth={2}
        />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.recordingBar, isInline && styles.recordingBarInline]}>
      <TouchableOpacity onPress={cancelRecording} style={styles.iconBtn} hitSlop={8}>
        <X size={20} color={COLORS.error.main} />
      </TouchableOpacity>
      <View style={styles.dot} />
      <Text style={styles.timer}>{formatMs(state.durationMillis)}</Text>
      <Text style={styles.hint}>Grabando…</Text>
      <TouchableOpacity onPress={finishRecording} style={styles.stopBtn}>
        <Square size={16} color={COLORS.text.onPrimary} fill={COLORS.text.onPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginLeft: 4,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  micBtnInline: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.gray[200],
  },
  micBtnDisabled: {
    opacity: 0.5,
  },
  recordingBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: withOpacity(COLORS.error.main, 0.08),
    borderRadius: 24,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    minHeight: 44,
  },
  recordingBarInline: {
    marginHorizontal: 0,
    marginBottom: 0,
    minHeight: 44,
    paddingVertical: 6,
    width: '100%',
    flex: 1,
  },
  iconBtn: {
    padding: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error.main,
  },
  timer: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
    minWidth: 36,
  },
  hint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    flex: 1,
  },
  stopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AudioRecorderBar;
