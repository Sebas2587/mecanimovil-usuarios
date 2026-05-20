import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Clock, CalendarDays } from 'lucide-react-native';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import { SHADOWS } from '../../design-system/tokens/shadows';
import {
  generarDiasCalendario,
  obtenerDiasDisponiblesAgenda,
  obtenerDisponibilidadConDuracion,
} from '../../services/disponibilidadProveedorService';
import { ROUTES } from '../../utils/constants';

/**
 * Selección de fecha y hora según agenda real del proveedor (ventanas libres + duración del servicio).
 */
export default function CalendarioProveedorScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const {
    tipoProveedor = 'taller',
    proveedorId,
    proveedorNombre = 'Proveedor',
    ofertaServicioId,
    returnRoute = ROUTES.CREAR_SOLICITUD,
    returnParams = {},
  } = route.params || {};

  const diasBase = useMemo(() => generarDiasCalendario(14), []);
  const [fechasHabilitadas, setFechasHabilitadas] = useState(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [disponibilidadDia, setDisponibilidadDia] = useState(null);
  const [loadingDias, setLoadingDias] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState(null);

  const tipoNorm = tipoProveedor === 'mecanico' || tipoProveedor === 'domicilio' ? 'mecanico' : 'taller';

  const cargarDias = useCallback(async () => {
    if (!proveedorId) {
      setError('Proveedor no válido');
      setLoadingDias(false);
      return;
    }
    try {
      setLoadingDias(true);
      setError(null);
      const res = await obtenerDiasDisponiblesAgenda({
        tipoProveedor: tipoNorm,
        proveedorId,
        ofertaServicioId,
      });
      const setFechas = new Set(res?.fechas_disponibles || []);
      setFechasHabilitadas(setFechas);
      const primera = diasBase.find((d) => setFechas.has(d.fecha));
      if (primera) setFechaSeleccionada(primera.fecha);
    } catch (e) {
      setError(e?.message || 'No se pudo cargar la agenda');
    } finally {
      setLoadingDias(false);
    }
  }, [proveedorId, ofertaServicioId, tipoNorm, diasBase]);

  useEffect(() => {
    cargarDias();
  }, [cargarDias]);

  const cargarSlots = useCallback(async (fecha) => {
    if (!fecha || !proveedorId) return;
    try {
      setLoadingSlots(true);
      setSlotSeleccionado(null);
      const data = await obtenerDisponibilidadConDuracion({
        tipoProveedor: tipoNorm,
        proveedorId,
        fecha,
        ofertaServicioId,
      });
      setDisponibilidadDia(data);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudieron cargar los horarios');
      setDisponibilidadDia(null);
    } finally {
      setLoadingSlots(false);
    }
  }, [proveedorId, ofertaServicioId, tipoNorm]);

  useEffect(() => {
    if (fechaSeleccionada) cargarSlots(fechaSeleccionada);
  }, [fechaSeleccionada, cargarSlots]);

  const estadoActual = disponibilidadDia?.estado_actual;
  const slots = disponibilidadDia?.slots_disponibles || [];
  const duracion = disponibilidadDia?.duracion_servicio_solicitado;

  const handleConfirmar = () => {
    if (!fechaSeleccionada || !slotSeleccionado) {
      Alert.alert('Selecciona horario', 'Elige un día y una hora disponible.');
      return;
    }
    navigation.navigate({
      name: returnRoute,
      params: {
        ...returnParams,
        slotSeleccionado: {
          fecha: fechaSeleccionada,
          hora: slotSeleccionado.hora,
          hora_fin_estimada: slotSeleccionado.hora_fin_estimada,
        },
      },
      merge: true,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Agenda del proveedor</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{proveedorNombre}</Text>
        </View>
      </View>

      {estadoActual?.ocupado && (
        <View style={styles.badgeOcupado}>
          <Clock size={16} color={COLORS.warning[700]} />
          <Text style={styles.badgeOcupadoText}>
            {estadoActual.servicio_en_curso
              ? `En servicio: ${estadoActual.servicio_en_curso}. `
              : ''}
            Libre hoy a las {estadoActual.hora_estimada_libre || '—'}
            {estadoActual.minutos_restantes > 0
              ? ` (~${estadoActual.minutos_restantes} min)`
              : ''}
          </Text>
        </View>
      )}

      {!estadoActual?.ocupado && fechaSeleccionada === diasBase[0]?.fecha && (
        <View style={styles.badgeLibre}>
          <Text style={styles.badgeLibreText}>Disponible para agendar hoy</Text>
        </View>
      )}

      {duracion?.etiqueta && (
        <Text style={styles.duracionHint}>
          Duración estimada del servicio: {duracion.etiqueta}
        </Text>
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 88 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Fecha</Text>
        {loadingDias ? (
          <ActivityIndicator color={COLORS.primary[500]} style={{ marginVertical: 16 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.diasRow}>
            {diasBase.map((dia) => {
              const habilitado = fechasHabilitadas?.has(dia.fecha);
              const sel = fechaSeleccionada === dia.fecha;
              return (
                <TouchableOpacity
                  key={dia.fecha}
                  style={[
                    styles.diaChip,
                    !habilitado && styles.diaChipDisabled,
                    sel && styles.diaChipSelected,
                  ]}
                  disabled={!habilitado}
                  onPress={() => setFechaSeleccionada(dia.fecha)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.diaLabel, sel && styles.diaLabelSelected]}>{dia.label}</Text>
                  <Text style={[styles.diaNum, sel && styles.diaNumSelected]}>{dia.diaNum}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>Horario</Text>
        {loadingSlots ? (
          <ActivityIndicator color={COLORS.primary[500]} style={{ marginVertical: 20 }} />
        ) : !fechaSeleccionada ? (
          <Text style={styles.hint}>Selecciona un día disponible</Text>
        ) : slots.length === 0 ? (
          <View style={styles.emptySlots}>
            <CalendarDays size={28} color={COLORS.neutral.gray[400]} />
            <Text style={styles.hint}>Sin horarios libres este día</Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((slot) => {
              const sel = slotSeleccionado?.hora === slot.hora;
              return (
                <TouchableOpacity
                  key={slot.hora}
                  style={[styles.slotChip, sel && styles.slotChipSelected]}
                  onPress={() => setSlotSeleccionado(slot)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.slotHora, sel && styles.slotHoraSelected]}>{slot.hora}</Text>
                  {slot.hora_fin_estimada ? (
                    <Text style={[styles.slotFin, sel && styles.slotFinSelected]}>
                      hasta ~{slot.hora_fin_estimada}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, (!fechaSeleccionada || !slotSeleccionado) && styles.confirmBtnDisabled]}
          onPress={handleConfirmar}
          disabled={!fechaSeleccionada || !slotSeleccionado}
          activeOpacity={0.9}
        >
          <Text style={styles.confirmBtnText}>Confirmar horario</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.secondary,
  },
  headerText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  headerSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  badgeOcupado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.warning[50],
    borderWidth: 1,
    borderColor: COLORS.warning[200],
  },
  badgeOcupadoText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.warning[800],
  },
  badgeLibre: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    alignSelf: 'flex-start',
    borderRadius: BORDERS.radius.full,
    backgroundColor: withOpacity(COLORS.success[500], 0.12),
  },
  badgeLibreText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.success[700],
  },
  duracionHint: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
  },
  scroll: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  diasRow: {
    flexGrow: 0,
    marginBottom: SPACING.xs,
  },
  diaChip: {
    width: 56,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  diaChipDisabled: {
    opacity: 0.35,
  },
  diaChipSelected: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
    ...SHADOWS.sm,
  },
  diaLabel: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  diaLabelSelected: {
    color: COLORS.text.inverse,
  },
  diaNum: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginTop: 2,
  },
  diaNumSelected: {
    color: COLORS.text.inverse,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  slotChip: {
    minWidth: '30%',
    flexGrow: 1,
    maxWidth: '48%',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.background.secondary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    alignItems: 'center',
  },
  slotChipSelected: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  slotHora: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  slotHoraSelected: {
    color: COLORS.text.inverse,
  },
  slotFin: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  slotFinSelected: {
    color: withOpacity(COLORS.text.inverse, 0.85),
  },
  hint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginVertical: SPACING.lg,
  },
  emptySlots: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  errorText: {
    color: COLORS.error.main,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginVertical: SPACING.md,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.background.default,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary[500],
    borderRadius: BORDERS.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmBtnText: {
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
