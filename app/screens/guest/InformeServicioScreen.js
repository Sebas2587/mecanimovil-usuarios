import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Check, FileText } from 'lucide-react-native';
import BackButton from '../../components/navigation/BackButton';
import Button from '../../components/base/Button/Button';
import SignaturePad from '../../components/signature/SignaturePad';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, withOpacity } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import { showAlert } from '../../utils/platformAlert';
import {
  firmarInformeCliente,
  obtenerInformePublico,
  reclamarInformeServicio,
} from '../../services/informeServicioService';
import { savePendingInformeClaimIntent } from '../../utils/guestIntent';
import { useAuth } from '../../context/AuthContext';
import { getInformeTokenFromWebPath } from '../../utils/publicListingRoute';

const SIGNATURE_WEB_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: 1px dashed #ccc; border-radius: 12px; }
  .m-signature-pad--footer { display: none; margin: 0; }
  .m-signature-pad--footer button { display: none !important; }
`;

const InformeServicioScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  const signatureRef = useRef(null);

  const token = useMemo(() => {
    const fromRoute = route.params?.token;
    if (fromRoute) return String(fromRoute).trim();
    if (Platform.OS === 'web') return getInformeTokenFromWebPath();
    return null;
  }, [route.params?.token]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);
  const [informe, setInforme] = useState(null);
  const [nombreCliente, setNombreCliente] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);

  const cargarInforme = useCallback(async () => {
    if (!token) {
      setError('Enlace de informe inválido');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerInformePublico(token);
      setInforme(data);
      if (data?.cliente_nombre && !nombreCliente) {
        setNombreCliente(String(data.cliente_nombre).trim());
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'No se pudo cargar el informe');
    } finally {
      setLoading(false);
    }
  }, [token, nombreCliente]);

  useEffect(() => {
    void cargarInforme();
  }, [cargarInforme]);

  const yaFirmado = informe?.estado === 'FIRMADO' || informe?.estado === 'VEHICULO_RECLAMADO';
  const puedeFirmar = informe?.estado === 'PENDIENTE_FIRMA_CLIENTE' && !yaFirmado;

  const handleFirmar = useCallback(async (firmaBase64) => {
    if (!token || !firmaBase64) return;
    const nombre = nombreCliente.trim();
    if (!nombre) {
      showAlert('Nombre requerido', 'Indica tu nombre para certificar el servicio.');
      return;
    }
    setSubmitting(true);
    try {
      await firmarInformeCliente(token, {
        firma_cliente: firmaBase64,
        firmado_por_nombre: nombre,
      });
      showAlert('¡Gracias!', 'Servicio certificado correctamente.');
      await cargarInforme();
    } catch (e) {
      showAlert(
        'No se pudo firmar',
        e?.response?.data?.error || e?.message || 'Intenta nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [token, nombreCliente, cargarInforme]);

  const handleLeerFirma = () => {
    signatureRef.current?.readSignature();
  };

  const handleCrearCuenta = async () => {
    if (!informe) return;
    await savePendingInformeClaimIntent({
      token,
      vehicleData: {
        patente: informe.vehiculo?.patente,
        marca_nombre: informe.vehiculo?.marca,
        modelo_nombre: informe.vehiculo?.modelo,
        year: informe.vehiculo?.anio,
        anio: informe.vehiculo?.anio,
        vin: informe.vehiculo?.vin,
        kilometraje_api: informe.vehiculo?.kilometraje_api,
        mileage_sii: informe.vehiculo?.kilometraje_api,
      },
    });
    navigation.navigate(ROUTES.REGISTER);
  };

  const handleReclamar = async () => {
    if (!token) return;
    setClaiming(true);
    try {
      const result = await reclamarInformeServicio(token);
      showAlert('Servicio vinculado', result?.message || 'El servicio quedó en tu vehículo.');
      await cargarInforme();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'No se pudo vincular el servicio';
      if (msg.toLowerCase().includes('registra tu vehículo') || msg.toLowerCase().includes('registrar')) {
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
        return;
      }
      showAlert('No se pudo vincular', msg);
    } finally {
      setClaiming(false);
    }
  };

  const qrPayload = informe?.qr_payload || informe?.url_publica;

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Cargando informe…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !informe) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>Informe de servicio</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Informe no encontrado'}</Text>
          <Button title="Reintentar" onPress={() => void cargarInforme()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <BackButton onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate(ROUTES.GUEST_LANDING))} />
        <Text style={styles.headerTitle}>Informe de servicio</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <FileText size={28} color={COLORS.primary[500]} strokeWidth={2} />
          <Text style={styles.heroTitle}>{informe.checklist?.template_nombre || 'Servicio en taller'}</Text>
          {informe.taller_nombre ? (
            <Text style={styles.heroSubtitle}>{informe.taller_nombre}</Text>
          ) : null}
          <Text style={styles.patenteText}>
            {[informe.vehiculo?.marca, informe.vehiculo?.modelo, informe.vehiculo?.patente]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>

        {informe.resumen_ia ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Resumen del servicio</Text>
            <Text style={styles.resumenText}>{informe.resumen_ia}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Detalle del checklist</Text>
          {(informe.checklist?.items || []).map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={[styles.itemCheck, item.completado && styles.itemCheckDone]}>
                {item.completado ? <Check size={14} color={COLORS.base.white} /> : null}
              </View>
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle}>{item.pregunta_texto}</Text>
                {item.respuesta_texto ? (
                  <Text style={styles.itemAnswer}>{item.respuesta_texto}</Text>
                ) : null}
                {(item.fotos || []).map((foto) => (
                  foto.imagen_url ? (
                    <Image
                      key={foto.id}
                      source={{ uri: foto.imagen_url }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  ) : null
                ))}
              </View>
            </View>
          ))}
        </View>

        {qrPayload ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Código del informe</Text>
            <Text style={styles.qrHint}>
              Escanea este código para abrir el informe en otro dispositivo o vincularlo a tu cuenta.
            </Text>
            <View style={styles.qrWrap}>
              <QRCode value={String(qrPayload)} size={Math.min(width - 120, 220)} />
            </View>
          </View>
        ) : null}

        {yaFirmado ? (
          <View style={[styles.sectionCard, styles.signedCard]}>
            <Check size={24} color={COLORS.success.main} strokeWidth={2.5} />
            <Text style={styles.signedTitle}>Servicio certificado</Text>
            {informe.firmado_por_nombre ? (
              <Text style={styles.signedMeta}>Firmado por {informe.firmado_por_nombre}</Text>
            ) : null}
            {informe.reclamado ? (
              <Text style={styles.signedMeta}>Vinculado a tu vehículo en Mecanimovil</Text>
            ) : null}
          </View>
        ) : null}

        {puedeFirmar ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tu firma</Text>
            <Text style={styles.signHint}>
              Confirma que recibiste el servicio descrito. No necesitas cuenta.
            </Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Tu nombre completo"
              placeholderTextColor={COLORS.text.hint}
              value={nombreCliente}
              onChangeText={setNombreCliente}
            />
            <View style={styles.signatureBox}>
              <SignaturePad
                ref={signatureRef}
                onOK={handleFirmar}
                onEmpty={() => showAlert('Firma requerida', 'Dibuja tu firma antes de continuar.')}
                onBegin={() => setHasDrawn(true)}
                webStyle={SIGNATURE_WEB_STYLE}
                style={styles.signaturePad}
              />
            </View>
            <Button
              title={submitting ? 'Enviando…' : 'Certificar servicio'}
              onPress={handleLeerFirma}
              isLoading={submitting}
              disabled={submitting || !hasDrawn}
              fullWidth
            />
          </View>
        ) : null}

        {yaFirmado && !informe.reclamado ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Lleva el control de tu auto</Text>
            <Text style={styles.ctaHint}>
              Crea una cuenta y vincula este servicio a tu vehículo para ver la salud oficial del auto.
            </Text>
            {isAuthenticated ? (
              <>
                <Button
                  title={claiming ? 'Vinculando…' : 'Vincular a mi vehículo'}
                  onPress={() => void handleReclamar()}
                  isLoading={claiming}
                  fullWidth
                />
                <Button
                  title="Escanear código QR"
                  variant="secondary"
                  onPress={() => navigation.navigate(ROUTES.ESCANEAR_INFORME_SERVICIO)}
                  fullWidth
                  style={{ marginTop: SPACING.sm }}
                />
              </>
            ) : (
              <>
                <Button title="Crear cuenta gratis" onPress={() => void handleCrearCuenta()} fullWidth />
                <Button
                  title="Ya tengo cuenta — iniciar sesión"
                  variant="secondary"
                  onPress={async () => {
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
                    navigation.navigate(ROUTES.LOGIN);
                  }}
                  fullWidth
                  style={{ marginTop: SPACING.sm }}
                />
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING['2xl'],
    gap: SPACING.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  loadingText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
  },
  errorText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.error.main,
    textAlign: 'center',
  },
  heroCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  heroTitle: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
  },
  patenteText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  sectionCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    gap: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
  },
  resumenText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  itemRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  itemCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  itemCheckDone: {
    backgroundColor: COLORS.success.main,
    borderColor: COLORS.success.main,
  },
  itemBody: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    ...TYPOGRAPHY.styles.body,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  itemAnswer: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  photo: {
    width: '100%',
    height: 160,
    borderRadius: BORDERS.radius.md,
    marginTop: SPACING.xs,
    backgroundColor: COLORS.background.secondary,
  },
  qrWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  qrHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  signedCard: {
    alignItems: 'center',
    backgroundColor: withOpacity(COLORS.success.main, 0.08),
  },
  signedTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.success.dark,
  },
  signedMeta: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  signHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: COLORS.border.main,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.default,
  },
  signatureBox: {
    height: 180,
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  signaturePad: {
    flex: 1,
  },
  ctaHint: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
  },
});

export default InformeServicioScreen;
