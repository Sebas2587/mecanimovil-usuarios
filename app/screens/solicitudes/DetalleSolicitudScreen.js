import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Modal,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDERS, SHADOWS, TYPOGRAPHY } from '../../design-system/tokens';

// Services & Context
import chatService from '../../services/chatService';
import solicitudesService from '../../services/solicitudesService';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { ROUTES } from '../../utils/constants';
import { requestDetailQueryKey, useRequestDetail, useChecklistPrincipal, useChecklistsVisiblesPorOrden, checklistPrincipalQueryKey, checklistsVisiblesQueryKey } from '../../hooks/useRequests';
import { useConversationsList } from '../../hooks/useChats';
import { puedeClienteCancelarSolicitudPublica } from '../../utils/solicitudVehicle';
import { formatServiciosListaTexto, resolveServiciosSolicitud } from '../../utils/solicitudServicios';
import { showAlert, showConfirm, showAlertButtons } from '../../utils/platformAlert';
import { calcularMontosPagoOferta, formatearMontoCLP, ofertaEstaTotalmentePagada } from '../../utils/calcularMontoPagoOferta';

// New Components
import ServiceSummaryCard from '../../components/solicitudes/ServiceSummaryCard';
import CertifiedVehicleCard from '../../components/solicitudes/CertifiedVehicleCard';
import OfferCardDetailed from '../../components/solicitudes/OfferCardDetailed';
import ChecklistViewerModal from '../../components/modals/ChecklistViewerModal';
import CustomerSignatureModal from '../../components/checklist/CustomerSignatureModal';
import PagoSaldoPendienteCierreBanner from '../../components/solicitudes/PagoSaldoPendienteCierreBanner';
import DetalleSolicitudSkeleton from '../../components/utils/DetalleSolicitudSkeleton';

const TAB_PRINCIPALES = 'principales';
const TAB_ADICIONALES = 'adicionales';

const ESTADOS_OFERTA_YA_RESUELTA = ['aceptada', 'pendiente_pago', 'pagada', 'en_ejecucion', 'completada', 'rechazada', 'expirada', 'retirada'];
const ESTADOS_OFERTA_ACEPTADA = ['aceptada', 'pendiente_pago', 'pagada', 'en_ejecucion', 'completada'];
const ESTADOS_OFERTA_PAGAR = ['aceptada', 'pendiente_pago'];
function resolverOrdenIdParaChecklist(solicitud, ofertasPrincipales = [], ofertasSecundarias = []) {
  if (!solicitud) return null;
  const toId = (v) => (v != null && v !== '' ? v : null);
  const ss = solicitud.solicitud_servicio;
  const fromDetail = toId(
    solicitud.oferta_seleccionada_detail?.solicitud_servicio_id ??
      solicitud.oferta_seleccionada_detail?.orden_id ??
      solicitud.orden_id ??
      solicitud.solicitud_servicio_id ??
      (ss != null && typeof ss === 'object' ? ss.id : null) ??
      (typeof ss === 'number' ? ss : null),
  );
  if (fromDetail != null) return fromDetail;
  const selectedId = solicitud.oferta_seleccionada;
  if (selectedId == null) return null;
  const all = [...(ofertasPrincipales || []), ...(ofertasSecundarias || [])];
  const win = all.find((o) => o && (o.id === selectedId || String(o.id) === String(selectedId)));
  return toId(win?.solicitud_servicio_id ?? win?.orden_id);
}

/** Altura fija del bloque de botones del header (debajo del safe area). */
const HEADER_CONTENT_HEIGHT = 60;
/** Espacio reservado bajo el scroll para que el contenido no quede tapado por el footer (web: footer fijo). */
const FOOTER_SCROLL_PADDING = 120;

const DetalleSolicitudScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const solicitudId = route.params?.solicitudId ?? route.params?.id ?? null;
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
          position: 'relative',
        }
      : null;

  const { seleccionarOferta, cancelarSolicitud } = useSolicitudes();
  const queryClient = useQueryClient();

  const {
    data: requestBundle,
    isPending,
    isError,
    error: requestError,
    refetch: refetchRequestDetail,
  } = useRequestDetail(solicitudId);

  const solicitud = requestBundle?.solicitud ?? null;
  const ofertas = requestBundle?.ofertas ?? [];
  const ofertasSecundarias = requestBundle?.ofertasSecundarias ?? [];
  const showInitialLoader = Boolean(solicitudId) && isPending && !requestBundle;

  const {
    data: serviceConversations = [],
    refetch: refetchServiceConversations,
  } = useConversationsList('service');

  useFocusEffect(
    useCallback(() => {
      refetchServiceConversations();
    }, [refetchServiceConversations]),
  );

  const solicitudChatUnread = useMemo(() => {
    const sid = solicitud?.id;
    if (sid == null) return 0;
    const conv = serviceConversations.find(
      (c) => c.context_id != null && String(c.context_id) === String(sid),
    );
    return conv?.unread_count ?? 0;
  }, [serviceConversations, solicitud?.id]);

  const serviciosResumenTexto = useMemo(
    () => formatServiciosListaTexto(resolveServiciosSolicitud(solicitud)),
    [solicitud],
  );

  const esPendienteConfirmacion = solicitud?.estado === 'pendiente_confirmacion';

  const ofertasVisibles = useMemo(() => {
    if (!esPendienteConfirmacion) return ofertas;
    const detalle = solicitud?.oferta_seleccionada_detail;
    if (ofertas.length > 0) return ofertas;
    return detalle ? [detalle] : [];
  }, [esPendienteConfirmacion, ofertas, solicitud?.oferta_seleccionada_detail]);

  const ofertaCatalogoActiva = useMemo(() => {
    const selId = solicitud?.oferta_seleccionada;
    return (
      ofertasVisibles.find((o) => o && (o.id === selId || String(o.id) === String(selId)))
      || solicitud?.oferta_seleccionada_detail
      || ofertasVisibles[0]
      || null
    );
  }, [ofertasVisibles, solicitud?.oferta_seleccionada, solicitud?.oferta_seleccionada_detail]);

  const fechaAlternativaPendiente = Boolean(
    ofertaCatalogoActiva?.es_fecha_alternativa
    && ofertaCatalogoActiva?.estado === 'en_chat',
  );

  /** Pago parcial: repuestos confirmados, mano de obra pendiente (OpcionesPago → soloServicioPendiente). */
  const ofertaConSaldoPendiente = useMemo(() => {
    const o = solicitud?.oferta_seleccionada_detail;
    if (!o) return null;
    const repuestosPagados = o.estado_pago_repuestos === 'pagado';
    const servicioPendiente = (o.estado_pago_servicio || 'pendiente') === 'pendiente';
    const esParcial =
      o.estado === 'pagada_parcialmente' || (repuestosPagados && servicioPendiente);
    return esParcial && repuestosPagados && servicioPendiente ? o : null;
  }, [solicitud?.oferta_seleccionada_detail]);

  const montoSaldoPendiente = useMemo(() => {
    if (!ofertaConSaldoPendiente) return null;
    return calcularMontosPagoOferta(ofertaConSaldoPendiente).servicio;
  }, [ofertaConSaldoPendiente]);

  const ordenIdParaChecklist = useMemo(
    () => resolverOrdenIdParaChecklist(solicitud, ofertas, ofertasSecundarias),
    [solicitud, ofertas, ofertasSecundarias],
  );

  const ordenIdsSecundarios = useMemo(
    () => (ofertasSecundarias || [])
      .map((o) => o?.solicitud_servicio_id ?? o?.orden_id)
      .filter((id) => id != null)
      .map(String),
    [ofertasSecundarias],
  );

  const { data: checklistPrincipalBundle } = useChecklistPrincipal(ordenIdParaChecklist);
  const { data: checklistVisiblePorOrdenId = {} } = useChecklistsVisiblesPorOrden(ordenIdsSecundarios);

  const checklistPrincipalVisible = checklistPrincipalBundle?.visible === true;
  const checklistPrincipalData = checklistPrincipalBundle?.data ?? null;

  const [procesando, setProcesando] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [tabActivo, setTabActivo] = useState(TAB_PRINCIPALES);
  const [checklistOrdenId, setChecklistOrdenId] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [fotoAmpliadaUrl, setFotoAmpliadaUrl] = useState(null);

  const pagoPrincipalCompleto = useMemo(
    () => ofertaEstaTotalmentePagada(solicitud?.oferta_seleccionada_detail),
    [solicitud?.oferta_seleccionada_detail],
  );

  const requiereFirmaCliente = useMemo(() => {
    if (!pagoPrincipalCompleto || !checklistPrincipalData) return false;
    return (
      checklistPrincipalData.requiere_firma_cliente === true
      || checklistPrincipalData.estado === 'PENDIENTE_FIRMA_CLIENTE'
    );
  }, [pagoPrincipalCompleto, checklistPrincipalData]);

  const handleSignatureSuccess = useCallback(() => {
    setShowSignatureModal(false);
    queryClient.invalidateQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'requests',
    });
    queryClient.invalidateQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'activeRequests',
    });
    const rk = requestDetailQueryKey(solicitudId);
    if (rk) queryClient.invalidateQueries({ queryKey: rk });
    const ck = checklistPrincipalQueryKey(ordenIdParaChecklist);
    if (ck) queryClient.invalidateQueries({ queryKey: ck });
    const secKey = checklistsVisiblesQueryKey(ordenIdsSecundarios);
    if (secKey) queryClient.invalidateQueries({ queryKey: secKey });
    refetchRequestDetail();
  }, [queryClient, solicitudId, ordenIdParaChecklist, ordenIdsSecundarios, refetchRequestDetail]);

  useEffect(() => {
    if (solicitudId == null || solicitudId === '') {
      navigation.goBack();
    }
  }, [solicitudId, navigation]);

  useEffect(() => {
    if (!isError || !requestError) return;
    console.error('Error loading request details:', requestError);
    showAlertButtons('Error', 'No se pudieron cargar los datos de la solicitud', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }, [isError, requestError, navigation]);

  const closeChecklistModal = useCallback(() => {
    setShowChecklistModal(false);
    setChecklistOrdenId(null);
  }, []);

  // Handlers
  const ejecutarAceptarOferta = async (oferta) => {
    try {
      setProcesando(true);
      const resultado = await seleccionarOferta(solicitudId, oferta.id);

      if (resultado?.estado_resultado === 'esperando_creditos_proveedor') {
        showAlertButtons(
          'Proveedor elegido',
          'El proveedor debe confirmar la adjudicación con créditos en su app antes de que puedas pagar. Podés seguir el estado de la solicitud aquí.',
          [{ text: 'Entendido', onPress: () => refetchRequestDetail() }],
        );
        return;
      }

      if (resultado?.carrito || resultado?.sin_carrito) {
        if (oferta.es_oferta_secundaria) {
          navigation.navigate('OpcionesPago', {
            solicitudId,
            ofertaId: oferta.id,
            origen: 'oferta_secundaria',
          });
        } else {
          navigation.navigate('OpcionesPago', {
            solicitudId,
            origen: 'solicitud_publica',
          });
        }
      } else {
        showAlert('¡Excelente!', 'Oferta aceptada correctamente.');
        refetchRequestDetail();
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      showAlert('Error', 'Hubo un problema al aceptar la oferta. Inténtalo de nuevo.');
    } finally {
      setProcesando(false);
    }
  };

  const handleAceptarOferta = (oferta) => {
    const msg = `¿Estás seguro de que deseas aceptar la oferta de ${oferta.nombre_proveedor} por $${formatearMontoCLP(parseFloat(oferta.precio_total_ofrecido))}?`;
    showConfirm('Confirmar Selección', msg, {
      confirmText: 'Aceptar Oferta',
      onConfirm: () => ejecutarAceptarOferta(oferta),
    });
  };

  const handleChat = async (oferta) => {
    try {
      // Get or create conversation for this offer
      const conversationId = await chatService.getOrCreateConversation({
        ofertaId: oferta.id,
        solicitudId,
        type: 'service'
      });

      navigation.navigate(ROUTES.CHAT_DETAIL, {
        conversationId
      });
    } catch (error) {
      console.error('Error opening chat:', error);
      showAlert('Error', 'No se pudo abrir el chat. Intenta nuevamente.');
    }
  };

  const handleCompararOfertas = () => {
    if (ofertas.length < 2) {
      showAlert('Información', 'Necesitas al menos 2 ofertas para comparar');
      return;
    }
    navigation.navigate(ROUTES.COMPARADOR_OFERTAS, {
      solicitudId,
      ofertas: ofertas.map(o => o.id)
    });
  };

  const handleProfilePress = (oferta) => {
    // proveedor_id_detail = taller.id o mecanico_domicilio.id (perfil del proveedor)
    // oferta.proveedor = usuario.id (FK al modelo Usuario, NO sirve para la API de talleres/mecánicos)
    const providerId = oferta.proveedor_id_detail || oferta.proveedor;
    const providerType = oferta.tipo_proveedor; // 'taller' or 'mecanico'

    if (!providerId) return;

    navigation.navigate(ROUTES.PROVIDER_DETAIL, {
      providerId: providerId,
      providerType: providerType
    });
  };

  const handleConfirmarCancelarSolicitud = useCallback(() => {
    showConfirm(
      'Cancelar solicitud',
      '¿Seguro? Los proveedores con oferta enviada serán notificados. No podrás deshacer esta acción. Si ya elegiste una oferta, no es posible cancelar desde aquí.',
      {
        confirmText: 'Sí, cancelar',
        onConfirm: async () => {
          try {
            setProcesando(true);
            await cancelarSolicitud(solicitudId);
            showAlert(
              'Solicitud cancelada',
              'Se notificó a los proveedores que tenían ofertas pendientes.',
            );
            navigation.goBack();
          } catch (error) {
            console.error('Error cancelling request:', error);
            const msg =
              error?.response?.data?.error ||
              error?.message ||
              'No se pudo cancelar la solicitud.';
            showAlert('Error', String(msg));
          } finally {
            setProcesando(false);
          }
        },
      },
    );
  }, [solicitudId, cancelarSolicitud, navigation]);

  const handleAceptarFechaCatalogo = useCallback(() => {
    if (!ofertaCatalogoActiva?.id) return;
    showConfirm(
      'Aceptar nueva fecha',
      '¿Confirmas la fecha propuesta por el proveedor para tu servicio?',
      {
        confirmText: 'Aceptar fecha',
        onConfirm: async () => {
          try {
            setProcesando(true);
            await solicitudesService.aceptarFechaCatalogo(ofertaCatalogoActiva.id);
            showAlert(
              'Fecha actualizada',
              'El proveedor fue notificado. Te avisaremos cuando confirme la asignación.',
            );
            refetchRequestDetail();
          } catch (error) {
            const msg =
              error?.response?.data?.error
              || error?.message
              || 'No se pudo aceptar la fecha';
            showAlert('Error', String(msg));
          } finally {
            setProcesando(false);
          }
        },
      },
    );
  }, [ofertaCatalogoActiva?.id, refetchRequestDetail]);

  const skeletonPaddingBottom =
    Platform.OS === 'web'
      ? Math.max(insets.bottom, 16) + FOOTER_SCROLL_PADDING
      : SPACING.section + SPACING.lg + Math.max(insets.bottom, 8);

  if (!solicitudId) {
    return (
      <View
        style={[
          styles.loadingContainer,
          Platform.OS === 'web' && styles.loadingContainerWeb,
          Platform.OS === 'web' && webScreenFrame,
        ]}
      >
        <Text style={styles.loadingText}>Solicitud no encontrada</Text>
      </View>
    );
  }

  if (showInitialLoader) {
    return (
      <DetalleSolicitudSkeleton
        paddingTop={insets.top}
        contentPaddingBottom={skeletonPaddingBottom}
        webScreenFrame={Platform.OS === 'web' ? webScreenFrame : null}
      />
    );
  }

  if (!solicitud) return null;

  return (
    <View style={[styles.container, webScreenFrame]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Detalle de Solicitud</Text>
            <Text style={styles.headerSubtitle}>ID: {String(solicitudId).slice(0, 8)}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={styles.scrollHost}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + HEADER_CONTENT_HEIGHT,
              paddingBottom:
                Platform.OS === 'web'
                  ? Math.max(insets.bottom, 16) + FOOTER_SCROLL_PADDING
                  : SPACING.section + SPACING.lg + Math.max(insets.bottom, 8),
            },
          ]}
          showsVerticalScrollIndicator={Platform.OS !== 'web'}
          keyboardShouldPersistTaps="handled"
          {...(Platform.OS === 'web' ? { nestedScrollEnabled: true } : {})}
        >
        {/* 1) Vehículo (primero) */}
        {solicitud.vehiculo_info && (
          <CertifiedVehicleCard vehiculo={solicitud.vehiculo_info} />
        )}

        {/* 2) Detalle de Solicitud */}
        <ServiceSummaryCard
          solicitud={solicitud}
          checklistPendienteFirma={requiereFirmaCliente}
        />

        {esPendienteConfirmacion ? (
          <View style={styles.catalogoBanner}>
            <Ionicons name="hourglass-outline" size={22} color={COLORS.primary[600]} />
            <View style={styles.catalogoBannerTextWrap}>
              <Text style={styles.catalogoBannerTitle}>Esperando confirmación del proveedor</Text>
              <Text style={styles.catalogoBannerSub}>
                Elegiste un servicio del catálogo. El proveedor debe confirmar antes de que puedas pagar.
              </Text>
            </View>
          </View>
        ) : null}

        {fechaAlternativaPendiente && ofertaCatalogoActiva ? (
          <View style={styles.fechaAlternativaCard}>
            <Text style={styles.fechaAlternativaTitle}>Nueva fecha propuesta</Text>
            <Text style={styles.fechaAlternativaBody}>
              {ofertaCatalogoActiva.fecha_disponible}
              {ofertaCatalogoActiva.hora_disponible
                ? ` · ${String(ofertaCatalogoActiva.hora_disponible).substring(0, 5)}`
                : ''}
            </Text>
            {ofertaCatalogoActiva.miembro_taller_detail ? (
              <View style={styles.tecnicoPropuestoRow}>
                {ofertaCatalogoActiva.miembro_taller_detail.foto_url ? (
                  <Image
                    source={{ uri: ofertaCatalogoActiva.miembro_taller_detail.foto_url }}
                    style={styles.tecnicoPropuestoAvatar}
                  />
                ) : (
                  <View style={styles.tecnicoPropuestoAvatarPlaceholder}>
                    <Ionicons name="person" size={18} color={COLORS.primary[500]} />
                  </View>
                )}
                <View style={styles.tecnicoPropuestoInfo}>
                  <Text style={styles.tecnicoPropuestoNombre}>
                    {ofertaCatalogoActiva.miembro_taller_detail.nombre}
                  </Text>
                  {ofertaCatalogoActiva.es_cambio_tecnico ? (
                    <Text style={styles.tecnicoPropuestoHint}>
                      El proveedor propone otro técnico para este servicio
                    </Text>
                  ) : ofertaCatalogoActiva.miembro_taller_detail.especialidades?.length ? (
                    <Text style={styles.tecnicoPropuestoHint} numberOfLines={2}>
                      {ofertaCatalogoActiva.miembro_taller_detail.especialidades
                        .map((e) => e.nombre)
                        .join(' · ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}
            {ofertaCatalogoActiva.motivo_fecha_alternativa ? (
              <Text style={styles.fechaAlternativaMotivo}>
                {ofertaCatalogoActiva.motivo_fecha_alternativa}
              </Text>
            ) : null}
            <TouchableOpacity
              style={styles.fechaAlternativaBtn}
              onPress={handleAceptarFechaCatalogo}
              disabled={procesando}
            >
              <Text style={styles.fechaAlternativaBtnText}>Aceptar esta fecha</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {Array.isArray(solicitud.fotos_necesidad) && solicitud.fotos_necesidad.length > 0 && (
          <View style={styles.fotosNecesidadSection}>
            <Text style={styles.fotosNecesidadTitle}>Fotos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fotosNecesidadRow}>
              {solicitud.fotos_necesidad.map((foto) => {
                const url = foto?.imagen_url;
                if (!url) return null;
                return (
                  <TouchableOpacity
                    key={foto.id || url}
                    onPress={() => setFotoAmpliadaUrl(url)}
                    activeOpacity={0.85}
                    style={styles.fotosNecesidadThumbWrap}
                  >
                    <Image source={{ uri: url }} style={styles.fotosNecesidadThumb} contentFit="cover" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {ofertaConSaldoPendiente && checklistPrincipalVisible && !requiereFirmaCliente ? (
          <PagoSaldoPendienteCierreBanner
            montoSaldo={montoSaldoPendiente}
            onPagar={() =>
              navigation.navigate('OpcionesPago', {
                solicitudId,
                origen: 'solicitud_publica',
                ofertaId: ofertaConSaldoPendiente.id,
              })
            }
          />
        ) : null}

        {/* C. Tabs: Ofertas recibidas | Ofertas adicionales */}
        <View style={styles.tabSection}>
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[styles.segmentButton, tabActivo === TAB_PRINCIPALES && styles.segmentActive]}
              onPress={() => setTabActivo(TAB_PRINCIPALES)}
            >
              <Text style={[styles.segmentText, tabActivo === TAB_PRINCIPALES && styles.segmentTextActive]}>
                Ofertas recibidas
              </Text>
              {ofertas.length > 0 && (
                <View style={styles.segmentBadge}>
                  <Text style={styles.segmentBadgeText}>{ofertas.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            {ofertasSecundarias.length > 0 && (
              <TouchableOpacity
                style={[styles.segmentButton, tabActivo === TAB_ADICIONALES && styles.segmentActive]}
                onPress={() => setTabActivo(TAB_ADICIONALES)}
              >
                <Text style={[styles.segmentText, tabActivo === TAB_ADICIONALES && styles.segmentTextActive]}>
                  Ofertas adicionales
                </Text>
                <View style={styles.segmentBadge}>
                  <Text style={styles.segmentBadgeText}>{ofertasSecundarias.length}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Contenido según tab activo */}
          {tabActivo === TAB_PRINCIPALES && (
            <View style={styles.offersSection}>
              {ofertasVisibles.length > 0 ? (
                <>
                  {!esPendienteConfirmacion && ofertasVisibles.length > 1 && (
                    <View style={styles.offersHeader}>
                      <View style={styles.offersTitleRow}>
                        <View>
                          <Text style={styles.offersTitle}>Ofertas Recibidas ({ofertasVisibles.length})</Text>
                          <Text style={styles.offersSubtitle}>Compara y elige la mejor opción</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.compareButton}
                          onPress={handleCompararOfertas}
                        >
                          <Ionicons name="git-compare-outline" size={16} color={COLORS.primary[500]} />
                          <Text style={styles.compareButtonText}>Comparar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {esPendienteConfirmacion ? (
                    <Text style={styles.offersSubtitle}>Tu elección del catálogo</Text>
                  ) : null}
                  {ofertasVisibles.map((oferta) => {
                    const postDecisionStates = ['adjudicada', 'pendiente_pago', 'en_proceso', 'checklist_en_progreso', 'checklist_completado', 'completada', 'finalizada', 'calificada', 'cancelada'];
                    const isWinner = solicitud.oferta_seleccionada === oferta.id;
                    const isFinalState = postDecisionStates.includes(solicitud.estado);
                    const isDisabled = procesando || isFinalState || esPendienteConfirmacion;
                    return (
                      <OfferCardDetailed
                        key={oferta.id}
                        oferta={oferta}
                        solicitud={solicitud}
                        chatUnreadCount={solicitudChatUnread}
                        onChatPress={handleChat}
                        onAceptarPress={handleAceptarOferta}
                        onProfilePress={handleProfilePress}
                        disabled={isDisabled}
                        isAccepted={isWinner || esPendienteConfirmacion}
                        catalogoPendienteConfirmacion={esPendienteConfirmacion && isWinner}
                        checklistPendienteFirma={isWinner && requiereFirmaCliente}
                      />
                    );
                  })}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="documents-outline" size={48} color={COLORS.text.disabled} />
                  <Text style={styles.emptyStateText}>
                    {esPendienteConfirmacion
                      ? 'Cargando tu elección del catálogo…'
                      : 'Aún no hay ofertas para esta solicitud.'}
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    {esPendienteConfirmacion
                      ? 'Si tarda, actualiza la pantalla.'
                      : 'Te notificaremos cuando los proveedores respondan.'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {tabActivo === TAB_ADICIONALES && ofertasSecundarias.length > 0 && (
            <View style={[styles.offersSection, styles.ofertasAdicionalesSection]}>
              <View style={styles.offersHeader}>
                <View>
                  <Text style={styles.offersTitle}>Ofertas adicionales del proveedor</Text>
                  <Text style={styles.offersSubtitle}>
                    Para esta misma solicitud, el proveedor te envió nuevas opciones (alternativas a su oferta anterior).
                  </Text>
                </View>
              </View>
              {ofertasSecundarias.map((oferta) => {
                const isWinnerSec = ESTADOS_OFERTA_ACEPTADA.includes(oferta?.estado);
                const isDisabledSec = procesando || ESTADOS_OFERTA_YA_RESUELTA.includes(oferta?.estado);
                const fechaOriginal = oferta.oferta_original_info?.fecha_envio
                  ? new Date(oferta.oferta_original_info.fecha_envio).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
                  : null;
                const nombreServicio = serviciosResumenTexto !== 'Sin servicios'
                  ? serviciosResumenTexto
                  : 'Servicio';
                return (
                  <View key={oferta.id} style={styles.ofertaSecundariaWrapper}>
                    <View style={styles.referenciaSolicitudBar}>
                      <Ionicons name="link-outline" size={14} color={COLORS.text.tertiary} />
                      <Text style={styles.referenciaSolicitudText}>
                        Oferta adicional para esta solicitud ({nombreServicio})
                        {fechaOriginal ? ` · Alternativa a la oferta del ${fechaOriginal}` : ''}
                      </Text>
                    </View>
                    <OfferCardDetailed
                      oferta={oferta}
                      solicitud={solicitud}
                      chatUnreadCount={solicitudChatUnread}
                      onChatPress={handleChat}
                      onAceptarPress={handleAceptarOferta}
                      onProfilePress={handleProfilePress}
                      disabled={isDisabledSec}
                      isAccepted={isWinnerSec}
                      esOfertaSecundaria={true}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>

        </ScrollView>
      </View>

      {/* Footer de Acciones (contextual según tab) */}
      <View
        style={[
          styles.footer,
          Platform.OS === 'web' && styles.footerWeb,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={styles.footerContent}>
          {puedeClienteCancelarSolicitudPublica(solicitud) ? (
            <TouchableOpacity
              style={[styles.footerCancelLikeAccept, procesando && styles.footerCancelLikeAcceptDisabled]}
              onPress={handleConfirmarCancelarSolicitud}
              disabled={procesando}
              accessibilityLabel="Cancelar solicitud"
              accessibilityRole="button"
            >
              <Text style={styles.footerCancelLikeAcceptText}>Cancelar solicitud</Text>
              <Ionicons name="close-circle-outline" size={18} color={COLORS.text.onError} />
            </TouchableOpacity>
          ) : null}

          {tabActivo === TAB_PRINCIPALES ? (
            <>
              {(() => {
                const showPagar = ['pendiente_pago', 'adjudicada'].includes(solicitud.estado);
                const showPagarSaldo = ofertaConSaldoPendiente != null;
                const showChecklist = checklistPrincipalVisible;
                const showFirmar = requiereFirmaCliente;

                const openChecklistPrincipal = () => {
                  setChecklistOrdenId(null);
                  setShowChecklistModal(true);
                };

                const irOpcionesPago = () =>
                  navigation.navigate('OpcionesPago', {
                    solicitudId,
                    origen: 'solicitud_publica',
                    ofertaId: ofertaConSaldoPendiente?.id,
                  });

                if (showFirmar && showChecklist) {
                  return (
                    <View style={styles.footerActionsRow}>
                      <TouchableOpacity
                        style={[styles.footerPrimaryCta, styles.footerPrimaryCtaInRow]}
                        onPress={() => setShowSignatureModal(true)}
                      >
                        <Text style={styles.footerPrimaryCtaText}>Revisar y firmar</Text>
                        <Ionicons name="create-outline" size={18} color={COLORS.text.onPrimary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.footerSecondaryCta} onPress={openChecklistPrincipal}>
                        <Text style={styles.footerSecondaryCtaText}>Ver Checklist</Text>
                        <Ionicons name="clipboard-outline" size={18} color={COLORS.text.primary} />
                      </TouchableOpacity>
                    </View>
                  );
                }

                if (showPagarSaldo) {
                  return (
                    <View style={showChecklist ? styles.footerActionsRow : styles.footerActionsSingle}>
                      <TouchableOpacity
                        style={[styles.footerPrimaryCta, showChecklist && styles.footerPrimaryCtaInRow]}
                        onPress={irOpcionesPago}
                      >
                        <Text style={styles.footerPrimaryCtaText} numberOfLines={2}>
                          Pagar saldo restante (${formatearMontoCLP(montoSaldoPendiente)})
                        </Text>
                        <Ionicons name="card-outline" size={18} color={COLORS.text.onPrimary} />
                      </TouchableOpacity>
                      {showChecklist ? (
                        <TouchableOpacity style={styles.footerSecondaryCta} onPress={openChecklistPrincipal}>
                          <Text style={styles.footerSecondaryCtaText}>Ver Checklist</Text>
                          <Ionicons name="clipboard-outline" size={18} color={COLORS.text.primary} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                }

                if (showPagar) {
                  return (
                    <View style={showChecklist ? styles.footerActionsRow : styles.footerActionsSingle}>
                      <TouchableOpacity
                        style={[styles.footerPrimaryCta, showChecklist && styles.footerPrimaryCtaInRow]}
                        onPress={() =>
                          navigation.navigate('OpcionesPago', {
                            solicitudId,
                            origen: 'solicitud_publica',
                          })
                        }
                      >
                        <Text style={styles.footerPrimaryCtaText}>Ir a Pagar</Text>
                        <Ionicons name="card-outline" size={18} color={COLORS.text.onPrimary} />
                      </TouchableOpacity>
                      {showChecklist ? (
                        <TouchableOpacity style={styles.footerSecondaryCta} onPress={openChecklistPrincipal}>
                          <Text style={styles.footerSecondaryCtaText}>Ver Checklist</Text>
                          <Ionicons name="clipboard-outline" size={18} color={COLORS.text.primary} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                }

                if (showChecklist) {
                  return (
                    <View style={styles.footerActionsSingle}>
                      <TouchableOpacity
                        style={styles.footerPrimaryCta}
                        onPress={openChecklistPrincipal}
                      >
                        <Text style={styles.footerPrimaryCtaText}>Ver Checklist</Text>
                        <Ionicons name="clipboard-outline" size={18} color={COLORS.text.onPrimary} />
                      </TouchableOpacity>
                    </View>
                  );
                }

                if (showFirmar) {
                  return (
                    <View style={styles.footerActionsSingle}>
                      <TouchableOpacity
                        style={styles.footerPrimaryCta}
                        onPress={() => setShowSignatureModal(true)}
                      >
                        <Text style={styles.footerPrimaryCtaText}>Revisar y firmar</Text>
                        <Ionicons name="create-outline" size={18} color={COLORS.text.onPrimary} />
                      </TouchableOpacity>
                    </View>
                  );
                }

                return null;
              })()}
            </>
          ) : (() => {
            const ofertaParaPagar = ofertasSecundarias.find((o) =>
              ESTADOS_OFERTA_PAGAR.includes(o?.estado),
            );
            const ofertaConChecklist = ofertasSecundarias.find((o) => {
              const ordenId = o?.solicitud_servicio_id ?? o?.orden_id;
              return ordenId != null && checklistVisiblePorOrdenId[String(ordenId)] === true;
            });
            const hayAcciones = ofertaParaPagar || ofertaConChecklist;
            const hayAmbasAcciones = ofertaParaPagar && ofertaConChecklist;
            return (
              <>
                {hayAcciones ? (
                  <View style={hayAmbasAcciones ? styles.footerActionsRow : styles.footerActionsSingle}>
                    {ofertaParaPagar ? (
                      <TouchableOpacity
                        style={[styles.footerPrimaryCta, hayAmbasAcciones && styles.footerPrimaryCtaInRow]}
                        onPress={() =>
                          navigation.navigate('OpcionesPago', {
                            solicitudId,
                            ofertaId: ofertaParaPagar.id,
                            origen: 'oferta_secundaria',
                          })
                        }
                      >
                        <Text style={styles.footerPrimaryCtaText}>Ir a Pagar</Text>
                        <Ionicons name="card-outline" size={18} color={COLORS.text.onPrimary} />
                      </TouchableOpacity>
                    ) : null}
                    {ofertaConChecklist ? (
                      <TouchableOpacity
                        style={
                          hayAmbasAcciones
                            ? styles.footerSecondaryCta
                            : styles.footerPrimaryCta
                        }
                        onPress={() => {
                          setChecklistOrdenId(
                            ofertaConChecklist.solicitud_servicio_id ?? ofertaConChecklist.orden_id,
                          );
                          setShowChecklistModal(true);
                        }}
                      >
                        <Text
                          style={
                            hayAmbasAcciones
                              ? styles.footerSecondaryCtaText
                              : styles.footerPrimaryCtaText
                          }
                        >
                          Ver Checklist
                        </Text>
                        <Ionicons
                          name="clipboard-outline"
                          size={18}
                          color={hayAmbasAcciones ? COLORS.text.primary : COLORS.text.onPrimary}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
                {!hayAcciones && (
                  <View style={[styles.footerHintBadge, styles.footerHintBadgeStandalone]}>
                    <Text style={styles.footerHintBadgeText}>
                      Acepta una oferta adicional para poder pagar y ver su checklist.
                    </Text>
                  </View>
                )}
              </>
            );
          })()}
        </View>
      </View>

      {/* Overlay de procesamiento */}
      {
        procesando && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary[500]} />
            <Text style={styles.processingText}>Procesando...</Text>
          </View>
        )
      }

      {/* Modal checklist: orden principal o de oferta secundaria según origen */}
      {solicitud && (
        <ChecklistViewerModal
          visible={showChecklistModal}
          onClose={closeChecklistModal}
          ordenId={checklistOrdenId ?? ordenIdParaChecklist}
          servicioNombre={serviciosResumenTexto !== 'Sin servicios' ? serviciosResumenTexto : 'Servicio'}
        />
      )}

      <CustomerSignatureModal
        visible={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        instanceId={checklistPrincipalData?.id}
        servicioNombre={
          serviciosResumenTexto !== 'Sin servicios' ? serviciosResumenTexto : 'Servicio contratado'
        }
        proveedorNombre={
          solicitud?.oferta_seleccionada_detail?.proveedor?.nombre
          || solicitud?.oferta_seleccionada_detail?.proveedor_nombre
          || solicitud?.oferta_seleccionada_detail?.nombre_proveedor
          || null
        }
        onSignatureSuccess={handleSignatureSuccess}
      />

      <Modal visible={!!fotoAmpliadaUrl} transparent animationType="fade" onRequestClose={() => setFotoAmpliadaUrl(null)}>
        <Pressable style={styles.fotoLightboxBackdrop} onPress={() => setFotoAmpliadaUrl(null)}>
          {fotoAmpliadaUrl ? (
            <Image source={{ uri: fotoAmpliadaUrl }} style={styles.fotoLightboxImage} contentFit="contain" />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  scrollHost: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web' ? { overflow: 'hidden' } : null),
  },
  scroll: {
    ...(Platform.OS === 'web'
      ? {
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          minHeight: 0,
          overflow: 'scroll',
          WebkitOverflowScrolling: 'touch',
        }
      : { flex: 1 }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.default,
  },
  loadingContainerWeb: {
    minHeight: 0,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.text.secondary,
    fontSize: 16,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  headerContent: {
    height: HEADER_CONTENT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.container.horizontal,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  scrollContent: {
    paddingHorizontal: SPACING.container.horizontal,
    ...Platform.select({
      web: { flexGrow: 0 },
      default: { flexGrow: 1 },
    }),
  },
  tabSection: {
    marginTop: SPACING.sm,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: 14,
    padding: 4,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    marginTop: SPACING.md,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderRadius: BORDERS?.radius?.md ?? 8,
  },
  segmentActive: {
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  segmentText: {
    fontSize: TYPOGRAPHY?.fontSize?.sm ?? 14,
    fontWeight: TYPOGRAPHY?.fontWeight?.medium ?? '500',
    color: COLORS.text.tertiary,
  },
  segmentTextActive: {
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY?.fontWeight?.semibold ?? '600',
  },
  segmentBadge: {
    backgroundColor: COLORS.primary[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  segmentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary[700],
  },
  offersSection: {
    marginTop: SPACING.sm,
  },
  accionSecundariaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary[500],
    borderRadius: BORDERS.radius.md,
  },
  accionSecundariaButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.onPrimary,
  },
  verChecklistSecundarioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
  },
  verChecklistSecundarioText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary[700],
  },
  ofertasAdicionalesSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
  },
  offersHeader: {
    marginBottom: 16,
  },
  offersTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xxs,
  },
  offersTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    gap: 6,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
  },
  compareButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary[700],
  },
  offersSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  ofertaSecundariaWrapper: {
    marginBottom: 20,
  },
  referenciaSolicitudBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary[300],
  },
  referenciaSolicitudText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    borderStyle: 'dashed',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  processingText: {
    marginTop: 16,
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    width: '100%',
    backgroundColor: COLORS.background.paper,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
    paddingTop: 16,
    paddingHorizontal: 20,
    ...SHADOWS.sm,
  },
  /** Web: barra inferior siempre visible (paridad con sticky en app). */
  footerWeb: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
  footerContent: {
    width: '100%',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  footerActionsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.sm,
  },
  footerActionsSingle: {
    width: '100%',
  },
  /** Botón ancho completo, columna única (sticky inferior). */
  footerCancelLikeAccept: {
    width: '100%',
    flexDirection: 'row',
    height: 48,
    borderRadius: BORDERS.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: BORDERS.width.thin,
    backgroundColor: COLORS.error.main,
    borderColor: COLORS.error.dark,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  footerCancelLikeAcceptText: {
    color: COLORS.text.onError,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  footerCancelLikeAcceptDisabled: {
    opacity: 0.55,
  },
  footerPrimaryCta: {
    width: '100%',
    flexDirection: 'row',
    height: 48,
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: BORDERS.width.thin,
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[600],
    ...(Platform.OS === 'web' ? { cursor: 'pointer', boxSizing: 'border-box' } : {}),
  },
  footerPrimaryCtaInRow: {
    flex: 1,
    width: 'auto',
    minWidth: 0,
    alignSelf: 'stretch',
  },
  footerPrimaryCtaText: {
    flexShrink: 1,
    color: COLORS.text.onPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: 'center',
  },
  footerSecondaryCta: {
    flexShrink: 0,
    flexDirection: 'row',
    height: 48,
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: BORDERS.width.thin,
    backgroundColor: COLORS.neutral.gray[100],
    borderColor: COLORS.border.light,
    alignSelf: 'stretch',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', boxSizing: 'border-box' } : {}),
  },
  footerSecondaryCtaText: {
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  footerHintBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDERS.radius.badge?.md ?? 999,
    borderWidth: BORDERS.width.thin,
    backgroundColor: COLORS.neutral.gray[100],
    borderColor: COLORS.border.light,
    width: '100%',
  },
  footerHintBadgeStandalone: {
    marginTop: SPACING.xs,
  },
  footerHintBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  fotosNecesidadSection: {
    marginHorizontal: SPACING.container.horizontal,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  fotosNecesidadTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  fotosNecesidadRow: {
    gap: 10,
    paddingVertical: 4,
  },
  fotosNecesidadThumbWrap: {
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  fotosNecesidadThumb: {
    width: 88,
    height: 88,
  },
  fotoLightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  catalogoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
  },
  catalogoBannerTextWrap: {
    flex: 1,
  },
  catalogoBannerTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  catalogoBannerSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  fechaAlternativaCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.warning[50],
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.warning[200],
  },
  fechaAlternativaTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  fechaAlternativaBody: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  tecnicoPropuestoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    gap: 10,
  },
  tecnicoPropuestoAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tecnicoPropuestoAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tecnicoPropuestoInfo: {
    flex: 1,
  },
  tecnicoPropuestoNombre: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  tecnicoPropuestoHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  fechaAlternativaMotivo: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  fechaAlternativaBtn: {
    backgroundColor: COLORS.primary[600],
    paddingVertical: 12,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
  },
  fechaAlternativaBtnText: {
    color: COLORS.text.onPrimary,
    fontWeight: '600',
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  fotoLightboxImage: {
    width: '100%',
    height: '100%',
    maxHeight: 640,
  },
});

export default DetalleSolicitudScreen;
