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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const DetalleSolicitudScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { solicitudId } = route.params || {};
  const insets = useSafeAreaInsets();

  const { seleccionarOferta, cancelarSolicitud } = useSolicitudes();

  const [solicitud, setSolicitud] = useState(null);
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

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

      // Filtrar y ordenar ofertas (solo originales, las secundarias se manejan aparte si es necesario)
      // En este diseño, nos enfocamos en las ofertas principales para comparar
      const ofertasOriginales = (ofertasData || [])
        .filter(o => !o.es_oferta_secundaria)
        .sort((a, b) => parseFloat(a.precio_total_ofrecido) - parseFloat(b.precio_total_ofrecido));

      setOfertas(ofertasOriginales);

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

              if (resultado?.carrito) {
                // Navegar directo al pago
                navigation.navigate('OpcionesPago', {
                  solicitudId: solicitudId,
                  origen: 'solicitud_publica'
                });
              } else {
                Alert.alert('¡Excelente!', 'Oferta aceptada correctamente.');
                cargarDatos(); // Refresh status
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
    // Navigate to provider profile
    // We need to pass the provider object properly
    // The provider might be in oferta.proveedor_info, oferta.taller_info, or constructed from fields

    const providerId = oferta.proveedor;
    const providerType = oferta.tipo_proveedor; // 'taller' or 'mecanico'

    // Construct a minimal provider object for the screen to load details
    const providerObj = {
      id: providerId,
      tipo: providerType,
      nombre: oferta.nombre_proveedor,
      usuario: {
        foto_perfil: oferta.proveedor_foto
      }
    };

    navigation.navigate(ROUTES.PROVIDER_DETAIL, {
      provider: providerObj,
      providerId: providerId,
      type: providerType
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando detalles...</Text>
      </View>
    );
  }

  if (!solicitud) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Sticky Header with Blur */}
      <BlurView intensity={80} tint="light" style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
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
        {/* A. Resumen del Servicio */}
        <ServiceSummaryCard solicitud={solicitud} />

        {/* B. Vehículo Certificado */}
        {solicitud.vehiculo_info && (
          <CertifiedVehicleCard vehiculo={solicitud.vehiculo_info} />
        )}

        {/* C. Comparador de Ofertas */}
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
                      <Ionicons name="git-compare-outline" size={16} color="#2563EB" />
                      <Text style={styles.compareButtonText}>Comparar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {ofertas.map((oferta) => {
                const isAdjudicatedState = ['adjudicada', 'pendiente_pago'].includes(solicitud.estado);
                const isWinner = isAdjudicatedState && solicitud.oferta_seleccionada === oferta.id;

                // Estados donde ya se tomó una decisión
                const adjudicatedStates = ['adjudicada', 'pendiente_pago', 'en_proceso', 'checklist_en_progreso', 'checklist_completado', 'completada', 'cancelada'];
                const isFinalState = adjudicatedStates.includes(solicitud.estado);

                // Habilitar si NO estamos en un estado final, O si es la oferta ganadora
                const isDisabled = procesando || (isFinalState && !isWinner);

                return (
                  <OfferCardDetailed
                    key={oferta.id}
                    oferta={oferta}
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

      </ScrollView>

      {/* Footer de Acciones (Fixed) */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.footerContent}>
          {/* Lógica de Botones Dinámicos */}
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

          {/* Botón Pagar (Si aplica) */}
          {['pendiente_pago', 'adjudicada'].includes(solicitud.estado) && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('OpcionesPago', { solicitudId, origen: 'solicitud_publica' })}
            >
              <Text style={styles.primaryButtonText}>Ir a Pagar</Text>
              <Ionicons name="card-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Botón Checklist (Si aplica) */}
          {['checklist_en_progreso', 'en_proceso', 'checklist_completado'].includes(solicitud.estado) && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('ChecklistScreen', { solicitudId })}
            >
              <Text style={styles.primaryButtonText}>Ver Checklist</Text>
              <Ionicons name="clipboard-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Mensaje informativo si no hay acciones */}
          {!['publicada', 'pendiente_pago', 'adjudicada', 'checklist_en_progreso', 'en_proceso', 'checklist_completado'].includes(solicitud.estado) && (
            <View style={styles.statusFooter}>
              <Ionicons name="information-circle-outline" size={20} color="#64748B" />
              <Text style={styles.statusFooterText}>
                Estado: {solicitud.estado_display || solicitud.estado}
              </Text>
            </View>
          )}
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
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Background base claro
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 16,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Fallback for no blur
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.6)',
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
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  offersSection: {
    marginTop: 8,
  },
  offersHeader: {
    marginBottom: 16,
  },
  offersTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
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
    backgroundColor: '#EFF6FF', // Blue-50
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE', // Blue-200
  },
  compareButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB', // Blue-600
  },
  offersSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#94A3B8',
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  footerContent: {
    width: '100%',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2', // Red-50
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5', // Red-300
    gap: 8,
  },
  cancelButtonText: {
    color: '#EF4444', // Red-500
    fontWeight: '700',
    fontSize: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB', // Blue-600
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    backgroundColor: '#F1F5F9', // Slate-100
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  statusFooterText: {
    color: '#64748B', // Slate-500
    fontWeight: '600',
    fontSize: 14,
  },
});

export default DetalleSolicitudScreen;
