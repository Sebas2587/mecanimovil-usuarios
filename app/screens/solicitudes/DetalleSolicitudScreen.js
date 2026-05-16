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
import { useSolicitudes } from '../../context/SolicitudesContext';
import { ROUTES } from '../../utils/constants';
import { requestDetailQueryKey, useRequestDetail } from '../../hooks/useRequests';
import { useConversationsList } from '../../hooks/useChats';
import { puedeClienteCancelarSolicitudPublica } from '../../utils/solicitudVehicle';
import { showAlert, showConfirm, showAlertButtons } from '../../utils/platformAlert';

// New Components
import ServiceSummaryCard from '../../components/solicitudes/ServiceSummaryCard';
import CertifiedVehicleCard from '../../components/solicitudes/CertifiedVehicleCard';
import OfferCardDetailed from '../../components/solicitudes/OfferCardDetailed';
import ChecklistViewerModal from '../../components/modals/ChecklistViewerModal';
import PendingClientSignatureCard from '../../components/checklist/PendingClientSignatureCard';

const TAB_PRINCIPALES = 'principales';
const TAB_ADICIONALES = 'adicionales';

const ESTADOS_OFERTA_YA_RESUELTA = ['aceptada', 'pendiente_pago', 'pagada', 'en_ejecucion', 'completada', 'rechazada', 'expirada', 'retirada'];
const ESTADOS_OFERTA_ACEPTADA = ['aceptada', 'pendiente_pago', 'pagada', 'en_ejecucion', 'completada'];
const ESTADOS_OFERTA_PAGAR = ['aceptada', 'pendiente_pago'];
// Estados del objeto solicitud_servicio (orden), no de la oferta
const ESTADOS_SOLICITUD_CON_CHECKLIST = [
  'checklist_en_progreso',
  'en_proceso',
  'en_ejecucion',
  'checklist_completado',
  'completada',
  'finalizada',
  'calificada',
];

