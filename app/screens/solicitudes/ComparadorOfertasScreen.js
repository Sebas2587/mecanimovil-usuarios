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
import { TOKENS } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import ComparadorOfertas from '../../components/ofertas/ComparadorOfertas';
import Button from '../../components/base/Button/Button';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { useAgendamiento } from '../../context/AgendamientoContext';
import ofertasService from '../../services/ofertasService';
import solicitudesService from '../../services/solicitudesService';

// Extraer tokens con valores por defecto
const colors = TOKENS?.colors || {};
const typography = TOKENS?.typography || {};
const spacing = TOKENS?.spacing || {};
const borders = TOKENS?.borders || {};
const shadows = TOKENS?.shadows || {};

// Colores seguros
const primaryColor = colors?.primary?.['500'] || '#003459';
const primaryLight = colors?.primary?.['100'] || '#CCE5EF';
const secondaryColor = colors?.secondary?.['500'] || '#007EA7';
const accentColor = colors?.accent?.['500'] || '#00A8E8';
const successColor = colors?.success?.['500'] || '#10B981';
const errorColor = colors?.error?.['500'] || '#EF4444';
const warningColor = colors?.warning?.['500'] || '#F59E0B';
const bgDefault = colors?.background?.default || '#F5F7F8';
const bgPaper = colors?.background?.paper || '#FFFFFF';
const textPrimary = colors?.text?.primary || '#00171F';
const textSecondary = colors?.text?.secondary || '#4B5563';
const textTertiary = colors?.text?.tertiary || '#6B7280';
const borderLight = colors?.border?.light || '#E5E7EB';

// Espaciado seguro
const spacingXs = spacing?.xs || 4;
const spacingSm = spacing?.sm || 8;
const spacingMd = spacing?.md || 16;
const spacingLg = spacing?.lg || 24;
const spacingXl = spacing?.xl || 32;

// Tipografía segura
const fontSizeXs = typography?.fontSize?.xs || 10;
const fontSizeSm = typography?.fontSize?.sm || 12;
const fontSizeBase = typography?.fontSize?.base || 14;
const fontSizeMd = typography?.fontSize?.md || 16;
const fontSizeLg = typography?.fontSize?.lg || 18;
const fontSizeXl = typography?.fontSize?.xl || 20;
const fontSize2xl = typography?.fontSize?.['2xl'] || 24;
const fontWeightMedium = typography?.fontWeight?.medium || '500';
const fontWeightSemibold = typography?.fontWeight?.semibold || '600';
const fontWeightBold = typography?.fontWeight?.bold || '700';

