import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import { ROUTES } from '../../utils/constants';
import ComparadorOfertas from '../../components/ofertas/ComparadorOfertas';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { useAgendamiento } from '../../context/AgendamientoContext';
import ofertasService from '../../services/ofertasService';
import solicitudesService from '../../services/solicitudesService';
import chatService from '../../services/chatService';

/**
 * Pantalla para comparar múltiples ofertas lado a lado
 * Aplicando sistema de diseño MecaniMóvil
 */
const ComparadorOfertasScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = theme?.colors || {};
  const spacing = theme?.spacing || {};
  const typography = theme?.typography || {};

  const { solicitudId, ofertas: ofertasIds } = route.params || {};

  const { seleccionarOferta } = useSolicitudes();
  const { cargarTodosLosCarritos } = useAgendamiento();

  const [ofertas, setOfertas] = useState([]);
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState(null);

  useEffect(() => {
    cargarOfertas();
  }, [ofertasIds, solicitudId]);

  const cargarOfertas = async () => {
    try {
      setLoading(true);
      setErrorValidacion(null);

      // Cargar solicitud si tenemos solicitudId
      if (solicitudId) {
        try {
          const solicitudesService = (await import('../../services/solicitudesService')).default;
          const solicitudData = await solicitudesService.obtenerDetalleSolicitud(solicitudId);
          const solicitudNormalizada = solicitudData && solicitudData.type === 'Feature' && solicitudData.properties
            ? { ...solicitudData.properties, id: solicitudData.id || solicitudData.properties.id, geometry: solicitudData.geometry }
            : solicitudData;
          setSolicitud(solicitudNormalizada);
        } catch (error) {
          console.error('Error cargando solicitud:', error);
        }
      }

      let ofertasData = [];
      if (ofertasIds && ofertasIds.length > 0) {
        const promesas = ofertasIds.map(id =>
          ofertasService.obtenerDetalleOferta(id)
        );
        ofertasData = await Promise.all(promesas);

        // Validación: Verificar que todas las ofertas pertenezcan a la misma solicitud
        if (solicitudId) {
          const ofertasInvalidas = ofertasData.filter(o => {
            const ofertaSolicitudId = o.solicitud || (typeof o.solicitud === 'object' ? o.solicitud.id : null);
            return ofertaSolicitudId !== solicitudId && String(ofertaSolicitudId) !== String(solicitudId);
          });

          if (ofertasInvalidas.length > 0) {
            setErrorValidacion('Las ofertas deben pertenecer a la misma solicitud.');
            setOfertas([]);
            setLoading(false);
            return;
          }
        } else {
          const solicitudesIds = ofertasData.map(o => {
            const sid = o.solicitud || (typeof o.solicitud === 'object' ? o.solicitud.id : null);
            return String(sid);
          }).filter(id => id && id !== 'null' && id !== 'undefined');

          const solicitudesUnicas = [...new Set(solicitudesIds)];
          if (solicitudesUnicas.length > 1) {
            setErrorValidacion('Las ofertas deben pertenecer a la misma solicitud.');
            setOfertas([]);
            setLoading(false);
            return;
          }
        }
      } else if (solicitudId) {
        ofertasData = await ofertasService.obtenerOfertasDeSolicitud(solicitudId);
      }

      setOfertas(ofertasData);
    } catch (error) {
      console.error('Error cargando ofertas:', error);
      Alert.alert('Error', 'No se pudieron cargar las ofertas');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAceptarOferta = async (oferta) => {
    if (!solicitudId) {
      Alert.alert('Error', 'No se encontró la solicitud');
      return;
    }

    if (solicitud && solicitud.estado === 'adjudicada') {
      Alert.alert(
        'Solicitud ya adjudicada',
        'Esta solicitud ya tiene una oferta aceptada.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    Alert.alert(
      'Confirmar Selección',
      `¿Deseas aceptar la oferta de ${oferta.nombre_proveedor} por $${parseInt(oferta.precio_total_ofrecido).toLocaleString()}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          style: 'default',
          onPress: async () => {
            setProcesando(true);
            try {
              const resultado = await seleccionarOferta(solicitudId, oferta.id);

              if (resultado && resultado.carrito) {
                try {
                  await cargarTodosLosCarritos();
                } catch (error) {
                  console.error('Error recargando carritos:', error);
                }

                const tieneDesgloseRepuestos = oferta.incluye_repuestos &&
                  parseFloat(oferta.costo_repuestos || 0) > 0 &&
                  parseFloat(oferta.costo_mano_obra || 0) > 0;

                Alert.alert(
                  '¡Oferta Aceptada!',
                  tieneDesgloseRepuestos
                    ? 'La oferta incluye repuestos. ¿Cómo deseas realizar el pago?'
                    : '¿Deseas proceder con el pago ahora?',
                  [
                    { text: 'Ver Detalles', style: 'cancel', onPress: () => navigation.goBack() },
                    {
                      text: 'Pagar Ahora',
                      onPress: async () => {
                        // Siempre navegar a OpcionesPago, que maneja ambos casos (con o sin desglose)
                        navigation.navigate('OpcionesPago', {
                          solicitudId: solicitudId,
                          origen: 'solicitud_publica',
                          ofertaId: oferta.id // Pasar oferta explícita si es necesario
                        });
                      }
                    }
                  ]
                );
              } else if (resultado && resultado.solicitud_tradicional_id) {
                navigation.navigate(ROUTES.OPCIONES_PAGO || 'OpcionesPago', {
                  solicitudId: resultado.solicitud_tradicional_id
                });
              } else {
                Alert.alert('Éxito', 'Oferta aceptada correctamente');
                navigation.goBack();
              }
            } catch (error) {
              console.error('Error aceptando oferta:', error);
              const mensaje = error.response?.data?.detail || error.response?.data?.error || error.message || 'No se pudo aceptar la oferta';
              Alert.alert('Error', mensaje);
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
      const conversationId = await chatService.getOrCreateConversation({
        ofertaId: oferta.id,
        solicitudId: solicitudId,
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

  // Renderizar header consistente
  const renderHeader = (title) => (
    <View style={[styles.header, { borderBottomColor: colors.border?.light || '#E5E7EB', backgroundColor: colors.background?.paper || '#FFFFFF' }]}>
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: colors.background?.default || '#F8F9FA' }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text?.primary || '#0F172A'} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text?.primary || '#0F172A' }]}>{title}</Text>
      <View style={styles.headerRight}>
        <View style={[styles.ofertasCount, { backgroundColor: colors.primary?.['50'] || '#EFF6FF' }]}>
          <MaterialIcons name="compare-arrows" size={18} color={colors.primary?.['600'] || '#2563EB'} />
          <Text style={[styles.ofertasCountText, { color: colors.primary?.['600'] || '#2563EB' }]}>{ofertas.length}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background?.default || '#F8F9FA' }]} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background?.paper || '#FFFFFF'} />
        {renderHeader('Comparar Ofertas')}
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingCard, { backgroundColor: colors.background?.paper || '#FFFFFF' }]}>
            <ActivityIndicator size="large" color={colors.primary?.['600'] || '#2563EB'} />
            <Text style={[styles.loadingTitle, { color: colors.text?.primary || '#0F172A' }]}>Cargando ofertas</Text>
            <Text style={[styles.loadingSubtitle, { color: colors.text?.secondary || '#64748B' }]}>Preparando la comparación...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (errorValidacion) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background?.default || '#F8F9FA' }]} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background?.paper || '#FFFFFF'} />
        {renderHeader('Comparar Ofertas')}
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: (colors.error?.['500'] || '#EF4444') + '15' }]}>
            <Ionicons name="alert-circle" size={48} color={colors.error?.['500'] || '#EF4444'} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text?.primary || '#0F172A' }]}>Error de Validación</Text>
          <Text style={[styles.emptyText, { color: colors.text?.secondary || '#64748B' }]}>{errorValidacion}</Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary?.['600'] || '#2563EB' }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (ofertas.length < 2) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background?.default || '#F8F9FA' }]} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background?.paper || '#FFFFFF'} />
        {renderHeader('Comparar Ofertas')}
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: (colors.warning?.['500'] || '#F59E0B') + '15' }]}>
            <MaterialIcons name="compare-arrows" size={48} color={colors.warning?.['500'] || '#F59E0B'} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text?.primary || '#0F172A' }]}>Ofertas Insuficientes</Text>
          <Text style={[styles.emptyText, { color: colors.text?.secondary || '#64748B' }]}>
            Necesitas al menos 2 ofertas para poder compararlas
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary?.['600'] || '#2563EB' }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Volver a Ofertas</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background?.default || '#F8F9FA' }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background?.paper || '#FFFFFF'} />
      {renderHeader('Comparar Ofertas')}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ComparadorOfertas
          ofertas={ofertas}
          onAceptarOferta={solicitud && solicitud.estado === 'adjudicada' ? undefined : handleAceptarOferta}
          solicitudAdjudicada={solicitud && solicitud.estado === 'adjudicada'}
          solicitudId={solicitudId}
          onChatPress={handleChat}
        />
      </ScrollView>

      {procesando && (
        <View style={styles.processingOverlay}>
          <View style={[styles.processingCard, { backgroundColor: colors.background?.paper || '#FFFFFF' }]}>
            <ActivityIndicator size="large" color={colors.primary?.['600'] || '#2563EB'} />
            <Text style={[styles.processingText, { color: colors.text?.primary || '#0F172A' }]}>Procesando oferta...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  ofertasCount: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  ofertasCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Scroll
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 16
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingSubtitle: {
    marginTop: 4,
    fontSize: 12,
  },
  // Empty states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Processing overlay
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  processingCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 180,
  },
  processingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500'
  }
});

export default ComparadorOfertasScreen;
