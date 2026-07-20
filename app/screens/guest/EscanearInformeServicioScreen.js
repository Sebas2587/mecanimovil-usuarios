import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Camera, X } from 'lucide-react-native';
import AppHeader from '../../components/navigation/AppHeader';
import Button from '../../components/base/Button/Button';
import { ROUTES } from '../../utils/constants';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS } from '../../design-system/tokens';
import {
  parseInformeTokenFromUrl,
  reclamarInformeServicio,
} from '../../services/informeServicioService';
import { savePendingInformeClaimIntent } from '../../utils/guestIntent';
import { obtenerInformePublico } from '../../services/informeServicioService';

const SCAN_AREA_SIZE = 280;

const EscanearInformeServicioScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);

    const token = parseInformeTokenFromUrl(data);
    if (!token) {
      Alert.alert('Código inválido', 'Este QR no corresponde a un informe de servicio.', [
        { text: 'Reintentar', onPress: () => setScanned(false) },
      ]);
      return;
    }

    try {
      await reclamarInformeServicio(token);
      Alert.alert('Servicio vinculado', 'El servicio quedó registrado en tu vehículo.', [
        {
          text: 'Ver vehículo',
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
      Alert.alert('Error', msg, [{ text: 'Reintentar', onPress: () => setScanned(false) }]);
    }
  };

  const handleGoBack = () => navigation.goBack();

  if (!permission) {
    return <View style={styles.cameraPlaceholder} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.focusRoot} edges={['top', 'bottom']}>
        <AppHeader title="Escanear informe" onBack={handleGoBack} />
        <View style={styles.permissionBody}>
          <View style={styles.permissionIcon}>
            <Camera size={32} color={COLORS.primary[500]} strokeWidth={2} />
          </View>
          <Text style={[TYPOGRAPHY.styles.h3, styles.permissionTitle]}>
            Permiso de cámara
          </Text>
          <Text style={[TYPOGRAPHY.styles.body, styles.permissionMessage]}>
            Necesitamos acceso a la cámara para escanear el código QR del informe de servicio.
          </Text>
          <Button title="Conceder permiso" onPress={requestPermission} fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraRoot}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      <SafeAreaView style={styles.overlay} edges={['top']}>
        <View style={styles.overlayTop}>
          <TouchableOpacity style={styles.closeButton} onPress={handleGoBack} hitSlop={12}>
            <X size={28} color={COLORS.base.white} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.overlayCenter}>
          <View style={styles.scanFrame} />
          <Text style={styles.instruction}>
            Centra el QR del informe de servicio
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  cameraRoot: { flex: 1, backgroundColor: '#000' },
  cameraPlaceholder: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  overlayTop: { padding: SPACING.md },
  closeButton: {
    alignSelf: 'flex-start',
    padding: SPACING.xs,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overlayCenter: { alignItems: 'center', gap: SPACING.lg },
  scanFrame: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderWidth: 2,
    borderColor: COLORS.base.white,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: 'transparent',
  },
  instruction: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.base.white,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  focusRoot: { flex: 1, backgroundColor: COLORS.background.default },
  permissionBody: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
    alignItems: 'center',
  },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: { textAlign: 'center' },
  permissionMessage: { textAlign: 'center', color: COLORS.text.secondary },
});

export default EscanearInformeServicioScreen;
