import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import BackButton from '../../components/navigation/BackButton';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import { showAlert } from '../../utils/platformAlert';
import { getVitrinaTokenFromWebPath } from '../../utils/publicListingRoute';
import {
  obtenerVitrinaRepuestos,
  seleccionarVitrinaRepuestos,
} from '../../services/vitrinaRepuestosService';

const DOC_MAX = 560;
const DELEGADO = '__taller__';

function calidadLabel(c) {
  if (c === 'original') return 'Original';
  if (c === 'oem') return 'Equivalente OEM';
  if (c === 'alternativo') return 'Alternativo';
  return '';
}

function posicionLabel(p) {
  if (p === 'mas_economica') return 'más económica';
  if (p === 'mayor_precio') return 'mayor precio';
  if (p === 'intermedia') return 'intermedia';
  return '';
}

function formatCLP(n) {
  const v = Math.round(Number(n) || 0);
  if (!v) return '';
  return `$${v.toLocaleString('es-CL')}`;
}

const VitrinaRepuestosScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const token = useMemo(() => {
    const fromRoute = route.params?.token;
    if (fromRoute) return String(fromRoute).trim();
    if (Platform.OS === 'web') return getVitrinaTokenFromWebPath();
    return null;
  }, [route.params?.token]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [expirado, setExpirado] = useState(false);
  const [done, setDone] = useState(false);
  const [seleccion, setSeleccion] = useState({});

  const cargar = useCallback(async () => {
    if (!token) {
      setError('Enlace inválido.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const payload = await obtenerVitrinaRepuestos(token);
      setData(payload);
      const init = {};
      (payload.lineas || []).forEach((lin) => {
        init[lin.linea_id] = DELEGADO;
      });
      setSeleccion(init);
      setError(null);
      setExpirado(false);
    } catch (err) {
      const status = err?.response?.status;
      const payload = err?.response?.data;
      if (status === 410) {
        setExpirado(true);
        setError(payload?.error || 'Este link ya venció. Escríbenos y te mandamos las opciones de nuevo.');
      } else {
        setError('No pudimos cargar las opciones.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const confirmar = async () => {
    if (!token || !data) return;
    const selecciones = (data.lineas || []).map((lin) => {
      const val = seleccion[lin.linea_id] || DELEGADO;
      if (val === DELEGADO) {
        return { linea_id: lin.linea_id, delegado_al_taller: true };
      }
      return { linea_id: lin.linea_id, opcion_id: val };
    });
    setSubmitting(true);
    try {
      const res = await seleccionarVitrinaRepuestos(token, selecciones);
      setDone(true);
      showAlert('', res?.mensaje || 'Listo. Se lo pasamos al taller para que te confirme el valor.');
    } catch (err) {
      if (err?.response?.status === 410) {
        setExpirado(true);
        setError('Este link ya venció. Escríbenos y te mandamos las opciones de nuevo.');
      } else {
        showAlert('No se pudo guardar', 'Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const veh = data?.vehiculo || {};
  const vehLabel = [veh.marca, veh.modelo, veh.anio].filter(Boolean).join(' ');
  const patente = (veh.patente || '').toUpperCase();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient
        colors={[COLORS.base.soft, COLORS.background.default, COLORS.background.default]}
        locations={[0, 0.28, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack?.()} />
        <Text style={styles.topBarTitle} numberOfLines={1}>Elige tus repuestos</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.brand.orange} />
        </View>
      ) : expirado || error ? (
        <View style={styles.center}>
          <Text style={styles.errorTxt}>
            {error || 'Este link ya venció. Escríbenos y te mandamos las opciones de nuevo.'}
          </Text>
        </View>
      ) : done ? (
        <View style={styles.center}>
          <Text style={styles.doneTitle}>Listo</Text>
          <Text style={styles.doneBody}>
            Se lo pasamos al taller para que te confirme el valor.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { maxWidth: Math.min(width, DOC_MAX), width: '100%', alignSelf: 'center' },
              { paddingBottom: 120 },
            ]}
          >
            <Text style={styles.taller}>{data?.taller?.nombre || 'Taller'}</Text>
            {vehLabel || patente ? (
              <Text style={styles.veh}>
                {vehLabel}{patente ? ` · ${patente}` : ''}
              </Text>
            ) : null}
            <Text style={styles.lead}>
              Estas son las opciones que encontramos para tu auto. El taller confirma el valor final.
            </Text>

            {(data.lineas || []).map((lin) => (
              <View key={lin.linea_id} style={styles.card}>
                <Text style={styles.lineaNombre}>
                  {lin.nombre}{lin.cantidad > 1 ? `  ×${lin.cantidad}` : ''}
                </Text>
                {(lin.opciones || []).map((op) => {
                  const selected = seleccion[lin.linea_id] === op.id;
                  const banda = lin.muestra_banda && (op.precio_min_clp || op.precio_max_clp);
                  const rango = banda
                    ? (op.precio_max_clp && op.precio_max_clp !== op.precio_min_clp
                      ? `${formatCLP(op.precio_min_clp)} – ${formatCLP(op.precio_max_clp)}`
                      : formatCLP(op.precio_min_clp || op.precio_max_clp))
                    : posicionLabel(op.posicion_relativa);
                  return (
                    <Pressable
                      key={op.id}
                      onPress={() => setSeleccion((s) => ({ ...s, [lin.linea_id]: op.id }))}
                      style={[styles.opRow, selected && styles.opRowOn]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      {op.imagen_url ? (
                        <Image
                          source={{ uri: op.imagen_url }}
                          style={styles.thumb}
                          accessibilityLabel={`${op.nombre || lin.nombre} ${op.marca_repuesto || ''}`}
                        />
                      ) : (
                        <View style={[styles.thumb, styles.thumbPh]} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.opMarca}>{op.marca_repuesto || op.nombre || 'Opción'}</Text>
                        <Text style={styles.opMeta}>
                          {[calidadLabel(op.calidad || lin.calidad), op.especificacion].filter(Boolean).join(' · ')}
                        </Text>
                        {rango ? (
                          <Text style={styles.opPrecio}>
                            {rango}{banda ? '  referencia' : ''}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.radio, selected && styles.radioOn]} />
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => setSeleccion((s) => ({ ...s, [lin.linea_id]: DELEGADO }))}
                  style={[styles.opRow, seleccion[lin.linea_id] === DELEGADO && styles.opRowOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: seleccion[lin.linea_id] === DELEGADO }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.opMarca}>Que el taller decida</Text>
                  </View>
                  <View style={[styles.radio, seleccion[lin.linea_id] === DELEGADO && styles.radioOn]} />
                </Pressable>
              </View>
            ))}

            <Text style={styles.disclaimer}>
              Imágenes de referencia. Los valores son un rango de mercado, no un precio final.
            </Text>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <GuestGradientButton
              title="Confirmar mi elección"
              onPress={confirmar}
              loading={submitting}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background.default },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  topBarTitle: { ...TYPOGRAPHY.styles.h5, color: COLORS.text.primary, flex: 1, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', padding: SPACING.lg },
  errorTxt: { ...TYPOGRAPHY.styles.body, color: COLORS.text.secondary, textAlign: 'center' },
  doneTitle: { ...TYPOGRAPHY.styles.h3, color: COLORS.text.primary, textAlign: 'center', marginBottom: 8 },
  doneBody: { ...TYPOGRAPHY.styles.body, color: COLORS.text.secondary, textAlign: 'center' },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  taller: { ...TYPOGRAPHY.styles.h3, color: COLORS.text.primary },
  veh: { ...TYPOGRAPHY.styles.caption, color: COLORS.text.secondary, marginTop: 4 },
  lead: { ...TYPOGRAPHY.styles.body, color: COLORS.text.secondary, marginTop: SPACING.md, marginBottom: SPACING.lg },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray[200],
  },
  lineaNombre: { ...TYPOGRAPHY.styles.h5, color: COLORS.text.primary, marginBottom: SPACING.sm },
  opRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: 10,
    gap: 12,
  },
  opRowOn: { backgroundColor: COLORS.base.soft, borderRadius: BORDERS.radius.sm, paddingHorizontal: 8 },
  thumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: COLORS.neutral.gray[100] },
  thumbPh: { backgroundColor: COLORS.neutral.gray[200] },
  opMarca: { ...TYPOGRAPHY.styles.bodyBold, color: COLORS.text.primary },
  opMeta: { ...TYPOGRAPHY.styles.caption, color: COLORS.text.secondary, marginTop: 2 },
  opPrecio: { ...TYPOGRAPHY.styles.caption, color: COLORS.text.primary, marginTop: 4 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.neutral.gray[400],
  },
  radioOn: { borderColor: COLORS.brand.orange, backgroundColor: COLORS.brand.orange },
  disclaimer: { ...TYPOGRAPHY.styles.caption, color: COLORS.text.secondary, marginBottom: SPACING.lg },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 8,
    backgroundColor: COLORS.background.default,
  },
});

export default VitrinaRepuestosScreen;