// Bordes seguros
const radiusSm = borders?.radius?.sm || 4;
const radiusMd = borders?.radius?.md || 8;
const radiusLg = borders?.radius?.lg || 12;
const radiusXl = borders?.radius?.xl || 16;
const radiusFull = borders?.radius?.full || 9999;

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
                        if (tieneDesgloseRepuestos) {
                          try {
                            const datosPago = await solicitudesService.obtenerDatosPago(solicitudId);
                            navigation.navigate('SeleccionMetodoPago', {
                              solicitudId: solicitudId,
                              ofertaId: oferta.id,
                              datosPago: datosPago
                            });
                          } catch (error) {
                            navigation.navigate('OpcionesPago', {
                              solicitudId: solicitudId,
                              origen: 'solicitud_publica'
                            });
                          }
                        } else {
                          navigation.navigate('OpcionesPago', {
                            solicitudId: solicitudId,
                            origen: 'solicitud_publica'
                          });
                        }
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

  // Renderizar header consistente
  const renderHeader = (title) => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerRight}>
        <View style={styles.ofertasCount}>
          <MaterialIcons name="compare-arrows" size={18} color={primaryColor} />
          <Text style={styles.ofertasCountText}>{ofertas.length}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={bgPaper} />
        {renderHeader('Comparar Ofertas')}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={primaryColor} />
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
        <StatusBar barStyle="dark-content" backgroundColor={bgPaper} />
        {renderHeader('Comparar Ofertas')}
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="alert-circle" size={48} color={errorColor} />
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
        <StatusBar barStyle="dark-content" backgroundColor={bgPaper} />
        {renderHeader('Comparar Ofertas')}
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: warningColor + '15' }]}>
            <MaterialIcons name="compare-arrows" size={48} color={warningColor} />
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
      <StatusBar barStyle="dark-content" backgroundColor={bgPaper} />
      {renderHeader('Comparar Ofertas')}

      {/* Subtítulo informativo */}
      <View style={styles.subtitleContainer}>
        <MaterialIcons name="info-outline" size={16} color={textTertiary} />
        <Text style={styles.subtitleText}>
          Desliza horizontalmente para ver todas las ofertas
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacingLg }]}
        showsVerticalScrollIndicator={false}
      >
        <ComparadorOfertas 
          ofertas={ofertas}
          onAceptarOferta={solicitud && solicitud.estado === 'adjudicada' ? undefined : handleAceptarOferta}
          solicitudAdjudicada={solicitud && solicitud.estado === 'adjudicada'}
          solicitudId={solicitudId}
        />
      </ScrollView>

      {procesando && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={bgPaper} />
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
    backgroundColor: bgDefault
  },
  // Header styles - Alineado con otros headers de la app
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingMd,
    paddingVertical: spacingSm + 4,
    backgroundColor: bgPaper,
    borderBottomWidth: 1,
    borderBottomColor: borderLight,
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
    borderRadius: radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: bgDefault,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSizeLg,
    fontWeight: fontWeightBold,
    color: textPrimary,
    textAlign: 'center',
    marginHorizontal: spacingSm,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  ofertasCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: primaryLight,
    paddingHorizontal: spacingSm,
    paddingVertical: spacingXs,
    borderRadius: radiusFull,
    gap: 4,
  },
  ofertasCountText: {
    fontSize: fontSizeSm,
    fontWeight: fontWeightBold,
    color: primaryColor,
  },
  // Subtítulo
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingSm,
    paddingHorizontal: spacingMd,
    backgroundColor: bgPaper,
    borderBottomWidth: 1,
    borderBottomColor: borderLight,
    gap: spacingXs,
  },
  subtitleText: {
    fontSize: fontSizeSm,
    color: textTertiary,
  },
  // Scroll
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: spacingMd
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacingXl,
  },
  loadingCard: {
    backgroundColor: bgPaper,
    borderRadius: radiusXl,
    padding: spacingXl,
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
    marginTop: spacingMd,
    fontSize: fontSizeMd,
    fontWeight: fontWeightSemibold,
    color: textPrimary,
  },
  loadingSubtitle: {
    marginTop: spacingXs,
    fontSize: fontSizeSm,
    color: textTertiary,
  },
  // Empty states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacingXl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: errorColor + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacingMd,
  },
  emptyTitle: {
    fontSize: fontSizeXl,
    fontWeight: fontWeightBold,
    color: textPrimary,
    marginBottom: spacingSm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSizeBase,
    color: textSecondary,
    textAlign: 'center',
    marginBottom: spacingLg,
    lineHeight: 22,
    paddingHorizontal: spacingMd,
  },
  emptyButton: {
    backgroundColor: primaryColor,
    paddingVertical: spacingSm + 4,
    paddingHorizontal: spacingXl,
    borderRadius: radiusMd,
  },
  emptyButtonText: {
    color: bgPaper,
    fontSize: fontSizeBase,
    fontWeight: fontWeightSemibold,
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
    backgroundColor: primaryColor,
    borderRadius: radiusLg,
    padding: spacingLg,
    alignItems: 'center',
    minWidth: 180,
  },
  processingText: {
    marginTop: spacingMd,
    fontSize: fontSizeBase,
    color: bgPaper,
    fontWeight: fontWeightMedium
  }
});

export default ComparadorOfertasScreen;
