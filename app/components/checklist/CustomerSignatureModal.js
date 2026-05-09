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
 * Internamente usa `react-native-signature-canvas` (misma librería que la
 * app del proveedor) y opcionalmente captura la ubicación con
 * `expo-location`.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  BORDERS,
  SHADOWS,
  TYPOGRAPHY,
} from '../../design-system/tokens';
import checklistService from '../../services/checklistService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CANVAS_HEIGHT = Math.min(Math.round(SCREEN_HEIGHT * 0.45), 380);

const CustomerSignatureModal = ({
  visible,
  onClose,
  instanceId,
  servicioNombre,
  proveedorNombre,
  onSignatureSuccess,
}) => {
  const signatureRef = useRef(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [obtainingLocation, setObtainingLocation] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  useEffect(() => {
    if (visible) {
      setHasDrawn(false);
      setSubmitting(false);
      setObtainingLocation(false);
      setPendingSubmit(false);
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

  const handleBegin = () => {
    setHasDrawn(true);
  };

  const handleConfirm = () => {
    if (!hasDrawn) {
      Alert.alert(
        'Firma vacía',
        'Por favor dibuja tu firma antes de confirmar.'
      );
      return;
    }
    setPendingSubmit(true);
    signatureRef.current?.readSignature();
  };

  // El callback `onOK` recibe la firma en Base64 cuando se llama
  // `readSignature()`.
  const handleSignatureOK = async (signatureBase64) => {
    if (!pendingSubmit) {
      return;
    }

    setPendingSubmit(false);

    if (!signatureBase64) {
      Alert.alert('Firma vacía', 'No se pudo capturar la firma. Intenta nuevamente.');
      return;
    }

    setSubmitting(true);

    let ubicacion = null;
    try {
      setObtainingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (loc?.coords) {
          ubicacion = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        }
      }
    } catch (locError) {
      console.warn('No se pudo obtener ubicación para la firma del cliente:', locError);
      ubicacion = null;
    } finally {
      setObtainingLocation(false);
    }

    try {
      await checklistService.firmarChecklistComoCliente(
        instanceId,
        signatureBase64,
        ubicacion,
      );

      Alert.alert(
        'Servicio confirmado',
        '¡Gracias por tu firma! Tu servicio quedó cerrado correctamente.',
        [
          {
            text: 'Listo',
            onPress: () => {
              onSignatureSuccess?.();
              onClose?.();
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error firmando como cliente:', error);
      Alert.alert(
        'No se pudo firmar',
        error?.message || 'Ocurrió un error al registrar tu firma. Intenta nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignatureEmpty = () => {
    setPendingSubmit(false);
    Alert.alert('Firma vacía', 'Por favor dibuja tu firma antes de confirmar.');
  };

  const handleClose = () => {
    if (submitting) return;
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'web' ? 'overFullScreen' : 'formSheet'}
      transparent={Platform.OS === 'web'}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.headerBackButton}
            disabled={submitting}
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card explicativa */}
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

          {/* Canvas */}
          <View style={styles.canvasWrapper}>
            <Text style={styles.canvasHint}>Dibuja tu firma dentro del recuadro</Text>
            <View style={styles.canvasContainer}>
              <SignatureScreen
                ref={signatureRef}
                onOK={handleSignatureOK}
                onEmpty={handleSignatureEmpty}
                onBegin={handleBegin}
                webStyle={signatureWebStyle}
                descriptionText=""
                imageType="image/png"
                trimWhitespace
                autoClear={false}
                style={{ flex: 1, height: CANVAS_HEIGHT }}
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
        </ScrollView>

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
      </View>
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
    paddingTop: Platform.OS === 'ios' ? SPACING.lg : SPACING.md,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
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
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.lg,
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
