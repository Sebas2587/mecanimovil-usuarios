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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Clock, CalendarDays } from 'lucide-react-native';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import { SHADOWS } from '../../design-system/tokens/shadows';
import SolicitudFlowHeader from '../../components/solicitudes/SolicitudFlowHeader';
import StickyFooterCTA from '../../components/base/StickyFooterCTA/StickyFooterCTA';
import {
  generarDiasCalendario,
  obtenerDisponibilidadConDuracion,
  obtenerMecanicosAptosAgenda,
  resolverFechasAgendaReales,
} from '../../services/disponibilidadProveedorService';
import { modalidadLabel } from '../../utils/providerModalidad';
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
  const [mecanicosAptos, setMecanicosAptos] = useState([]);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState(null);
  const [loadingMecanicos, setLoadingMecanicos] = useState(false);
  const confirmandoSolicitudRef = useRef(false);
  const solicitudConfirmadaRef = useRef(false);

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
      // Catálogo perfil / comparador: mismo endpoint, sin exigir flag IA en cliente
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
        subtitle={proveedorNombre}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.scrollHost}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
          keyboardShouldPersistTaps="handled"
          {...(Platform.OS === 'web' ? { nestedScrollEnabled: true } : {})}
        >
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

        {!estadoActual?.ocupado && (duracion?.etiqueta || fechaSeleccionada === diasBase[0]?.fecha) ? (
          <View style={styles.metaRow}>
            {!estadoActual?.ocupado && fechaSeleccionada === diasBase[0]?.fecha ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>Hoy disponible</Text>
              </View>
            ) : null}
            {duracion?.etiqueta ? (
              <View style={[styles.metaChip, styles.metaChipMuted]}>
                <Text style={[styles.metaChipText, styles.metaChipTextMuted]}>
                  {duracion.etiqueta}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {requierePickerTecnico ? (
          <>
            <Text style={styles.sectionLabel}>Técnico</Text>
            {loadingMecanicos ? (
              <ActivityIndicator color={COLORS.primary[500]} style={{ marginVertical: 12 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tecnicoCarousel}
              >
                {mecanicosAptos.map((m) => {
                  const sel = miembroSeleccionado === m.id;
                  const modLabel = m.modalidad_display || modalidadLabel(m.modalidad_tecnico);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.tecnicoCard, sel && styles.tecnicoCardSelected]}
                      onPress={() => seleccionarMiembro(m.id)}
                      activeOpacity={0.85}
                    >
                      {m.foto_url ? (
                        <Image source={{ uri: m.foto_url }} style={styles.tecnicoAvatar} />
                      ) : (
                        <View style={styles.tecnicoAvatarPlaceholder}>
                          <Text style={styles.tecnicoAvatarInitial}>
                            {(m.nombre || '?').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.tecnicoNombre, sel && styles.tecnicoNombreSelected]} numberOfLines={2}>
                        {m.nombre}
                      </Text>
                      {modLabel ? (
                        <Text style={[styles.tecnicoModalidad, sel && styles.tecnicoModalidadSelected]} numberOfLines={1}>
                          {modLabel}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </>
        ) : null}

        <Text style={[styles.sectionLabel, requierePickerTecnico && styles.sectionLabelTight]}>Fecha</Text>
        {loadingDias ? (
          <ActivityIndicator color={COLORS.primary[500]} style={{ marginVertical: 16 }} />
        ) : (
          <>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {agendaSinDias && !error ? (
              <Text style={styles.hintCompact}>
                Sin horarios libres en los próximos 14 días.
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

        <Text style={styles.sectionLabel}>Horario</Text>
        {loadingSlots ? (
          <ActivityIndicator color={COLORS.primary[500]} style={{ marginVertical: 12 }} />
        ) : !fechaSeleccionada ? (
          <Text style={styles.hintCompact}>Elige un día</Text>
        ) : slots.length === 0 ? (
          <View style={styles.emptySlots}>
            <CalendarDays size={24} color={COLORS.neutral.gray[400]} />
            <Text style={styles.hintCompact}>Sin horarios este día</Text>
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

      <StickyFooterCTA>
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
  badgeOcupado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.xs,
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
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  metaChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BORDERS.radius.full,
    backgroundColor: withOpacity(COLORS.success[500], 0.12),
  },
  metaChipMuted: {
    backgroundColor: COLORS.neutral.gray[100],
  },
  metaChipText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.success[700],
  },
  metaChipTextMuted: {
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  scroll: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
  },
  sectionLabel: {
    ...TYPOGRAPHY.styles.h6,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  sectionLabelTight: {
    marginTop: SPACING.xs,
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
    backgroundColor: COLORS.neutral.gray[100],
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
    backgroundColor: COLORS.neutral.gray[100],
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
  hintCompact: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.xs,
  },
  emptySlots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  errorText: {
    color: COLORS.error.main,
    ...TYPOGRAPHY.styles.caption,
    marginVertical: SPACING.md,
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
    ...TYPOGRAPHY.styles.button,
    color: COLORS.text.inverse,
  },
  tecnicoCarousel: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  tecnicoCard: {
    width: 112,
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  tecnicoCardSelected: {
    borderColor: COLORS.primary[500],
    backgroundColor: COLORS.primary[50],
  },
  tecnicoAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
  },
  tecnicoAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
    backgroundColor: COLORS.neutral.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tecnicoAvatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary[600],
  },
  tecnicoNombre: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  tecnicoNombreSelected: {
    color: COLORS.primary[700],
  },
  tecnicoModalidad: {
    fontSize: 10,
    color: COLORS.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },
  tecnicoModalidadSelected: {
    color: COLORS.primary[600],
  },
});
