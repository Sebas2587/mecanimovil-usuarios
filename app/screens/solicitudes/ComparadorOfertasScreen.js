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
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '../../utils/constants';
import ComparadorOfertas from '../../components/ofertas/ComparadorOfertas';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { useAgendamiento } from '../../context/AgendamientoContext';
import ofertasService from '../../services/ofertasService';
import solicitudesService from '../../services/solicitudesService';
import chatService from '../../services/chatService';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

/**
 * Pantalla para comparar múltiples ofertas lado a lado
 * Aplicando sistema de diseño MecaniMóvil
 */
const ComparadorOfertasScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

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

              if (resultado && (resultado.carrito || resultado.sin_carrito)) {
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#030712" />
        <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
          <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.08)' }} />
          <View style={{ position: 'absolute', top: 360, left: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(99,102,241,0.06)' }} />
          <View style={{ position: 'absolute', bottom: -50, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(6,182,212,0.05)' }} />
        </View>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
            <ActivityIndicator size="large" color="#6EE7B7" />
            <Text style={styles.loadingTitle}>Cargando ofertas</Text>
            <Text style={styles.loadingSubtitle}>Preparando la comparación...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (errorValidacion) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#030712" />
        <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
          <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.08)' }} />
          <View style={{ position: 'absolute', top: 360, left: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(99,102,241,0.06)' }} />
          <View style={{ position: 'absolute', bottom: -50, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(6,182,212,0.05)' }} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.20)' }]}>
            <Ionicons name="alert-circle" size={48} color="#FCA5A5" />
          </View>
          <Text style={styles.emptyTitle}>Error de Validación</Text>
          <Text style={styles.emptyText}>{errorValidacion}</Text>
          <TouchableOpacity
            style={styles.emptyButton}
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#030712" />
        <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
          <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.08)' }} />
          <View style={{ position: 'absolute', top: 360, left: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(99,102,241,0.06)' }} />
          <View style={{ position: 'absolute', bottom: -50, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(6,182,212,0.05)' }} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.22)' }]}>
            <MaterialIcons name="compare-arrows" size={48} color="#FBBF24" />
          </View>
          <Text style={styles.emptyTitle}>Ofertas Insuficientes</Text>
          <Text style={styles.emptyText}>
            Necesitas al menos 2 ofertas para poder compararlas
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.08)' }} />
        <View style={{ position: 'absolute', top: 360, left: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(99,102,241,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -50, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(6,182,212,0.05)' }} />
      </View>

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
          solicitud={solicitud}
          onAceptarOferta={solicitud && solicitud.estado === 'adjudicada' ? undefined : handleAceptarOferta}
          solicitudAdjudicada={solicitud && solicitud.estado === 'adjudicada'}
          solicitudId={solicitudId}
          onChatPress={handleChat}
        />
      </ScrollView>

      {procesando && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
            <ActivityIndicator size="large" color="#6EE7B7" />
            <Text style={styles.processingText}>Procesando oferta...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
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
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  loadingSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
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
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: '#F9FAFB',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#0d9488',
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.25)',
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
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
  },
  processingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
  }
});

export default ComparadorOfertasScreen;
