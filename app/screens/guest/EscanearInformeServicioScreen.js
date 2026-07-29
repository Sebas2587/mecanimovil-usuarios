import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Camera,
  QrCode,
  Upload,
  Keyboard as KeyboardIcon,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import jsQRModule from 'jsqr';
import AppHeader from '../../components/navigation/AppHeader';
import Button from '../../components/base/Button/Button';
import WebQrScanner from '../../components/qr/WebQrScanner';
import { ROUTES } from '../../utils/constants';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, withOpacity } from '../../design-system/tokens';
import { showAlert } from '../../utils/platformAlert';
import {
  parseInformeTokenFromUrl,
  reclamarInformeServicio,
  obtenerInformePublico,
} from '../../services/informeServicioService';
import { savePendingInformeClaimIntent } from '../../utils/guestIntent';
import { useAuth } from '../../context/AuthContext';

function safeDecodeQR(imageData, width, height) {
  try {
    const fn = typeof jsQRModule === 'function'
      ? jsQRModule
      : (jsQRModule && jsQRModule.default)
        ? jsQRModule.default
        : (typeof window !== 'undefined' ? window.jsQR : null);
    if (typeof fn === 'function') {
      return fn(imageData, width, height, { inversionAttempts: 'dontInvert' });
    }
  } catch (err) {
    console.warn('safeDecodeQR error:', err);
  }
  return null;
}

