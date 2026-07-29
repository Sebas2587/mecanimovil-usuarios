import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Camera, AlertCircle, RefreshCw } from 'lucide-react-native';
import jsQR from 'jsqr';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING, withOpacity } from '../../design-system/tokens';
import Button from '../base/Button/Button';

/**
 * Lector de códigos QR especializado para navegadores Web (HTML5 Video + Canvas + jsQR).
 */
const WebQrScanner = ({ onScanned, scanning = true }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  const [hasPermission, setHasPermission] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);

  const stopStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStarted(false);
  }, []);

  const tick = useCallback(() => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    const video = videoRef.current;
    let canvas = canvasRef.current;
    if (!canvas && typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    if (canvas) {
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);

          // 1. Intentar con window.BarcodeDetector si está disponible en Chrome/Edge/Safari
          if (typeof window !== 'undefined' && 'BarcodeDetector' in window && !window.__disableNativeBarcode) {
            try {
              if (!window.__barcodeDetectorInstance) {
                window.__barcodeDetectorInstance = new window.BarcodeDetector({ formats: ['qr_code'] });
              }
              window.__barcodeDetectorInstance
                .detect(video)
                .then((barcodes) => {
                  if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                    onScanned({ data: barcodes[0].rawValue });
                    return;
                  }
                })
                .catch(() => {
                  window.__disableNativeBarcode = true;
                });
            } catch {
              window.__disableNativeBarcode = true;
            }
          }

          // 2. jsQR decode
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            onScanned({ data: code.data });
            return;
          }
        }
      }
    }

    if (scanning) {
      animFrameRef.current = requestAnimationFrame(tick);
    }
  }, [onScanned, scanning]);

  const startStream = useCallback(async (deviceId = null) => {
    stopStream();
    setErrorMessage(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setHasPermission(false);
      setErrorMessage('Tu navegador no soporta la API de cámara web.');
      return;
    }

    try {
      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsStarted(true);
        animFrameRef.current = requestAnimationFrame(tick);
      }

      // Enumerar cámaras disponibles
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setCameras(videoDevices);
        if (!selectedCameraId && videoDevices.length > 0) {
          const currentTrack = stream.getVideoTracks()[0];
          const settings = currentTrack?.getSettings?.();
          if (settings?.deviceId) {
            setSelectedCameraId(settings.deviceId);
          }
        }
      } catch (_err) {
        // ignora si enumerateDevices falla
      }
    } catch (err) {
      console.warn('Error accediendo a cámara web:', err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Permiso de cámara denegado. Permite el acceso a la cámara en la barra del navegador.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No se encontró ninguna cámara conectada en tu equipo.');
      } else {
        setErrorMessage('No pudimos iniciar la cámara web. Intenta nuevamente.');
      }
    }
  }, [stopStream, tick, selectedCameraId]);

  useEffect(() => {
    if (Platform.OS === 'web' && scanning) {
      startStream();
    }
    return () => {
      stopStream();
    };
  }, [startStream, stopStream, scanning]);

  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.container}>
      <View style={styles.videoWrapper}>
        <video
          ref={videoRef}
          style={styles.webVideo}
          muted
          playsInline
        />

        {isStarted && scanning ? (
          <View style={styles.overlayFrame}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
            <View style={styles.scanLine} />
          </View>
        ) : null}

        {hasPermission === false ? (
          <View style={styles.fallbackBox}>
            <AlertCircle size={36} color={COLORS.danger.main} strokeWidth={2} />
            <Text style={styles.fallbackTitle}>Acceso a la cámara</Text>
            <Text style={styles.fallbackText}>{errorMessage || 'Cámara no disponible.'}</Text>
            <Button
              title="Reintentar cámara"
              onPress={() => startStream(selectedCameraId)}
              type="primary"
              variant="outline"
              size="sm"
            />
          </View>
        ) : null}
      </View>

      {cameras.length > 1 ? (
        <View style={styles.cameraPickerRow}>
          <Camera size={14} color={COLORS.text.secondary} />
          <Text style={styles.cameraPickerLabel}>Cambiar cámara:</Text>
          {cameras.map((cam, idx) => (
            <TouchableOpacity
              key={`cam-${cam.deviceId || idx}`}
              style={[
                styles.camChip,
                (selectedCameraId === cam.deviceId || (!selectedCameraId && idx === 0)) && styles.camChipActive,
              ]}
              onPress={() => {
                setSelectedCameraId(cam.deviceId);
                startStream(cam.deviceId);
              }}
            >
              <Text
                style={[
                  styles.camChipText,
                  (selectedCameraId === cam.deviceId || (!selectedCameraId && idx === 0)) && styles.camChipTextActive,
                ]}
              >
                {cam.label || `Cámara ${idx + 1}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 1.25,
    maxHeight: 320,
    backgroundColor: '#000',
    borderRadius: BORDERS.radius.lg || 12,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlayFrame: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.brand.magenta,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.brand.magenta,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.brand.magenta,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.brand.magenta,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    width: '90%',
    height: 2,
    backgroundColor: COLORS.brand.magenta,
    shadowColor: COLORS.brand.magenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  fallbackBox: {
    position: 'absolute',
    inset: 0,
    backgroundColor: COLORS.background.paper,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  fallbackTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  fallbackText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  cameraPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  cameraPickerLabel: {
    fontSize: 11,
    color: COLORS.text.secondary,
  },
  camChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.full || 999,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  camChipActive: {
    borderColor: COLORS.brand.magenta,
    backgroundColor: withOpacity(COLORS.brand.magenta, 0.1),
  },
  camChipText: {
    fontSize: 10,
    color: COLORS.text.secondary,
  },
  camChipTextActive: {
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.brand.magenta,
  },
});

export default WebQrScanner;
