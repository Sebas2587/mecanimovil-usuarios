import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Clock, CalendarDays } from 'lucide-react-native';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import SolicitudFlowHeader from '../../components/solicitudes/SolicitudFlowHeader';
import StickyFooterCTA from '../../components/base/StickyFooterCTA/StickyFooterCTA';
import Button from '../../components/base/Button/Button';
import AgendaBookingSummary from '../../components/booking/AgendaBookingSummary';
import {
  generarDiasCalendario,
  obtenerDisponibilidadConDuracion,
  obtenerMecanicosAptosAgenda,
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
  confirmarCatalogoProveedor,
} from '../../services/agendamientoAsistidoService';
import { ROUTES } from '../../utils/constants';
import { showAlert, showAlertButtons } from '../../utils/platformAlert';
import { resolveServiciosAgendaLabel } from '../../utils/resolveServiciosAgendaLabel';

/**
 * Agenda Airbnb Experiences: tira de días + grilla de horas.
 * Colores del DS (ink / selection / orange) — sin gradiente CTA en chips.
 */
export default function CalendarioProveedorScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

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

  const slotColumns = windowWidth >= 720 ? 3 : 2;
  const slotMaxWidth = `${Math.floor(100 / slotColumns) - 1}%`;

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
  const [mecanicosAptos, setMecanicosAptos] = useState([]);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState(null);
  const [loadingMecanicos, setLoadingMecanicos] = useState(false);
  const confirmandoSolicitudRef = useRef(false);
  const solicitudConfirmadaRef = useRef(false);

  const serviciosAgenda = useMemo(
    () =>
      resolveServiciosAgendaLabel({
        routeParams,
        returnParams,
        disponibilidadDia,
      }),
    [routeParams, returnParams, disponibilidadDia],
  );
  const servicioNombre = serviciosAgenda.label;
  const serviciosNombres = serviciosAgenda.names;

  const finalizarSolicitudCatalogo = useMemo(
    () => shouldFinalizarSolicitudEnCalendario({ returnRoute, returnParams }),
    [returnRoute, returnParams],
  );

  const requierePickerTecnico = tipoNorm === 'taller' && mecanicosAptos.length > 0;

  const cargarMecanicos = useCallback(async () => {
    if (tipoNorm !== 'taller' || !proveedorId) {
      setMecanicosAptos([]);
      setMiembroSeleccionado(null);
      return;
    }
    try {
      setLoadingMecanicos(true);
      const lista = await obtenerMecanicosAptosAgenda({
        tallerId: proveedorId,
        ofertaServicioId,
      });
      setMecanicosAptos(lista);
      if (lista.length === 1) {
        setMiembroSeleccionado(lista[0].id);
      } else if (lista.length === 0) {
        setMiembroSeleccionado(null);
      }
    } catch {
      setMecanicosAptos([]);
      setMiembroSeleccionado(null);
    } finally {
      setLoadingMecanicos(false);
    }
  }, [proveedorId, ofertaServicioId, tipoNorm]);

  useEffect(() => {
    cargarMecanicos();
  }, [cargarMecanicos]);

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
    if (requierePickerTecnico && !miembroSeleccionado) {
      setFechasHabilitadas(new Set());
      setFechaSeleccionada(null);
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
        miembroTallerId: miembroSeleccionado,
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
  }, [proveedorId, ofertaServicioId, tipoNorm, diasBase, miembroSeleccionado, requierePickerTecnico]);

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
        miembroTallerId: miembroSeleccionado,
      });
      setDisponibilidadDia(data);
    } catch (e) {
      showAlert('Error', e?.message || 'No se pudieron cargar los horarios');
      setDisponibilidadDia(null);
    } finally {
      setLoadingSlots(false);
    }
  }, [proveedorId, ofertaServicioId, tipoNorm, miembroSeleccionado]);

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
    const { formPayload, pendingConfirmOferta } = returnParams || {};
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
          miembro_taller_preferido: miembroSeleccionado,
        },
        pendingConfirmOferta.oferta_servicio_id,
        {
          score_match: pendingConfirmOferta.score_match,
          oferta_servicio_ids: pendingConfirmOferta.oferta_servicio_ids,
          tipo_proveedor: pendingConfirmOferta.tipo_proveedor,
          direccion_servicio_texto: pendingConfirmOferta.direccion_servicio_texto,
          lat: pendingConfirmOferta.lat,
          lng: pendingConfirmOferta.lng,
        },
      );
      const esCatalogoPerfil =
        returnRoute === ROUTES.CREAR_SOLICITUD
        || returnParams?.flujoCatalogoProveedor === true
        || returnParams?.fromProviderDetail === true;
      const resultado = esCatalogoPerfil
        ? await confirmarCatalogoProveedor(payload)
        : await confirmarCandidato(payload);
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
    returnRoute,
    fechaSeleccionada,
    slotSeleccionado,
    miembroSeleccionado,
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
        miembroTallerId: miembroSeleccionado,
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
    miembroSeleccionado,
    returnRoute,
    navigation,
  ]);

  const seleccionarMiembro = useCallback((id) => {
    setMiembroSeleccionado(id);
    setFechaSeleccionada(null);
    setSlotSeleccionado(null);
    setFechasHabilitadas(null);
    setDisponibilidadDia(null);
  }, []);

  const seleccionarFecha = useCallback((fecha) => {
    setFechaSeleccionada(fecha);
  }, []);

  const confirmarDeshabilitado =
    !fechaSeleccionada
    || !slotSeleccionado
    || (requierePickerTecnico && !miembroSeleccionado)
    || confirmandoSolicitud
    || solicitudConfirmada;

  return (
    <View style={[styles.container, webScreenFrame]}>
      <SolicitudFlowHeader
        title="Elegir horario"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.scrollHost}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scroll,
            Platform.OS === 'web' && styles.scrollWeb,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
          keyboardShouldPersistTaps="handled"
          {...(Platform.OS === 'web' ? { nestedScrollEnabled: true } : {})}
        >
          <AgendaBookingSummary
            servicioNombre={servicioNombre}
            serviciosNombres={serviciosNombres}
            proveedorNombre={proveedorNombre}
            tipoProveedor={tipoNorm}
            mecanicos={mecanicosAptos}
            miembroSeleccionadoId={miembroSeleccionado}
            onSelectMiembro={seleccionarMiembro}
            loadingMecanicos={loadingMecanicos}
            requierePicker={tipoNorm === 'taller'}
          />

          {estadoActual?.ocupado ? (
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
          ) : null}

          {duracion?.etiqueta ? (
            <Text style={styles.durationLine}>{duracion.etiqueta}</Text>
          ) : null}

          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Fecha</Text>
            {loadingDias ? (
              <ActivityIndicator color={COLORS.icon.active} style={styles.loader} />
            ) : (
              <>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {agendaSinDias && !error ? (
                  <Text style={styles.hintCompact}>
                    Sin horarios libres en los próximos 14 días.
                  </Text>
                ) : null}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.diasRow}
                >
                  {diasBase.map((dia) => {
                    const habilitado = fechasHabilitadas?.has(dia.fecha);
                    const sel = fechaSeleccionada === dia.fecha;
                    return (
                      <TouchableOpacity
                        key={dia.fecha}
                        style={[styles.diaCell, !habilitado && styles.diaCellDisabled]}
                        disabled={!habilitado}
                        onPress={() => seleccionarFecha(dia.fecha)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityState={{ selected: sel, disabled: !habilitado }}
                        accessibilityLabel={`${dia.label} ${dia.diaNum}`}
                      >
                        <Text style={[styles.diaWeekday, sel && styles.diaWeekdaySelected]}>
                          {dia.label}
                        </Text>
                        <View style={[styles.diaCircle, sel && styles.diaCircleSelected]}>
                          <Text style={[styles.diaNum, sel && styles.diaNumSelected]}>
                            {dia.diaNum}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>

          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Horario</Text>
            {loadingSlots ? (
              <ActivityIndicator color={COLORS.icon.active} style={styles.loader} />
            ) : !fechaSeleccionada ? (
              <Text style={styles.hintCompact}>Elige un día</Text>
            ) : slots.length === 0 ? (
              <View style={styles.emptySlots}>
                <CalendarDays size={22} color={COLORS.icon.muted} strokeWidth={1.75} />
                <Text style={styles.hintCompact}>Sin horarios este día</Text>
              </View>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot) => {
                  const sel = slotSeleccionado?.hora === slot.hora;
                  return (
                    <TouchableOpacity
                      key={slot.hora}
                      style={[
                        styles.slotCard,
                        { maxWidth: slotMaxWidth, minWidth: slotColumns === 3 ? '30%' : '46%' },
                        sel && styles.slotCardSelected,
                      ]}
                      onPress={() => setSlotSeleccionado(slot)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityState={{ selected: sel }}
                      accessibilityLabel={
                        slot.hora_fin_estimada
                          ? `${slot.hora}, hasta aproximadamente ${slot.hora_fin_estimada}`
                          : slot.hora
                      }
                    >
                      <Text style={[styles.slotHora, sel && styles.slotHoraSelected]}>
                        {slot.hora}
                      </Text>
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
          </View>
        </ScrollView>
      </View>

      <StickyFooterCTA>
        <Button
          title={finalizarSolicitudCatalogo ? 'Confirmar solicitud' : 'Usar este horario'}
          onPress={handleConfirmar}
          disabled={confirmarDeshabilitado}
          isLoading={confirmandoSolicitud}
          fullWidth
          style={confirmarDeshabilitado ? styles.confirmBtnDisabled : undefined}
        />
      </StickyFooterCTA>
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
  scroll: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  scrollWeb: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  block: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  durationLine: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  loader: {
    marginVertical: SPACING.md,
  },
  badgeOcupado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.warning[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.warning[200],
  },
  badgeOcupadoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.warning[800],
    fontFamily: TYPOGRAPHY.fontFamily.regular,
  },
  diasRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingRight: SPACING.sm,
  },
  diaCell: {
    width: 52,
    alignItems: 'center',
    gap: 8,
  },
  diaCellDisabled: {
    opacity: 0.28,
  },
  diaWeekday: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  diaWeekdaySelected: {
    color: COLORS.text.primary,
  },
  diaCircle: {
    width: 48,
    height: 48,
    borderRadius: BORDERS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: BORDERS.width.thin,
    borderColor: 'transparent',
  },
  diaCircleSelected: {
    backgroundColor: COLORS.selection.fill,
    borderColor: COLORS.selection.fill,
  },
  diaNum: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  diaNumSelected: {
    color: COLORS.selection.onFill,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  slotCard: {
    flexGrow: 1,
    paddingVertical: 16,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    minHeight: 64,
  },
  slotCardSelected: {
    backgroundColor: COLORS.base.inkBlack,
    borderColor: COLORS.base.inkBlack,
  },
  slotHora: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  slotHoraSelected: {
    color: COLORS.selection.onFill,
  },
  slotFin: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    color: COLORS.text.tertiary,
  },
  slotFinSelected: {
    color: withOpacity(COLORS.selection.onFill, 0.85),
  },
  hintCompact: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text.tertiary,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
  },
  emptySlots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  errorText: {
    color: COLORS.error.main,
    ...TYPOGRAPHY.styles.caption,
    marginBottom: SPACING.sm,
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
});