const EscanearInformeServicioScreen = () => {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  // Renderizado condicional seguro de permisos de cámara en nativo vs web
  let permission = null;
  let requestPermission = () => {};
  if (Platform.OS !== 'web') {
    try {
      const { useCameraPermissions } = require('expo-camera');
      const [perm, reqPerm] = useCameraPermissions();
      permission = perm;
      requestPermission = reqPerm;
    } catch (_e) {}
  }

  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('camera');
  const [manualCode, setManualCode] = useState('');
  const [uploadError, setUploadError] = useState(null);

  const fileInputRef = useRef(null);
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && Platform.OS !== 'web') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const processToken = useCallback(
    async (rawToken) => {
      const token = parseInformeTokenFromUrl(rawToken);
      if (!token) {
        showAlert('Código inválido', 'El código o enlace ingresado no corresponde a un informe de servicio.');
        setScanned(false);
        setLoading(false);
        return;
      }

      setLoading(true);

      if (!isAuthenticated) {
        navigation.navigate(ROUTES.INFORME_SERVICIO, { token });
        setLoading(false);
        return;
      }

      try {
        const res = await reclamarInformeServicio(token);
        const countComp = res?.componentes_oficiales?.length || 0;
        const msg = countComp > 0
          ? `El informe se vinculó exitosamente. Se actualizaron ${countComp} métricas de salud en tu vehículo.`
          : 'El informe de servicio se vinculó correctamente a tu vehículo.';

        showAlert('Servicio vinculado', msg, [
          {
            text: 'Ver mi garaje',
            onPress: () => navigation.navigate('TabNavigator', { screen: ROUTES.MIS_VEHICULOS }),
          },
        ]);
      } catch (error) {
        const msg = error?.response?.data?.error || error?.message || 'No se pudo vincular el servicio';
        if (msg.toLowerCase().includes('registra') || msg.toLowerCase().includes('registrar')) {
          try {
            const informe = await obtenerInformePublico(token);
            await savePendingInformeClaimIntent({
              token,
              vehicleData: {
                patente: informe?.vehiculo?.patente,
                marca_nombre: informe?.vehiculo?.marca,
                modelo_nombre: informe?.vehiculo?.modelo,
                year: informe?.vehiculo?.anio,
                anio: informe?.vehiculo?.anio,
                vin: informe?.vehiculo?.vin,
                kilometraje_api: informe?.vehiculo?.kilometraje_api,
                mileage_sii: informe?.vehiculo?.kilometraje_api,
              },
            });
            navigation.navigate(ROUTES.CREAR_VEHICULO, {
              prefillPatente: informe?.vehiculo?.patente,
              prefillVehicleData: {
                patente: informe?.vehiculo?.patente,
                marca_nombre: informe?.vehiculo?.marca,
                modelo_nombre: informe?.vehiculo?.modelo,
                year: informe?.vehiculo?.anio,
                anio: informe?.vehiculo?.anio,
                vin: informe?.vehiculo?.vin,
                kilometraje_api: informe?.vehiculo?.kilometraje_api,
                mileage_sii: informe?.vehiculo?.kilometraje_api,
              },
              pendingInformeClaimToken: token,
            });
          } catch (_e) {
            navigation.navigate(ROUTES.INFORME_SERVICIO, { token });
          }
          return;
        }
        showAlert('Atención', msg, [{ text: 'Reintentar', onPress: () => setScanned(false) }]);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, navigation],
  );

  const handleBarCodeScanned = useCallback(
    ({ data }) => {
      if (scanned || loading) return;
      setScanned(true);
      processToken(data);
    },
    [scanned, loading, processToken],
  );

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      showAlert('Campo vacío', 'Ingresa el código o enlace del informe.');
      return;
    }
    processToken(manualCode.trim());
  };

  const handleFileUpload = useCallback(
    (event) => {
      const file = event?.target?.files?.[0];
      if (!file) return;

      setUploadError(null);
      setLoading(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          const code = safeDecodeQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            processToken(code.data);
          } else {
            setLoading(false);
            setUploadError('No pudimos detectar un código QR en la imagen. Intenta con una foto más clara o ingresa el código manualmente.');
          }
        };
        img.onerror = () => {
          setLoading(false);
          setUploadError('No se pudo cargar la imagen seleccionada.');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    [processToken],
  );

  const triggerFileInput = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleGoBack = () => navigation.goBack();

  let NativeCameraView = null;
  if (Platform.OS !== 'web') {
    try {
      NativeCameraView = require('expo-camera').CameraView;
    } catch (_e) {}
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <AppHeader title="Escanear Informe de Servicio" onBack={handleGoBack} />

        <ScrollView
          contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.gridContainer, isWide && styles.gridContainerWide]}>
            {/* COLUMNA IZQUIERDA: Informativa / Cómo Funciona */}
            <View style={[styles.leftCol, isWide && styles.leftColWide]}>
              <View style={styles.badgeWrap}>
                <Sparkles size={14} color={COLORS.brand.magenta} />
                <Text style={styles.badgeText}>Red de Talleres Oficiales</Text>
              </View>

              <Text style={styles.heroTitle}>Escanear e Integrar Informe de Servicio</Text>
              <Text style={styles.heroSub}>
                Sincroniza los mantenimientos e inspecciones realizados por talleres de la red MecaniMovil directamente en la salud e historial de tu vehículo.
              </Text>

              {/* Paso a paso */}
              <View style={styles.stepsWrap}>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumWrap}>
                    <Text style={styles.stepNum}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Escanea o sube el código QR</Text>
                    <Text style={styles.stepDesc}>
                      Apunta tu cámara al código QR impreso o digital entregado por el taller, o sube una imagen.
                    </Text>
                  </View>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumWrap}>
                    <Text style={styles.stepNum}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Detección de vehículo e inspección</Text>
                    <Text style={styles.stepDesc}>
                      Identifica los trabajos realizados, repuestos sustituidos y observaciones técnicas de la orden.
                    </Text>
                  </View>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumWrap}>
                    <Text style={styles.stepNum}>3</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Actualización automática de salud</Text>
                    <Text style={styles.stepDesc}>
                      Actualiza el odómetro y recalcula el desgaste proyectado de aceite, filtros y frenos desde la fecha del servicio.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Banner de confianza */}
              <View style={styles.trustBanner}>
                <ShieldCheck size={20} color={COLORS.primary[600]} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.trustTitle}>Veracidad y Respaldo Oficial</Text>
                  <Text style={styles.trustBody}>
                    Todos los informes emitidos en la red cuentan con firma digital y registro inalterable.
                  </Text>
                </View>
              </View>
            </View>

            {/* COLUMNA DERECHA: Lector QR y Métodos Alternativos */}
            <View style={[styles.rightCol, isWide && styles.rightColWide]}>
              <View style={styles.scannerCard}>
                {/* Tabs Selector */}
                <View style={styles.tabsRow}>
                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'camera' && styles.tabBtnActive]}
                    onPress={() => {
                      setActiveTab('camera');
                      setScanned(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Camera size={16} color={activeTab === 'camera' ? COLORS.brand.magenta : COLORS.text.secondary} />
                    <Text style={[styles.tabText, activeTab === 'camera' && styles.tabTextActive]}>
                      Cámara
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'file' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('file')}
                    activeOpacity={0.8}
                  >
                    <Upload size={16} color={activeTab === 'file' ? COLORS.brand.magenta : COLORS.text.secondary} />
                    <Text style={[styles.tabText, activeTab === 'file' && styles.tabTextActive]}>
                      Subir Foto
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'manual' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('manual')}
                    activeOpacity={0.8}
                  >
                    <KeyboardIcon size={16} color={activeTab === 'manual' ? COLORS.brand.magenta : COLORS.text.secondary} />
                    <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
                      Manual
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* TAB 1: CÁMARA */}
                {activeTab === 'camera' && (
                  <View style={styles.tabContainer}>
                    {Platform.OS === 'web' ? (
                      <WebQrScanner onScanned={handleBarCodeScanned} scanning={!scanned && !loading} />
                    ) : permission?.granted && NativeCameraView ? (
                      <View style={styles.nativeCameraWrap}>
                        <NativeCameraView
                          style={StyleSheet.absoluteFillObject}
                          facing="back"
                          onBarcodeScanned={scanned || loading ? undefined : handleBarCodeScanned}
                          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                        />
                        <View style={styles.nativeOverlayFrame} />
                      </View>
                    ) : (
                      <View style={styles.permissionBox}>
                        <Camera size={32} color={COLORS.primary[500]} />
                        <Text style={styles.permissionTitle}>Permiso de cámara</Text>
                        <Text style={styles.permissionSub}>
                          Se requiere acceso a la cámara para leer el código QR.
                        </Text>
                        <Button title="Conceder permiso" onPress={requestPermission} size="sm" />
                      </View>
                    )}

                    <Text style={styles.scanInstruction}>
                      {scanned || loading
                        ? 'Procesando código QR…'
                        : 'Centra el código QR del informe dentro del recuadro.'}
                    </Text>
                  </View>
                )}

                {/* TAB 2: SUBIR FOTO */}
                {activeTab === 'file' && (
                  <View style={styles.tabContainer}>
                    <TouchableOpacity
                      style={styles.uploadDropzone}
                      onPress={triggerFileInput}
                      activeOpacity={0.8}
                    >
                      <Upload size={32} color={COLORS.brand.magenta} strokeWidth={2} />
                      <Text style={styles.dropzoneTitle}>Seleccionar foto o captura del QR</Text>
                      <Text style={styles.dropzoneSub}>
                        Haz clic aquí para buscar una imagen en tu dispositivo (.png, .jpg, .jpeg)
                      </Text>
                    </TouchableOpacity>

                    {Platform.OS === 'web' &&
                      React.createElement('input', {
                        ref: fileInputRef,
                        type: 'file',
                        accept: 'image/*',
                        onChange: handleFileUpload,
                        style: { display: 'none' },
                      })}

                    {uploadError ? (
                      <Text style={styles.errorText}>{uploadError}</Text>
                    ) : null}
                  </View>
                )}

                {/* TAB 3: CÓDIGO MANUAL */}
                {activeTab === 'manual' && (
                  <View style={styles.tabContainer}>
                    <Text style={styles.manualLabel}>
                      Código o Enlace del Informe
                    </Text>
                    <TextInput
                      style={styles.manualInput}
                      placeholder="Ej: 5ENHHZJX... o https://..."
                      placeholderTextColor={COLORS.text.tertiary}
                      value={manualCode}
                      onChangeText={setManualCode}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Button
                      title={loading ? 'Buscando…' : 'Buscar e Ingresar'}
                      onPress={handleManualSubmit}
                      disabled={loading || !manualCode.trim()}
                      loading={loading}
                      type="primary"
                      fullWidth
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingVertical: SPACING.md,
  },
  scrollContentWide: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  gridContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: SPACING.lg,
  },
  gridContainerWide: {
    flexDirection: 'row',
    maxWidth: 1040,
    alignItems: 'flex-start',
    gap: SPACING['2xl'],
  },
  leftCol: {
    flex: 1,
  },
  leftColWide: {
    maxWidth: 480,
  },
  rightCol: {
    flex: 1,
    width: '100%',
  },
  rightColWide: {
    maxWidth: 480,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: withOpacity(COLORS.brand.magenta, 0.08),
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BORDERS.radius.full || 999,
    marginBottom: SPACING.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.brand.magenta,
  },
  heroTitle: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  heroSub: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  stepsWrap: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  stepNumWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontSize: 14,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary[700],
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  trustTitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[800],
  },
  trustBody: {
    fontSize: 11,
    color: COLORS.primary[700],
    marginTop: 2,
  },
  scannerCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card.lg || 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
    }),
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.default,
    borderRadius: BORDERS.radius.md,
    padding: 3,
    marginBottom: SPACING.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: BORDERS.radius.sm,
  },
  tabBtnActive: {
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  tabText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  tabTextActive: {
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  tabContainer: {
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 280,
    justifyContent: 'center',
  },
  nativeCameraWrap: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 280,
    borderRadius: BORDERS.radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  nativeOverlayFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: COLORS.brand.magenta,
    margin: 40,
    borderRadius: 16,
  },
  scanInstruction: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  permissionBox: {
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  permissionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  permissionSub: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  uploadDropzone: {
    width: '100%',
    padding: SPACING.xl,
    borderWidth: 2,
    borderColor: COLORS.brand.magenta,
    borderStyle: 'dashed',
    borderRadius: BORDERS.radius.lg,
    backgroundColor: withOpacity(COLORS.brand.magenta, 0.04),
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  dropzoneTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  dropzoneSub: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.error?.main || '#d93049',
    textAlign: 'center',
  },
  manualLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    alignSelf: 'flex-start',
  },
  manualInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.default,
  },
});

export default EscanearInformeServicioScreen;
