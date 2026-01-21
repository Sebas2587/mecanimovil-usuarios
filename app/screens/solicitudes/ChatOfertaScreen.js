import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ChatBubble from '../../components/ofertas/ChatBubble';
import { useAuth } from '../../context/AuthContext';
import ofertasService from '../../services/ofertasService';
import WebSocketService from '../../services/websocketService';
import solicitudesService from '../../services/solicitudesService';
import { ROUTES } from '../../utils/constants';
import { useTheme } from '../../design-system/theme/useTheme';
import ScrollContainer from '../../components/base/ScrollContainer';

/**
 * Pantalla de chat entre cliente y proveedor para una oferta
 */
const ChatOfertaScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { ofertaId, solicitudId } = route.params || {};
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // Extraer valores del tema de forma segura
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};

  // Asegurar que typography tenga todas las propiedades necesarias
  const safeTypography = typography?.fontSize && typography?.fontWeight
    ? typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
    };

  // Validar que borders esté completamente inicializado
  const safeBorders = (borders?.radius && typeof borders.radius.full !== 'undefined')
    ? borders
    : {
      radius: {
        none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 24,
        full: 9999,
        button: { sm: 8, md: 12, lg: 16, full: 9999 },
        input: { sm: 8, md: 12, lg: 16 },
        card: { sm: 8, md: 12, lg: 16, xl: 20 },
        modal: { sm: 12, md: 16, lg: 20, xl: 24 },
        avatar: { sm: 16, md: 24, lg: 32, full: 9999 },
        badge: { sm: 4, md: 8, lg: 12, full: 9999 },
      },
      width: { none: 0, thin: 1, medium: 2, thick: 4 }
    };

  // Crear estilos dinámicos con los tokens del tema
  const styles = createStyles(colors, safeTypography, spacing, safeBorders);

  const [mensajes, setMensajes] = useState([]);
  const [oferta, setOferta] = useState(null);
  const [solicitud, setSolicitud] = useState(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef(null);
  const esCliente = user && user.is_client;
  const ultimaActualizacionRef = useRef(0);
  const mensajesEnviadosRef = useRef(new Set());
  const wsHandlerRef = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      cargarMensajes();
      suscribirWebSocket();

      return () => {
        desuscribirWebSocket();
      };
    }, [ofertaId])
  );

  useEffect(() => {
    // Scroll al final cuando hay nuevos mensajes
    if (mensajes.length > 0) {
      // Usar requestAnimationFrame para asegurar que el scroll se ejecute después del render
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (flatListRef.current) {
            try {
              flatListRef.current.scrollToEnd({ animated: true });
              console.log('📜 [CHAT CLIENTE] Scroll automático ejecutado');
            } catch (error) {
              console.error('❌ [CHAT CLIENTE] Error en scroll automático:', error);
            }
          }
        }, 100);
      });
    }
  }, [mensajes.length]);

  useEffect(() => {
    // Listeners del teclado
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const cargarMensajes = async () => {
    if (!ofertaId) return;

    try {
      setLoading(true);

      // Cargar oferta y mensajes en paralelo
      const [ofertaResult, mensajesData] = await Promise.all([
        ofertasService.obtenerDetalleOferta(ofertaId),
        ofertasService.obtenerChatOferta(ofertaId),
      ]);

      if (ofertaResult) {
        setOferta(ofertaResult);

        // Cargar solicitud asociada si existe
        // Intentar obtener solicitudId de diferentes fuentes
        const solicitudIdFromOferta = ofertaResult.solicitud || ofertaResult.solicitud_id || ofertaResult.solicitud_detail?.id;
        const solicitudIdToLoad = solicitudIdFromOferta || solicitudId; // Usar solicitudId de route.params si existe

        if (solicitudIdToLoad) {
          try {
            const solicitudData = await solicitudesService.obtenerDetalleSolicitud(solicitudIdToLoad);
            // Normalizar solicitud si viene en formato GeoJSON Feature
            const solicitudNormalizada = solicitudData && solicitudData.type === 'Feature' && solicitudData.properties
              ? { ...solicitudData.properties, id: solicitudData.id || solicitudData.properties.id, geometry: solicitudData.geometry }
              : solicitudData;
            setSolicitud(solicitudNormalizada);
          } catch (error) {
            console.warn('Error cargando solicitud asociada:', error);
            // No es crítico si falla, solo no mostraremos la sección
          }
        }
      }

      setMensajes(mensajesData || []);

      // El scroll automático se maneja en el useEffect que depende de mensajes.length

      // Marcar mensajes como leídos
      await ofertasService.marcarMensajesComoLeidos(ofertaId);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    } finally {
      setLoading(false);
    }
  };

  const suscribirWebSocket = () => {
    if (!ofertaId) return;

    console.log('🔗 [CHAT CLIENTE] Suscribiendo a WebSocket para oferta:', ofertaId);
    console.log('🔗 [CHAT CLIENTE] WebSocket conectado?', WebSocketService.getConnectionStatus());

    // Escuchar nuevos mensajes usando onMessage del servicio
    const handler = (data) => {
      console.log('📨 [CHAT CLIENTE] Handler recibió mensaje:', data);
      console.log('📨 [CHAT CLIENTE] Oferta actual:', ofertaId, 'Oferta del mensaje:', data.oferta_id);

      if (data.type === 'nuevo_mensaje_chat' && data.oferta_id === ofertaId) {
        console.log('✅ [CHAT CLIENTE] Mensaje es para esta oferta');

        // Evitar duplicados - si el mensaje ya fue enviado por nosotros, ignorarlo
        if (mensajesEnviadosRef.current.has(data.mensaje_id)) {
          console.log('💬 [CHAT CLIENTE] Mensaje ya procesado (enviado por nosotros), ignorando');
          return;
        }

        // Debouncing - evitar actualizaciones muy frecuentes
        const ahora = Date.now();
        if (ahora - ultimaActualizacionRef.current < 500) {
          console.log('💬 [CHAT CLIENTE] Debouncing - esperando antes de actualizar');
          return;
        }
        ultimaActualizacionRef.current = ahora;

        console.log('💬 [CHAT CLIENTE] Nuevo mensaje recibido por WebSocket:', data);

        // Agregar mensaje a la lista (actualización en tiempo real)
        setMensajes(prev => {
          // Verificar que el mensaje no exista ya
          if (prev.some(m => m.id === data.mensaje_id)) {
            console.log('💬 [CHAT CLIENTE] Mensaje ya existe en la lista, ignorando');
            return prev;
          }

          console.log('✨ [CHAT CLIENTE] Agregando mensaje a la lista');

          // Crear objeto de mensaje
          const nuevoMensaje = {
            id: data.mensaje_id,
            oferta: data.oferta_id,
            mensaje: data.mensaje,
            enviado_por: 0,
            enviado_por_nombre: data.enviado_por,
            es_proveedor: data.es_proveedor,
            fecha_envio: data.timestamp,
            leido: false,
            fecha_lectura: null,
            archivo_adjunto: null,
          };

          // El scroll automático se maneja en el useEffect que depende de mensajes.length
          return [...prev, nuevoMensaje];
        });

        // Marcar como leído si el mensaje es del proveedor (no del cliente)
        if (data.es_proveedor) {
          // Debounced: marcar como leído después de un delay
          console.log('📖 [CHAT CLIENTE] Marcando mensaje como leído en 1 segundo');
          setTimeout(() => {
            ofertasService.marcarMensajesComoLeidos(ofertaId);
          }, 1000);
        }
      } else {
        console.log('⚠️ [CHAT CLIENTE] Mensaje no es para esta oferta o tipo incorrecto');
      }
    };

    wsHandlerRef.current = handler;
    WebSocketService.onMessage('nuevo_mensaje_chat', handler);
    console.log('✅ [CHAT CLIENTE] Handler registrado para nuevo_mensaje_chat');
  };

  const desuscribirWebSocket = () => {
    if (wsHandlerRef.current) {
      WebSocketService.offMessage('nuevo_mensaje_chat', wsHandlerRef.current);
      wsHandlerRef.current = null;
    }
  };

  const handleEnviarMensaje = async () => {
    if (!nuevoMensaje.trim() || !ofertaId || enviando) {
      console.log('⚠️ [CHAT CLIENTE] Mensaje bloqueado:', { mensaje: !!nuevoMensaje.trim(), ofertaId: !!ofertaId, enviando });
      return;
    }

    const mensajeTexto = nuevoMensaje.trim();
    const mensajeId = `temp-${Date.now()}`; // ID temporal para optimistic update

    console.log('📤 [CHAT CLIENTE] Enviando mensaje:', mensajeTexto);

    // Actualización optimista - agregar mensaje inmediatamente a la UI
    const mensajeOptimista = {
      id: mensajeId,
      oferta: ofertaId,
      mensaje: mensajeTexto,
      enviado_por: user?.id || 0,
      enviado_por_nombre: user?.first_name || user?.username || 'Tú',
      es_proveedor: false,
      fecha_envio: new Date().toISOString(),
      leido: false,
      fecha_lectura: null,
      archivo_adjunto: null,
    };

    setEnviando(true);
    setMensajes(prev => [...prev, mensajeOptimista]);
    setNuevoMensaje('');

    // El scroll automático se maneja en el useEffect que depende de mensajes.length

    try {
      console.log('🔄 [CHAT CLIENTE] Llamando a ofertasService.enviarMensajeChat');
      const result = await ofertasService.enviarMensajeChat(ofertaId, mensajeTexto);
      console.log('✅ [CHAT CLIENTE] Mensaje enviado exitosamente:', result?.id);

      // Marcar el mensaje como enviado para evitar duplicados del WebSocket
      if (result && result.id) {
        mensajesEnviadosRef.current.add(result.id);

        // Reemplazar mensaje optimista con el real
        setMensajes(prev =>
          prev.map(m => m.id === mensajeId ? result : m)
        );

        // Limpiar el Set después de un tiempo (para evitar memory leaks)
        setTimeout(() => {
          mensajesEnviadosRef.current.delete(result.id);
        }, 10000);
      } else {
        console.error('❌ [CHAT CLIENTE] Respuesta sin ID, eliminando mensaje optimista');
        setMensajes(prev => prev.filter(m => m.id !== mensajeId));
        setNuevoMensaje(mensajeTexto);
      }
    } catch (error) {
      console.error('❌ [CHAT CLIENTE] Error enviando mensaje:', error);
      // Si hubo error, eliminar mensaje optimista y restaurar texto
      setMensajes(prev => prev.filter(m => m.id !== mensajeId));
      setNuevoMensaje(mensajeTexto);
    } finally {
      setEnviando(false);
      console.log('🏁 [CHAT CLIENTE] Envío completado, enviando:', false);
    }
  };

  const renderMensaje = ({ item }) => {
    const esPropio = (item.es_proveedor && !esCliente) || (!item.es_proveedor && esCliente);
    return (
      <ChatBubble
        mensaje={item}
        esPropio={esPropio}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={colors.text?.secondary || '#5D6F75'} />
      <Text style={styles.emptyText}>No hay mensajes aún</Text>
      <Text style={styles.emptySubtext}>Comienza la conversación</Text>
    </View>
  );

  // Obtener información del proveedor de la oferta
  const proveedorNombre = oferta?.nombre_proveedor || 'Proveedor';
  const proveedorFoto = mensajes?.[0]?.proveedor_info?.foto || null;

  // Funciones para formatear estado de solicitud con colores del tema
  const getEstadoConfig = (estado) => {
    const configs = {
      creada: {
        color: colors.text?.secondary || '#5D6F75',
        backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
        texto: 'Creada',
        icon: 'document-text-outline'
      },
      seleccionando_servicios: {
        color: colors.info?.[600] || colors.primary?.[600] || '#002A47',
        backgroundColor: colors.info?.[50] || colors.primary?.[50] || '#E6F2F7',
        texto: 'Seleccionando Servicios',
        icon: 'settings-outline'
      },
      publicada: {
        color: colors.primary?.[700] || '#001F2E',
        backgroundColor: colors.primary?.[50] || '#E6F2F7',
        texto: 'Publicada',
        icon: 'send-outline'
      },
      con_ofertas: {
        color: colors.warning?.[700] || '#D97706',
        backgroundColor: colors.warning?.[50] || '#FFFBEB',
        texto: 'Con Ofertas',
        icon: 'bulb-outline'
      },
      adjudicada: {
        color: colors.success?.[700] || '#047857',
        backgroundColor: colors.success?.[50] || '#ECFDF5',
        texto: 'Adjudicada',
        icon: 'checkmark-circle-outline'
      },
      expirada: {
        color: colors.error?.[700] || '#B91C1C',
        backgroundColor: colors.error?.[50] || '#FEF2F2',
        texto: 'Expirada',
        icon: 'time-outline'
      },
      cancelada: {
        color: colors.error?.[700] || '#B91C1C',
        backgroundColor: colors.error?.[50] || '#FEF2F2',
        texto: 'Cancelada',
        icon: 'close-circle-outline'
      }
    };
    return configs[estado] || {
      color: colors.text?.secondary || '#5D6F75',
      backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
      texto: estado || 'Desconocido',
      icon: 'help-circle-outline'
    };
  };

  // Handler para navegar a la solicitud
  const handleSolicitudPress = () => {
    if (solicitud?.id) {
      navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: solicitud.id });
    }
  };

  // Obtener servicios de la solicitud
  const serviciosNombres = solicitud?.servicios_solicitados_detail
    ?.slice(0, 2)
    .map(s => s.nombre)
    .join(', ') || solicitud?.descripcion_problema || 'Sin servicios especificados';

  const Container = Platform.OS === 'web' ? View : SafeAreaView;
  const containerProps = Platform.OS === 'web'
    ? { style: [styles.container, { height: '100vh', paddingTop: 0 }] }
    : { style: styles.container, edges: ['top'] };

  return (
    <Container {...containerProps}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background?.paper || '#FFFFFF'} />

      {/* Header personalizado con nombre y foto del proveedor */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text?.primary || '#00171F'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{proveedorNombre}</Text>
        <View style={styles.headerRight}>
          {proveedorFoto ? (
            <Image
              source={{ uri: proveedorFoto }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Ionicons name="person" size={20} color={colors.text?.secondary || '#5D6F75'} />
            </View>
          )}
        </View>
      </View>

      {/* Sección de solicitud asociada */}
      {solicitud && (
        <TouchableOpacity
          style={styles.solicitudCard}
          onPress={handleSolicitudPress}
          activeOpacity={0.7}
        >
          <View style={styles.solicitudContent}>
            <View style={styles.solicitudLeft}>
              <View style={[styles.solicitudIconContainer, { backgroundColor: getEstadoConfig(solicitud.estado).backgroundColor }]}>
                <Ionicons
                  name={getEstadoConfig(solicitud.estado).icon}
                  size={20}
                  color={getEstadoConfig(solicitud.estado).color}
                />
              </View>
              <View style={styles.solicitudInfo}>
                <Text style={styles.solicitudTitle} numberOfLines={1}>
                  {serviciosNombres}
                  {solicitud.servicios_solicitados_detail?.length > 2 && '...'}
                </Text>
                <View style={styles.solicitudMeta}>
                  <View style={[styles.solicitudEstadoBadge, { backgroundColor: getEstadoConfig(solicitud.estado).backgroundColor }]}>
                    <Text style={[styles.solicitudEstadoText, { color: getEstadoConfig(solicitud.estado).color }]}>
                      {getEstadoConfig(solicitud.estado).texto}
                    </Text>
                  </View>
                  {solicitud.vehiculo_info && (
                    <Text style={styles.solicitudVehiculo} numberOfLines={1}>
                      • {solicitud.vehiculo_info.marca} {solicitud.vehiculo_info.modelo}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text?.secondary || '#5D6F75'} />
          </View>
        </TouchableOpacity>
      )}

      {/* Lista de mensajes */}
      {loading && mensajes.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
          <Text style={styles.loadingText}>Cargando chat...</Text>
        </View>
      ) : (
        <View style={[
          styles.contentContainer,
          Platform.OS === 'web' && {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }
        ]}>
          {Platform.OS === 'web' ? (
            <>
              <ScrollContainer
                style={{ flex: 1 }}
                contentContainerStyle={[
                  styles.mensajesList,
                  { paddingBottom: 150 } // Aumentado para asegurar visibilidad del último mensaje
                ]}
                showsVerticalScrollIndicator={false}
              >
                {mensajes.length === 0 ? (
                  renderEmptyState()
                ) : (
                  <>
                    {mensajes.map((item, index) => (
                      <View key={`mensaje-${item.id || index}`}>
                        {renderMensaje({ item })}
                      </View>
                    ))}
                    {/* Espaciador explícito para asegurar que el último mensaje suba por encima del input fijo */}
                    <View style={{ height: 120, width: '100%' }} />
                  </>
                )}
              </ScrollContainer>

              {/* Input de mensaje - Web (FIXED) */}
              <View style={[
                styles.inputContainer,
                {
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 99999,
                  elevation: 99999,
                  backgroundColor: colors.background?.paper || '#FFFFFF',
                  paddingBottom: Math.max(insets.bottom, spacing.xs || 8),
                  borderTopWidth: 1,
                  borderTopColor: colors.neutral?.gray?.[200] || '#E5E7EB',
                  width: '100%',
                }
              ]}>
                <TouchableOpacity
                  style={styles.actionButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={24} color={colors.text?.secondary || '#5D6F75'} />
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Escribe un mensaje..."
                  value={nuevoMensaje}
                  onChangeText={setNuevoMensaje}
                  multiline
                  maxLength={500}
                  placeholderTextColor={colors.text?.secondary || '#5D6F75'}
                  editable={!enviando}
                />

                <TouchableOpacity
                  style={styles.actionButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mic-outline" size={24} color={colors.text?.secondary || '#5D6F75'} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!nuevoMensaje.trim() || enviando) && styles.sendButtonDisabled
                  ]}
                  onPress={handleEnviarMensaje}
                  disabled={!nuevoMensaje.trim() || enviando}
                  activeOpacity={0.8}
                >
                  {enviando ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <FlatList
              ref={flatListRef}
              style={{ flex: 1 }}
              data={mensajes}
              keyExtractor={(item, index) => `mensaje-${item.id || index}`}
              renderItem={renderMensaje}
              contentContainerStyle={[
                styles.mensajesList,
                mensajes.length === 0 && styles.mensajesListEmpty,
                {
                  paddingBottom: keyboardHeight > 0 ? 70 : (insets.bottom + 80)
                }
              ]}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
              }}
            />
          )}
        </View>
      )}
    </Container>
  );
};

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md || 16,
    paddingTop: spacing.sm || 12,
    paddingBottom: spacing.sm || 12,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: spacing.xs || 4,
    marginRight: spacing.xs || 8,
    borderRadius: borders.radius?.avatar?.sm || 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize?.lg || 17,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
    textAlign: 'center',
    marginHorizontal: spacing.xs || 8,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: borders.radius?.avatar?.sm || 20,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: borders.radius?.avatar?.sm || 20,
    backgroundColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  solicitudCard: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 12,
  },
  solicitudContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  solicitudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm || 12,
  },
  solicitudIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borders.radius?.avatar?.sm || 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm || 12,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  solicitudInfo: {
    flex: 1,
  },
  solicitudTitle: {
    fontSize: typography.fontSize?.base || 15,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing.xs || 4,
    lineHeight: typography.fontSize?.base ? typography.fontSize.base * 1.3 : 19.5,
  },
  solicitudMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs || 8,
  },
  solicitudEstadoBadge: {
    paddingHorizontal: spacing.xs || 8,
    paddingVertical: spacing.xs || 4,
    borderRadius: borders.radius?.badge?.md || 8,
    borderWidth: borders.width?.thin || 1,
  },
  solicitudEstadoText: {
    fontSize: typography.fontSize?.xs || 11,
    fontWeight: typography.fontWeight?.bold || '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  solicitudVehiculo: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm || 12,
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  mensajesList: {
    padding: spacing.md || 16,
    flexGrow: 1,
  },
  mensajesListEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl || 32,
  },
  emptyText: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
    marginTop: spacing.md || 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typography.fontSize?.base || 14,
    color: colors.text?.secondary || '#5D6F75',
    marginTop: spacing.xs || 8,
    textAlign: 'center',
    fontWeight: typography.fontWeight?.regular || '400',
  },
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm || 12,
    paddingTop: spacing.sm || 10,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderTopWidth: borders.width?.thin || 1,
    borderTopColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    gap: spacing.xs || 8,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    ...Platform.select({
      web: {
        zIndex: 1000,
        pointerEvents: 'auto',
      },
    }),
  },
  actionButton: {
    padding: spacing.xs || 6,
    borderRadius: borders.radius?.avatar?.sm || 20,
    marginBottom: spacing.xs || 4,
  },
  input: {
    flex: 1,
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    borderRadius: borders.radius?.input?.full || 24,
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 10,
    fontSize: typography.fontSize?.base || 16,
    color: colors.text?.primary || '#00171F',
    maxHeight: 100,
    minHeight: 40,
    fontWeight: typography.fontWeight?.regular || '400',
    lineHeight: typography.fontSize?.base ? typography.fontSize.base * 1.4 : 22.4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: borders.radius?.avatar?.sm || 20,
    backgroundColor: colors.primary?.[500] || '#003459',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary?.[500] || '#003459',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: spacing.xs || 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.neutral?.gray?.[400] || '#9CA3AF',
  },
});

export default ChatOfertaScreen;