/** ID de orden (solicitud_servicio) para checklist: detalle, campos planos y oferta ganadora en listas. */
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
// Estados de la oferta que indican que ya tiene orden y el servicio avanzó (equivalente a orden creada)
const ESTADOS_OFERTA_CON_ORDEN = ['pagada', 'en_ejecucion', 'completada', 'finalizada', 'calificada'];

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

  const [procesando, setProcesando] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [tabActivo, setTabActivo] = useState(TAB_PRINCIPALES);
  const [checklistOrdenId, setChecklistOrdenId] = useState(null);
  // Counter para forzar refetch de la card de firma diferida tras firmar.
  const [signatureRefreshKey, setSignatureRefreshKey] = useState(0);
  const [fotoAmpliadaUrl, setFotoAmpliadaUrl] = useState(null);

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
    const msg = `¿Estás seguro de que deseas aceptar la oferta de ${oferta.nombre_proveedor} por $${Math.round(parseFloat(oferta.precio_total_ofrecido)).toLocaleString()}?`;
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

  if (!solicitudId) {
    return (
      <View
        style={[
          styles.loadingContainer,
          Platform.OS === 'web' && styles.loadingContainerWeb,
          Platform.OS === 'web' && webScreenFrame,
        ]}
      >
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  if (showInitialLoader) {
    return (
      <View
        style={[
          styles.loadingContainer,
          Platform.OS === 'web' && styles.loadingContainerWeb,
          Platform.OS === 'web' && webScreenFrame,
        ]}
      >
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
        <Text style={styles.loadingText}>Cargando detalles...</Text>
      </View>
    );
  }

  if (!solicitud) return null;

  const ordenIdParaChecklist = resolverOrdenIdParaChecklist(solicitud, ofertas, ofertasSecundarias);

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
        <ServiceSummaryCard solicitud={solicitud} />

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

        {/*
          Firma diferida del cliente: si el técnico cerró el checklist y dejó
          la orden en `pendiente_firma_cliente`, mostramos un CTA para firmar
          desde la app del cliente (change firma-cliente-diferida-checklist).
        */}
        {(() => {
          const ordenIdParaFirma =
            solicitud?.oferta_seleccionada_detail?.solicitud_servicio_id ??
            solicitud?.orden_id ??
            solicitud?.solicitud_servicio_id ??
            null;
          if (!ordenIdParaFirma) return null;
          const proveedorNombre =
            solicitud?.oferta_seleccionada_detail?.proveedor?.nombre ||
            solicitud?.oferta_seleccionada_detail?.proveedor_nombre ||
            null;
          const servicioNombre =
            solicitud?.servicios_solicitados?.[0]?.nombre ||
            solicitud?.servicios_solicitados?.[0]?.nombre_servicio ||
            'Servicio contratado';
          return (
            <PendingClientSignatureCard
              ordenId={ordenIdParaFirma}
              servicioNombre={servicioNombre}
              proveedorNombre={proveedorNombre}
              refreshKey={signatureRefreshKey}
              onSignatureSuccess={() => {
                setSignatureRefreshKey((v) => v + 1);
                queryClient.invalidateQueries({
                  predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'requests',
                });
                queryClient.invalidateQueries({
                  predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'activeRequests',
                });
                const rk = requestDetailQueryKey(solicitudId);
                if (rk) queryClient.invalidateQueries({ queryKey: rk });
              }}
            />
          );
        })()}

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
              {ofertas.length > 0 ? (
                <>
                  {ofertas.length > 1 && (
                    <View style={styles.offersHeader}>
                      <View style={styles.offersTitleRow}>
                        <View>
                          <Text style={styles.offersTitle}>Ofertas Recibidas ({ofertas.length})</Text>
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
                  {ofertas.map((oferta) => {
                    const postDecisionStates = ['adjudicada', 'pendiente_pago', 'en_proceso', 'checklist_en_progreso', 'checklist_completado', 'completada', 'finalizada', 'calificada', 'cancelada'];
                    const isWinner = solicitud.oferta_seleccionada === oferta.id;
                    const isFinalState = postDecisionStates.includes(solicitud.estado);
                    const isDisabled = procesando || isFinalState;
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
                        isAccepted={isWinner}
                      />
                    );
                  })}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="documents-outline" size={48} color={COLORS.text.disabled} />
                  <Text style={styles.emptyStateText}>Aún no hay ofertas para esta solicitud.</Text>
                  <Text style={styles.emptyStateSubtext}>Te notificaremos cuando los proveedores respondan.</Text>
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
                const nombreServicio = solicitud?.servicio_nombre
                  || (solicitud?.servicios_solicitados_detail && solicitud.servicios_solicitados_detail[0]?.nombre)
                  || (solicitud?.servicios_solicitados && solicitud.servicios_solicitados[0]?.nombre)
                  || 'Servicio';
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
                const showChecklist =
                  ESTADOS_SOLICITUD_CON_CHECKLIST.includes(solicitud.estado) && ordenIdParaChecklist != null;

                const openChecklistPrincipal = () => {
                  setChecklistOrdenId(null);
                  setShowChecklistModal(true);
                };

                if (showPagar) {
                  return (
                    <>
                      <TouchableOpacity
                        style={styles.footerPrimaryCta}
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
                        <TouchableOpacity style={styles.footerPrimaryCta} onPress={openChecklistPrincipal}>
                          <Text style={styles.footerPrimaryCtaText}>Ver Checklist</Text>
                          <Ionicons name="clipboard-outline" size={18} color={COLORS.text.onPrimary} />
                        </TouchableOpacity>
                      ) : null}
                    </>
                  );
                }

                if (showChecklist) {
                  return (
                    <TouchableOpacity style={styles.footerPrimaryCta} onPress={openChecklistPrincipal}>
                      <Text style={styles.footerPrimaryCtaText}>Ver Checklist</Text>
                      <Ionicons name="clipboard-outline" size={18} color={COLORS.text.onPrimary} />
                    </TouchableOpacity>
                  );
                }

                return null;
              })()}
            </>
          ) : (() => {
            const ofertaParaPagar = ofertasSecundarias.find((o) =>
              ESTADOS_OFERTA_PAGAR.includes(o?.estado),
            );
            const ofertaConChecklist = ofertasSecundarias.find(
              (o) =>
                (o?.solicitud_servicio_id ?? o?.orden_id) != null &&
                ESTADOS_OFERTA_CON_ORDEN.includes(o?.estado),
            );
            const hayAcciones = ofertaParaPagar || ofertaConChecklist;
            return (
              <>
                {ofertaParaPagar ? (
                  <TouchableOpacity
                    style={styles.footerPrimaryCta}
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
                    style={styles.footerPrimaryCta}
                    onPress={() => {
                      setChecklistOrdenId(
                        ofertaConChecklist.solicitud_servicio_id ?? ofertaConChecklist.orden_id,
                      );
                      setShowChecklistModal(true);
                    }}
                  >
                    <Text style={styles.footerPrimaryCtaText}>Ver Checklist</Text>
                    <Ionicons name="clipboard-outline" size={18} color={COLORS.text.onPrimary} />
                  </TouchableOpacity>
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
          servicioNombre={solicitud?.servicios_solicitados?.[0]?.nombre || solicitud?.servicios_solicitados?.[0]?.nombre_servicio || 'Servicio'}
        />
      )}

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
    borderRadius: BORDERS.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: BORDERS.width.thin,
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[600],
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  footerPrimaryCtaText: {
    color: COLORS.text.onPrimary,
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
  fotoLightboxImage: {
    width: '100%',
    height: '100%',
    maxHeight: 640,
  },
});

export default DetalleSolicitudScreen;
