import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Clock, CalendarDays } from 'lucide-react-native';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import { SHADOWS } from '../../design-system/tokens/shadows';
import {
  generarDiasCalendario,
  obtenerDisponibilidadConDuracion,
  resolverFechasAgendaReales,
} from '../../services/disponibilidadProveedorService';
import {
  PASO_FORMULARIO_UBICACION,
  resolveAgendaParams,
  shouldFinalizarSolicitudEnCalendario,
} from '../../utils/calendarioProveedorNavigation';
import {
  buildConfirmarCandidatoPayload,
  confirmarCandidato,
} from '../../services/agendamientoAsistidoService';
import { ROUTES } from '../../utils/constants';
import { showAlert, showAlertButtons } from '../../utils/platformAlert';

/**
 * Selección de fecha y hora según agenda real del proveedor (ventanas libres + duración del servicio).
 */
export default function CalendarioProveedorScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const webScreenFrame =
    Platform.OS === 'web'
      ? {
          height: windowHeight,
          maxHeight: windowHeight,
          minHeight: 0,
          flex: 1,
          overflow: 'hidden',
        }
      : null;

  const routeParams = route.params || {};
  const {
    proveedorNombre = 'Proveedor',
    returnRoute = ROUTES.CREAR_SOLICITUD,
    returnParams = {},
    pasoDestinoTrasCalendario = PASO_FORMULARIO_UBICACION,
  } = routeParams;

  const agendaParams = useMemo(() => {
    const ctx = routeParams.agendaContext;
    if (ctx?.tipoProveedor && ctx?.proveedorId) {
      return {
        tipoProveedor: ctx.tipoProveedor,
        proveedorId: ctx.proveedorId,
        ofertaServicioId: ctx.ofertaServicioId ?? null,
      };
    }
    return resolveAgendaParams({
      routeParams: { ...returnParams, ...routeParams },
      servicios: returnParams?.servicios_seleccionados,
    });
  }, [routeParams, returnParams]);

  const tipoNorm =
    agendaParams.tipoProveedor === 'mecanico' || agendaParams.tipoProveedor === 'domicilio'
      ? 'mecanico'
      : agendaParams.tipoProveedor === 'taller'
        ? 'taller'
        : null;
  const proveedorId = agendaParams.proveedorId;
  const ofertaServicioId = agendaParams.ofertaServicioId;

  const diasBase = useMemo(() => generarDiasCalendario(14), []);
  const [fechasHabilitadas, setFechasHabilitadas] = useState(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [disponibilidadDia, setDisponibilidadDia] = useState(null);
  const [loadingDias, setLoadingDias] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState(null);
  const [agendaSinDias, setAgendaSinDias] = useState(false);
  const [confirmandoSolicitud, setConfirmandoSolicitud] = useState(false);
  const [solicitudConfirmada, setSolicitudConfirmada] = useState(false);
  const confirmandoSolicitudRef = useRef(false);
  const solicitudConfirmadaRef = useRef(false);

  const finalizarSolicitudCatalogo = useMemo(
    () => shouldFinalizarSolicitudEnCalendario({ returnRoute, returnParams }),
    [returnRoute, returnParams],
  );

  const cargarDias = useCallback(async () => {
    if (!proveedorId || !tipoNorm) {
      setError(
        !tipoNorm
          ? 'No se pudo identificar el tipo de proveedor (taller o mecánico a domicilio).'
          : 'Proveedor no válido',
      );
      setLoadingDias(false);
      return;
    }
    try {
      setLoadingDias(true);
      setError(null);
      setAgendaSinDias(false);
      const { fechas, sinHorarioConfigurado } = await resolverFechasAgendaReales({
        tipoProveedor: tipoNorm,
        proveedorId,
        ofertaServicioId,
        diasCalendario: diasBase,
      });
      if (sinHorarioConfigurado) {
        setError(
          'Este proveedor aún no configuró su horario de atención semanal en la app de proveedor.',
        );
        setFechasHabilitadas(new Set());
        setAgendaSinDias(true);
        setFechaSeleccionada(null);
        return;
      }
      const setFechas = new Set(fechas);
      setFechasHabilitadas(setFechas);
      const primera = diasBase.find((d) => setFechas.has(d.fecha));
      if (primera) {
        setFechaSeleccionada(primera.fecha);
      } else {
        setAgendaSinDias(true);
        setFechaSeleccionada(null);
      }
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
      showAlert('Error', e?.message || 'No se pudieron cargar los horarios');
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

  const irADetalleSolicitudCreada = useCallback(
    (solicitudId) => {
      if (solicitudId) {
        navigation.reset({
          index: 1,
          routes: [
            { name: 'TabNavigator' },
            { name: ROUTES.DETALLE_SOLICITUD, params: { solicitudId } },
          ],
        });
        return;
      }
      navigation.reset({
        index: 1,
        routes: [
          { name: 'TabNavigator' },
          { name: ROUTES.MIS_SOLICITUDES },
        ],
      });
    },
    [navigation],
  );

  const handleConfirmarYFinalizarSolicitud = useCallback(async () => {
    const { formPayload, pendingConfirmOferta } = returnParams;
    if (!formPayload || !pendingConfirmOferta?.oferta_servicio_id) {
      showAlert('Error', 'Faltan datos para confirmar la solicitud.');
      return;
    }
    if (confirmandoSolicitudRef.current || solicitudConfirmadaRef.current) return;
    confirmandoSolicitudRef.current = true;
    setConfirmandoSolicitud(true);
    try {
      const payload = buildConfirmarCandidatoPayload(
        {
          ...formPayload,
          fecha_preferida: fechaSeleccionada,
          hora_preferida: slotSeleccionado.hora || null,
        },
        pendingConfirmOferta.oferta_servicio_id,
        {
          score_match: pendingConfirmOferta.score_match,
          oferta_servicio_ids: pendingConfirmOferta.oferta_servicio_ids,
        },
      );
      const resultado = await confirmarCandidato(payload);
      const solicitudId = resultado?.solicitud_id || resultado?.solicitud?.id;
      solicitudConfirmadaRef.current = true;
      setSolicitudConfirmada(true);

      const titulo = 'Solicitud enviada';
      const mensaje = 'El proveedor fue notificado con tu horario preferido.';

      if (Platform.OS === 'web') {
        showAlert(titulo, mensaje);
        irADetalleSolicitudCreada(solicitudId);
        return;
      }

      showAlertButtons(titulo, mensaje, [
        {
          text: 'Ver solicitud',
          onPress: () => irADetalleSolicitudCreada(solicitudId),
        },
      ]);
    } catch (e) {
      const mensaje =
        e.response?.data?.error
        || e.message
        || 'No se pudo confirmar el proveedor';
      showAlert('Error', mensaje);
      confirmandoSolicitudRef.current = false;
      setConfirmandoSolicitud(false);
    }
  }, [
    returnParams,
    fechaSeleccionada,
    slotSeleccionado,
    irADetalleSolicitudCreada,
  ]);

  const handleConfirmar = useCallback(() => {
    if (confirmandoSolicitudRef.current || solicitudConfirmadaRef.current) return;
    if (!fechaSeleccionada || !slotSeleccionado) {
      showAlert('Selecciona horario', 'Elige un día y una hora disponible.');
      return;
    }
    if (finalizarSolicitudCatalogo) {
      void handleConfirmarYFinalizarSolicitud();
      return;
    }
    const paramsVuelta = {
      ...returnParams,
      slotSeleccionado: {
        fecha: fechaSeleccionada,
        hora: slotSeleccionado.hora,
        hora_fin_estimada: slotSeleccionado.hora_fin_estimada,
      },
    };
    paramsVuelta.pasoDestinoTrasCalendario = pasoDestinoTrasCalendario;
    navigation.navigate({
      name: returnRoute,
      params: paramsVuelta,
      merge: true,
    });
  }, [
    fechaSeleccionada,
    slotSeleccionado,
    finalizarSolicitudCatalogo,
    handleConfirmarYFinalizarSolicitud,
    returnParams,
    pasoDestinoTrasCalendario,
    returnRoute,
    navigation,
  ]);

  const confirmarDeshabilitado =
    !fechaSeleccionada
    || !slotSeleccionado
    || confirmandoSolicitud
    || solicitudConfirmada;

  return (
    <View style={[styles.container, webScreenFrame]}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: insets.top + SPACING.xs }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <CalendarDays size={16} color={COLORS.primary[500]} />
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Elegir horario</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {proveedorNombre}
            </Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.scrollHost}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 88 }]}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
          keyboardShouldPersistTaps="handled"
          {...(Platform.OS === 'web' ? { nestedScrollEnabled: true } : {})}
        >
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

        {duracion?.etiqueta ? (
          <Text style={styles.duracionHint}>
            Duración estimada: {duracion.etiqueta}
          </Text>
        ) : null}
        <Text style={styles.preferenciaHint}>
          Elige el horario que prefieres. El proveedor lo confirma al responder tu solicitud.
        </Text>
        <Text style={styles.sectionLabel}>Fecha</Text>
        {loadingDias ? (
          <ActivityIndicator color={COLORS.primary[500]} style={{ marginVertical: 16 }} />
        ) : (
          <>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {agendaSinDias && !error ? (
              <Text style={styles.hint}>
                No hay horarios libres en los próximos 14 días según su agenda y la duración de este
                servicio (puede haber citas ya reservadas).
              </Text>
            ) : null}
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
          </>
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
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.sm }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, confirmarDeshabilitado && styles.confirmBtnDisabled]}
          onPress={() => {
            if (confirmarDeshabilitado) return;
            handleConfirmar();
          }}
          disabled={confirmarDeshabilitado}
          activeOpacity={0.9}
          {...(Platform.OS === 'web' ? { accessibilityState: { disabled: confirmarDeshabilitado } } : {})}
        >
          {confirmandoSolicitud ? (
            <ActivityIndicator color={COLORS.text.inverse} />
          ) : (
            <Text style={styles.confirmBtnText}>
              {finalizarSolicitudCatalogo ? 'Confirmar solicitud' : 'Usar este horario'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web' ? { height: '100vh' } : null),
  },
  scrollHost: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web' ? { overflow: 'hidden' } : null),
  },
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  headerTitles: {
    alignItems: 'center',
    maxWidth: '85%',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? {
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          minHeight: 0,
          overflow: 'scroll',
          WebkitOverflowScrolling: 'touch',
        }
      : null),
  },
  badgeOcupado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
  },
  preferenciaHint: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  scroll: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
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
    flexShrink: 0,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.background.paper,
    borderTopWidth: BORDERS.width.thin,
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
