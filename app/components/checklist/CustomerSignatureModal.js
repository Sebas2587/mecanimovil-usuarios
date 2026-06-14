/**
 * CustomerSignatureModal
 *
 * Modal de firma del cliente para cerrar un servicio en el flujo de
 * "firma diferida del cliente"
 * (change firma-cliente-diferida-checklist).
 *
 * - El técnico ya firmó y el checklist está en `PENDIENTE_FIRMA_CLIENTE`.
 * - El cliente firma desde su propia app y dispara el cierre del servicio.
 *
 * Usa `SignaturePad` (canvas HTML5 en web; `react-native-signature-canvas` en
 * nativo) y opcionalmente captura la ubicación con
 * `expo-location`.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import SignaturePad from '../signature/SignaturePad';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import {
  COLORS,
  SPACING,
  BORDERS,
  SHADOWS,
  TYPOGRAPHY,
} from '../../design-system/tokens';
import checklistService from '../../services/checklistService';
import { showAlert } from '../../utils/platformAlert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CANVAS_HEIGHT = Math.min(Math.round(SCREEN_HEIGHT * 0.45), 380);
const UBICACION_TIMEOUT_MS = 5000;

async function obtenerUbicacionOpcional() {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const loc = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('ubicacion_timeout')), UBICACION_TIMEOUT_MS);
      }),
    ]);

    if (loc?.coords) {
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    }
  } catch (locError) {
    console.warn('No se pudo obtener ubicación para la firma del cliente:', locError);
  }

  return null;
}

const CustomerSignatureModal = ({
  visible,
  onClose,
  instanceId,
  servicioNombre,
  proveedorNombre,
  onSignatureSuccess,
}) => {
  const signatureRef = useRef(null);
  const submitIntentRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [obtainingLocation, setObtainingLocation] = useState(false);

  useEffect(() => {
    if (visible) {
      submitIntentRef.current = false;
      setHasDrawn(false);
      setSubmitting(false);
      setObtainingLocation(false);
      setTimeout(() => {
        try {
          signatureRef.current?.clearSignature();
        } catch (e) {
          /* canvas aún no listo */
        }
      }, 200);
    }
  }, [visible]);

  // Estilos del canvas (alineados al diseño Coinbase-style del usuario).
  const signatureWebStyle = `
    body, html { width: 100%; height: 100%; }
    .m-signature-pad {
      --width: 100%;
      --height: ${CANVAS_HEIGHT}px;
      position: relative;
      font-size: 10px;
      width: var(--width);
      height: var(--height);
      padding: 16px;
      border: 1px dashed ${COLORS.border.light};
      border-radius: 12px;
      background-color: ${COLORS.neutral.gray[100]};
      box-shadow: none;
    }
    .m-signature-pad--body {
      border: none;
      background-color: white;
      border-radius: 8px;
      height: calc(100% - 40px) !important;
    }
    .m-signature-pad--body canvas {
      width: 100% !important;
      height: 100% !important;
      touch-action: none;
    }
    .m-signature-pad--footer {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin: 8px 0 0 0;
      height: 0;
      padding: 0;
      overflow: hidden;
      visibility: hidden;
    }
    .m-signature-pad--footer button {
      display: none !important;
    }
  `;

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setHasDrawn(false);
  };

  const handleBegin = useCallback(() => {
    setHasDrawn(true);
  }, []);

  const handleConfirm = () => {
    if (!hasDrawn) {
      showAlert('Firma vacía', 'Por favor dibuja tu firma antes de confirmar.');
      return;
    }
    if (submitting) return;
    submitIntentRef.current = true;
    signatureRef.current?.readSignature();
  };

  const handleSignatureOK = useCallback(async (signatureBase64) => {
    if (!submitIntentRef.current) {
      return;
    }
    submitIntentRef.current = false;

    if (!signatureBase64) {
      showAlert('Firma vacía', 'No se pudo capturar la firma. Intenta nuevamente.');
      return;
    }

    const firmaCapturada = signatureBase64;
    setSubmitting(true);

    let ubicacion = null;
    if (Platform.OS !== 'web') {
      setObtainingLocation(true);
      ubicacion = await obtenerUbicacionOpcional();
      setObtainingLocation(false);
    }

    try {
      await checklistService.firmarChecklistComoCliente(
        instanceId,
        firmaCapturada,
        ubicacion,
      );

      onSignatureSuccess?.();
      onClose?.();
      showAlert(
        'Servicio confirmado',
        '¡Gracias por tu firma! Tu servicio quedó cerrado correctamente.',
      );
    } catch (error) {
      console.error('Error firmando como cliente:', error);
      showAlert(
        'No se pudo firmar',
        error?.message || 'Ocurrió un error al registrar tu firma. Intenta nuevamente.',
      );
    } finally {
      setSubmitting(false);
      setObtainingLocation(false);
    }
  }, [instanceId, onClose, onSignatureSuccess]);

  const handleSignatureEmpty = useCallback(() => {
    submitIntentRef.current = false;
    setHasDrawn(false);
    showAlert('Firma vacía', 'Por favor dibuja tu firma antes de confirmar.');
  }, []);

  const handleClose = () => {
    if (submitting) return;
    onClose?.();
  };

  // iOS: `formSheet` / `pageSheet` permiten cerrar el modal con un swipe
  // hacia abajo; al firmar, ese gesto se confunde con el trazo y cierra todo.
  // `fullScreen` evita el dismiss interactivo; solo se cierra con ✕ o al
  // terminar el flujo con éxito.
  const modalPresentationStyle =
    Platform.OS === 'web' ? 'overFullScreen' : 'fullScreen';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={modalPresentationStyle}
      transparent={Platform.OS === 'web'}
      onRequestClose={handleClose}
    >
      {/*
        Modal en RN no siempre hereda insets del SafeAreaProvider raíz.
        Provider + SafeAreaView aquí aseguran notch / Dynamic Island / home
        indicator y que el botón cerrar sea alcanzable.
      */}
      <SafeAreaProvider>
        <SafeAreaView
          style={styles.container}
          edges={['top', 'right', 'bottom', 'left']}
        >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.headerBackButton}
            disabled={submitting}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <Ionicons name="close" size={26} color={COLORS.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Firmar servicio</Text>
            {servicioNombre ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {servicioNombre}
              </Text>
            ) : null}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/*
          El lienzo de firma NO debe ir dentro de ScrollView: los gestos
          verticales al dibujar se confunden con scroll y la UI “salta”.
          Solo la tarjeta informativa puede desplazarse si hace falta.
        */}
        <ScrollView
          style={styles.infoScroll}
          contentContainerStyle={styles.infoScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          nestedScrollEnabled={false}
          scrollEventThrottle={16}
        >
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrap}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={COLORS.primary[500]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Confirma que el servicio se realizó</Text>
              <Text style={styles.infoBody}>
                {proveedorNombre
                  ? `${proveedorNombre} ya cerró el checklist y firmó como técnico responsable. `
                  : 'El técnico ya cerró el checklist y firmó. '}
                Tu firma cierra el servicio y deja un registro de conformidad.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.signatureSection}>
          <View style={styles.canvasWrapper}>
            <Text style={styles.canvasHint}>Dibuja tu firma dentro del recuadro</Text>
            <View style={styles.canvasContainer}>
              <SignaturePad
                ref={signatureRef}
                onOK={handleSignatureOK}
                onEmpty={handleSignatureEmpty}
                onBegin={handleBegin}
                webStyle={signatureWebStyle}
                height={CANVAS_HEIGHT}
                style={styles.signatureWebView}
              />
            </View>

            <View style={styles.canvasActionsRow}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClear}
                disabled={submitting}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color={COLORS.text.secondary}
                />
                <Text style={styles.clearButtonText}>Limpiar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!hasDrawn || submitting) && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!hasDrawn || submitting}
          >
            {submitting ? (
              <View style={styles.confirmRow}>
                <ActivityIndicator size="small" color={COLORS.text.inverse} />
                <Text style={styles.confirmText}>
                  {obtainingLocation ? 'Obteniendo ubicación…' : 'Enviando firma…'}
                </Text>
              </View>
            ) : (
              <View style={styles.confirmRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={COLORS.text.inverse}
                />
                <Text style={styles.confirmText}>Confirmar y cerrar servicio</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    backgroundColor: COLORS.background.default,
  },
  headerBackButton: {
    padding: SPACING.xs,
    minWidth: 32,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  infoScroll: {
    flex: 1,
    flexGrow: 1,
  },
  infoScrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    flexGrow: 1,
  },
  signatureSection: {
    flexShrink: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.default,
  },
  signatureWebView: {
    width: '100%',
    height: CANVAS_HEIGHT,
    backgroundColor: COLORS.neutral.white,
  },
  infoCard: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
    marginBottom: SPACING.lg,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background.info,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  infoBody: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  canvasWrapper: {
    backgroundColor: COLORS.background.default,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  canvasHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  canvasContainer: {
    height: CANVAS_HEIGHT,
    overflow: 'hidden',
    borderRadius: BORDERS.radius.md,
  },
  canvasActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[100],
  },
  clearButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.default,
  },
  confirmButton: {
    backgroundColor: COLORS.primary[500],
    paddingVertical: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.neutral.gray[300],
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  confirmText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
});

export default CustomerSignatureModal;
