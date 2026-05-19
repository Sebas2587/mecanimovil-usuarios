import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Alert } from 'react-native';

let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = () => {};

try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Módulo nativo no disponible (web sin build dev)
}

const LOCALE = 'es-CL';

/**
 * STT on-device para el paso de necesidad (sin enviar audio al servidor).
 */
export function useNecesidadSpeech({ onTranscript, onEnd }) {
  const [listening, setListening] = useState(false);
  const baseTextRef = useRef('');
  const onTranscriptRef = useRef(onTranscript);
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onEndRef.current = onEnd;
  }, [onTranscript, onEnd]);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    onEndRef.current?.();
  });
  useSpeechRecognitionEvent('result', (event) => {
    const chunk = event?.results?.[0]?.transcript || '';
    if (!chunk) return;
    const merged = `${baseTextRef.current}${baseTextRef.current ? ' ' : ''}${chunk}`.trim();
    onTranscriptRef.current?.(merged);
    if (event?.isFinal) {
      baseTextRef.current = merged;
    }
  });
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    if (event?.error === 'aborted') return;
    const msg = event?.message || 'No se pudo usar el dictado por voz';
    Alert.alert('Dictado por voz', msg);
  });

  const startListening = useCallback(async (currentText = '') => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Dictado por voz',
        'El dictado está disponible en la app móvil (iOS/Android). En web escribe tu necesidad.'
      );
      return;
    }
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert(
        'Dictado no disponible',
        'Actualiza la app o usa un build de desarrollo con reconocimiento de voz habilitado.'
      );
      return;
    }

    const available = ExpoSpeechRecognitionModule.isRecognitionAvailable?.() ?? true;
    if (!available) {
      Alert.alert('Dictado por voz', 'El reconocimiento de voz no está disponible en este dispositivo.');
      return;
    }

    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm?.granted) {
      Alert.alert(
        'Permiso requerido',
        'Activa micrófono y reconocimiento de voz en ajustes para dictar tu necesidad.'
      );
      return;
    }

    baseTextRef.current = String(currentText || '').trim();

    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: LOCALE,
      interimResults: true,
      continuous: false,
    });
  }, [listening]);

  const stopListening = useCallback(() => {
    if (listening && ExpoSpeechRecognitionModule) {
      ExpoSpeechRecognitionModule.stop();
    }
  }, [listening]);

  useEffect(() => () => {
    try {
      ExpoSpeechRecognitionModule?.abort?.();
    } catch {
      /* noop */
    }
  }, []);

  return { listening, startListening, stopListening, speechAvailable: !!ExpoSpeechRecognitionModule };
}
