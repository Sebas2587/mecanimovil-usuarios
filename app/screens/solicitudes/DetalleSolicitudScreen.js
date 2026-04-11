import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../design-system/theme/useTheme';
import { COLORS, SPACING, BORDERS, SHADOWS, TYPOGRAPHY } from '../../design-system/tokens';

// Services & Context
import solicitudesService from '../../services/solicitudesService';
import chatService from '../../services/chatService';
import ofertasService from '../../services/ofertasService';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { ROUTES } from '../../utils/constants';

// New Components
import ServiceSummaryCard from '../../components/solicitudes/ServiceSummaryCard';
import CertifiedVehicleCard from '../../components/solicitudes/CertifiedVehicleCard';
import OfferCardDetailed from '../../components/solicitudes/OfferCardDetailed';
import ChecklistViewerModal from '../../components/modals/ChecklistViewerModal';

const TAB_PRINCIPALES = 'principales';
const TAB_ADICIONALES = 'adicionales';

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});
const BLUR_I = Platform.OS === 'ios' ? 40 : 0;

const ESTADOS_OFERTA_YA_RESUELTA = ['aceptada', 'pendiente_pago', 'pagada', 'en_ejecucion', 'completada', 'rechazada', 'expirada', 'retirada'];
const ESTADOS_OFERTA_ACEPTADA = ['aceptada', 'pendiente_pago', 'pagada', 'en_ejecucion', 'completada'];
const ESTADOS_OFERTA_PAGAR = ['aceptada', 'pendiente_pago'];
// Estados del objeto solicitud_servicio (orden), no de la oferta
const ESTADOS_SOLICITUD_CON_CHECKLIST = ['checklist_en_progreso', 'en_proceso', 'checklist_completado', 'completada', 'finalizada', 'calificada'];
// Estados de la oferta que indican que ya tiene orden y el servicio avanzó (equivalente a orden creada)
const ESTADOS_OFERTA_CON_ORDEN = ['pagada', 'en_ejecucion', 'completada', 'finalizada', 'calificada'];

const DetalleSolicitudScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { solicitudId } = route.params || {};
  const insets = useSafeAreaInsets();

  const { seleccionarOferta, cancelarSolicitud } = useSolicitudes();

  const [solicitud, setSolicitud] = useState(null);
  const [ofertas, setOfertas] = useState([]);
  const [ofertasSecundarias, setOfertasSecundarias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [tabActivo, setTabActivo] = useState(TAB_PRINCIPALES);
  const [checklistOrdenId, setChecklistOrdenId] = useState(null);
  const theme = useTheme();
  const colors = theme?.colors || COLORS || {};
  const spacing = theme?.spacing || SPACING || {};
  const borders = theme?.borders || BORDERS || {};

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    if (!solicitudId) return;
    try {
      setLoading(true);
      const [solicitudData, ofertasData] = await Promise.all([
        solicitudesService.obtenerDetalleSolicitud(solicitudId),
        ofertasService.obtenerOfertasDeSolicitud(solicitudId)
      ]);

      // Normalizar datos si vienen en GeoJSON
      const solicitudNormalizada = (solicitudData.type === 'Feature')
        ? { ...solicitudData.properties, id: solicitudData.id }
        : solicitudData;

      setSolicitud(solicitudNormalizada);

      // Ofertas principales (para comparar entre sí) y secundarias (nuevas opciones del proveedor para esta misma solicitud)
      const todas = ofertasData || [];
      const principales = todas
        .filter(o => !o.es_oferta_secundaria)
        .sort((a, b) => parseFloat(a.precio_total_ofrecido) - parseFloat(b.precio_total_ofrecido));
      const secundarias = todas
        .filter(o => o.es_oferta_secundaria)
        .sort((a, b) => parseFloat(a.precio_total_ofrecido) - parseFloat(b.precio_total_ofrecido));

      setOfertas(principales);
      setOfertasSecundarias(secundarias);

    } catch (error) {
      console.error('Error loading request details:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos de la solicitud');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [solicitudId]);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  // Handlers
  const handleAceptarOferta = (oferta) => {
    Alert.alert(
      'Confirmar Selección',
      `¿Estás seguro de que deseas aceptar la oferta de ${oferta.nombre_proveedor} por $${Math.round(parseFloat(oferta.precio_total_ofrecido)).toLocaleString()}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar Oferta',
          style: 'default',
          onPress: async () => {
            try {
              setProcesando(true);
              const resultado = await seleccionarOferta(solicitudId, oferta.id);

              // Con carrito (flujo tradicional) o sin carrito (precompra / sin vehículo) → mismo destino de pago
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
                Alert.alert('¡Excelente!', 'Oferta aceptada correctamente.');
                cargarDatos();
              }
            } catch (error) {
              console.error('Error accepting offer:', error);
              Alert.alert('Error', 'Hubo un problema al aceptar la oferta. Inténtalo de nuevo.');
            } finally {
              setProcesando(false);
            }
          }
        }
      ]
    );
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
      Alert.alert('Error', 'No se pudo abrir el chat. Intenta nuevamente.');
    }
  };

  const handleCompararOfertas = () => {
    if (ofertas.length < 2) {
      Alert.alert('Información', 'Necesitas al menos 2 ofertas para comparar');
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007EA7" />
        <Text style={styles.loadingText}>Cargando detalles...</Text>
      </View>
    );
  }

  if (!solicitud) return null;

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient colors={['#030712', '#0a0f1a', '#030712']} style={StyleSheet.absoluteFill} />
      </View>

      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Sticky Header with Blur */}
      <BlurView intensity={BLUR_I} tint="dark" style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Detalle de Solicitud</Text>
            <Text style={styles.headerSubtitle}>ID: {solicitudId.slice(0, 8)}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </BlurView>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60 } // Compensate for absolute header
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1) Vehículo (primero) */}
        {solicitud.vehiculo_info && (
          <CertifiedVehicleCard vehiculo={solicitud.vehiculo_info} />
        )}

        {/* 2) Detalle de Solicitud */}
        <ServiceSummaryCard solicitud={solicitud} />

        {/* C. Tabs: Ofertas recibidas | Ofertas adicionales */}
        <View style={styles.tabSection}>
          <View style={[styles.segmentContainer, { marginHorizontal: spacing.lg ?? 16, marginTop: spacing.md ?? 12 }]}>
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
                          <Ionicons name="git-compare-outline" size={16} color="#007EA7" />
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
                  <Ionicons name="documents-outline" size={48} color="#CBD5E1" />
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
                      <Ionicons name="link-outline" size={14} color="#64748B" />
                      <Text style={styles.referenciaSolicitudText}>
                        Oferta adicional para esta solicitud ({nombreServicio})
                        {fechaOriginal ? ` · Alternativa a la oferta del ${fechaOriginal}` : ''}
                      </Text>
                    </View>
                    <OfferCardDetailed
                      oferta={oferta}
                      solicitud={solicitud}
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

      {/* Footer de Acciones (contextual según tab) */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.footerContent}>
          {tabActivo === TAB_PRINCIPALES ? (
            <>
              {solicitud.estado === 'publicada' && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    Alert.alert(
                      'Cancelar Solicitud',
                      '¿Estás seguro de que deseas cancelar esta solicitud? Esta acción no se puede deshacer.',
                      [
                        { text: 'Volver', style: 'cancel' },
                        {
                          text: 'Sí, Cancelar',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              setProcesando(true);
                              await cancelarSolicitud(solicitudId);
                              Alert.alert('Solicitud Cancelada', 'La solicitud ha sido cancelada exitosamente.');
                              navigation.goBack();
                            } catch (error) {
                              console.error('Error cancelling request:', error);
                              Alert.alert('Error', 'No se pudo cancelar la solicitud.');
                            } finally {
                              setProcesando(false);
                            }
                          }
                        }
                      ]
                    );
                  }}
                  disabled={procesando}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={styles.cancelButtonText}>Cancelar Solicitud</Text>
                </TouchableOpacity>
              )}
              {['pendiente_pago', 'adjudicada'].includes(solicitud.estado) && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('OpcionesPago', { solicitudId, origen: 'solicitud_publica' })}
                >
                  <Text style={styles.primaryButtonText}>Ir a Pagar</Text>
                  <Ionicons name="card-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {(() => {
                const ordenId = solicitud?.oferta_seleccionada_detail?.solicitud_servicio_id ?? solicitud?.orden_id ?? solicitud?.solicitud_servicio_id;
                const puedeVerChecklist = ESTADOS_SOLICITUD_CON_CHECKLIST.includes(solicitud.estado) && ordenId != null;
                if (!puedeVerChecklist) return null;
                return (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => {
                      setChecklistOrdenId(null);
                      setShowChecklistModal(true);
                    }}
                  >
                    <Text style={styles.primaryButtonText}>Ver Checklist</Text>
                    <Ionicons name="clipboard-outline" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                );
              })()}
              {!['publicada', 'pendiente_pago', 'adjudicada', 'checklist_en_progreso', 'en_proceso', 'checklist_completado', 'completada', 'finalizada', 'calificada'].includes(solicitud.estado) && (
                <View style={styles.statusFooter}>
                  <Ionicons name="information-circle-outline" size={20} color="#64748B" />
                  <Text style={styles.statusFooterText}>
                    Estado: {solicitud.estado_display_efectivo || solicitud.estado_display || solicitud.estado}
                  </Text>
                </View>
              )}
            </>
          ) : (() => {
            // "Pagar": la oferta fue aceptada (estado 'aceptada') o quedó en pendiente_pago
            const ofertaParaPagar = ofertasSecundarias.find(
              o => ESTADOS_OFERTA_PAGAR.includes(o?.estado)
            );
            // "Ver Checklist": tiene solicitud_servicio_id (orden creada) y la oferta avanzó al servicio
            const ofertaConChecklist = ofertasSecundarias.find(
              o => (o?.solicitud_servicio_id ?? o?.orden_id) != null &&
                   ESTADOS_OFERTA_CON_ORDEN.includes(o?.estado)
            );
            const hayAcciones = ofertaParaPagar || ofertaConChecklist;
            return (
              <>
                {ofertaParaPagar && (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => navigation.navigate('OpcionesPago', {
                      solicitudId,
                      ofertaId: ofertaParaPagar.id,
                      origen: 'oferta_secundaria',
                    })}
                  >
                    <Text style={styles.primaryButtonText}>Ir a Pagar</Text>
                    <Ionicons name="card-outline" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
                {ofertaConChecklist && (
                  <TouchableOpacity
                    style={[styles.primaryButton, ofertaParaPagar && { marginTop: 10 }]}
                    onPress={() => {
                      setChecklistOrdenId(ofertaConChecklist.solicitud_servicio_id ?? ofertaConChecklist.orden_id);
                      setShowChecklistModal(true);
                    }}
                  >
                    <Text style={styles.primaryButtonText}>Ver Checklist</Text>
                    <Ionicons name="clipboard-outline" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
                {!hayAcciones && (
                  <View style={styles.statusFooter}>
                    <Ionicons name="information-circle-outline" size={20} color="#64748B" />
                    <Text style={styles.statusFooterText}>
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
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.processingText}>Procesando...</Text>
          </View>
        )
      }

      {/* Modal checklist: orden principal o de oferta secundaria según origen */}
      {solicitud && (
        <ChecklistViewerModal
          visible={showChecklistModal}
          onClose={() => {
            setShowChecklistModal(false);
            setChecklistOrdenId(null);
          }}
          ordenId={checklistOrdenId ?? solicitud?.oferta_seleccionada_detail?.solicitud_servicio_id ?? solicitud?.orden_id ?? solicitud?.solicitud_servicio_id}
          servicioNombre={solicitud?.servicios_solicitados?.[0]?.nombre || solicitud?.servicios_solicitados?.[0]?.nombre_servicio || 'Servicio'}
        />
      )}
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030712',
  },
  loadingText: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 16,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(3,7,18,0.55)' : 'rgba(3,7,18,0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerContent: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
    color: '#F9FAFB',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  tabSection: {
    marginTop: 8,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: GLASS_BG,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  segmentText: {
    fontSize: TYPOGRAPHY?.fontSize?.sm ?? 14,
    fontWeight: TYPOGRAPHY?.fontWeight?.medium ?? '500',
    color: 'rgba(255,255,255,0.45)',
  },
  segmentTextActive: {
    color: '#F9FAFB',
    fontWeight: TYPOGRAPHY?.fontWeight?.semibold ?? '600',
  },
  segmentBadge: {
    backgroundColor: 'rgba(147,197,253,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  segmentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  offersSection: {
    marginTop: 8,
  },
  accionSecundariaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#007EA7',
    borderRadius: 12,
  },
  accionSecundariaButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  verChecklistSecundarioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  verChecklistSecundarioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007EA7',
  },
  ofertasAdicionalesSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  offersHeader: {
    marginBottom: 16,
  },
  offersTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  offersTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147,197,253,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.35)',
  },
  compareButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#93C5FD',
  },
  offersSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.25)',
  },
  referenciaSolicitudText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: GLASS_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  processingText: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    width: '100%',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(3,7,18,0.7)' : 'rgba(3,7,18,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 16,
  },
  footerContent: {
    width: '100%',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,113,113,0.10)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    gap: 8,
  },
  cancelButtonText: {
    color: '#FCA5A5',
    fontWeight: '700',
    fontSize: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007EA7',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.35)',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GLASS_BG,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statusFooterText: {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});

export default DetalleSolicitudScreen;
