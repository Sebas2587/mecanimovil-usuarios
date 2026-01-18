import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { format, parseISO, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import ofertasService from '../../services/ofertasService';
import WebSocketService from '../../services/websocketService';
import { useChats } from '../../context/ChatsContext';
import { useChatsList, CHATS_KEYS } from '../../hooks/useChats';
import { useQueryClient } from '@tanstack/react-query';
import CustomHeader from '../../components/navigation/Header/Header';
import { useTheme } from '../../design-system/theme/useTheme';

const ChatsListScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { totalMensajesNoLeidos, actualizarTotal, decrementarNoLeidos } = useChats();
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

  const queryClient = useQueryClient();
  const {
    data: chatsData,
    isLoading: isLoadingChats,
    refetch: refetchChats,
    isRefetching: isRefetchingQuery
  } = useChatsList();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sync state with query data
  useEffect(() => {
    if (chatsData) {
      setChats(chatsData);
      setLoading(false);
      setRefreshing(false);

      // Update global count in context
      const total = chatsData.reduce((sum, chat) => sum + chat.mensajes_no_leidos, 0);
      actualizarTotal(total);
    }
  }, [chatsData]);

  const [chatHighlighted, setChatHighlighted] = useState(null); // Para el efecto de nuevo mensaje
  const wsHandlerRef = useRef(null);

  // Cargar chats (Legacy fallback, now using TanStack Query)
  const cargarChats = async (isRefreshing = false) => {
    // Invalidate query instead of manual fetch
    queryClient.invalidateQueries({ queryKey: CHATS_KEYS.list() });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetchChats().finally(() => setRefreshing(false));
  }, [refetchChats]);

  // Suscribirse a WebSocket para actualizaciones en tiempo real
  useEffect(() => {
    // Handler para nuevos mensajes de chat
    const chatMessageHandler = (data) => {
      console.log('📨 [CHATS LIST CLIENTE] Nuevo mensaje recibido vía WebSocket:', data);

      if (data.type === 'nuevo_mensaje_chat' && data.oferta_id) {
        // Actualizar el chat específico en tiempo real
        setChats(prevChats => {
          const chatIndex = prevChats.findIndex(chat => chat.oferta_id === data.oferta_id);

          if (chatIndex !== -1) {
            // Chat ya existe, actualizarlo
            const chatActualizado = { ...prevChats[chatIndex] };

            // Actualizar último mensaje
            chatActualizado.ultimo_mensaje = {
              id: data.mensaje_id,
              mensaje: data.mensaje,
              fecha_envio: data.timestamp,
              es_propio: !data.es_proveedor, // Si es del proveedor, no es propio del cliente
              leido: false,
            };

            // Incrementar contador de no leídos si el mensaje es del proveedor
            if (data.es_proveedor) {
              chatActualizado.mensajes_no_leidos = (chatActualizado.mensajes_no_leidos || 0) + 1;
              console.log(`📨 [CHATS LIST CLIENTE] Incrementado contador: ${chatActualizado.mensajes_no_leidos}`);

              // Activar efecto de highlight para este chat
              setChatHighlighted(data.oferta_id);
              setTimeout(() => {
                setChatHighlighted(null);
              }, 2000); // Highlight por 2 segundos
            }

            // Crear nueva lista con el chat actualizado al principio
            const nuevosChats = [
              chatActualizado,
              ...prevChats.filter((_, index) => index !== chatIndex)
            ];

            // Recalcular total de no leídos y actualizar contexto
            const nuevoTotal = nuevosChats.reduce((sum, chat) => sum + chat.mensajes_no_leidos, 0);
            actualizarTotal(nuevoTotal);

            console.log(`✅ [CHATS LIST CLIENTE] Chat actualizado y movido al principio`);
            return nuevosChats;
          } else {
            // Chat nuevo, recargar toda la lista
            console.log('📨 [CHATS LIST CLIENTE] Chat nuevo detectado, recargando lista completa');
            cargarChats(true);
            return prevChats;
          }
        });
      }
    };

    // Handler para actualizaciones de estado de conexión
    const connectionStatusHandler = (data) => {
      console.log('🔄 [CHATS LIST CLIENTE] Actualización de estado de conexión recibida:', data);

      if (data.type === 'connection_status_update' || data.type === 'mechanic_status_update') {
        // El proveedor_id puede ser el ID del modelo MecanicoDomicilio/Taller
        // Necesitamos buscar por usuario_id o por el tipo + nombre
        const proveedorId = data.proveedor_id;
        const usuarioId = data.usuario_id;
        const tipoProveedor = data.tipo_proveedor;
        const nombreProveedor = data.nombre_proveedor;
        const estaConectado = data.esta_conectado !== undefined
          ? data.esta_conectado
          : (data.is_online || data.status === 'online' || data.status === 'busy');

        if (proveedorId || usuarioId) {
          // Actualizar el estado de conexión en los chats que correspondan
          setChats(prevChats => {
            return prevChats.map(chat => {
              // Verificar si el chat corresponde a este proveedor
              // Puede coincidir por usuario_id (si el backend lo envía) o por nombre + tipo
              const coincidePorUsuario = usuarioId && chat.otra_persona?.id === usuarioId;
              const coincidePorTipoYNombre = tipoProveedor && nombreProveedor &&
                chat.otra_persona?.tipo === tipoProveedor &&
                chat.otra_persona?.nombre === nombreProveedor;

              if (coincidePorUsuario || coincidePorTipoYNombre) {
                const chatActualizado = { ...chat };
                if (!chatActualizado.otra_persona) {
                  chatActualizado.otra_persona = {};
                }
                chatActualizado.otra_persona = {
                  ...chatActualizado.otra_persona,
                  esta_conectado: estaConectado,
                };
                console.log(`✅ [CHATS LIST CLIENTE] Estado de conexión actualizado para proveedor (${nombreProveedor || proveedorId}): ${estaConectado}`);
                return chatActualizado;
              }
              return chat;
            });
          });
        }
      }
    };

    // Registrar handlers
    wsHandlerRef.current = { chatMessageHandler, connectionStatusHandler };
    WebSocketService.onMessage('nuevo_mensaje_chat', chatMessageHandler);
    WebSocketService.onMessage('connection_status_update', connectionStatusHandler);
    WebSocketService.onMessage('mechanic_status_update', connectionStatusHandler);

    return () => {
      if (wsHandlerRef.current) {
        WebSocketService.offMessage('nuevo_mensaje_chat', wsHandlerRef.current.chatMessageHandler);
        WebSocketService.offMessage('connection_status_update', wsHandlerRef.current.connectionStatusHandler);
        WebSocketService.offMessage('mechanic_status_update', wsHandlerRef.current.connectionStatusHandler);
        wsHandlerRef.current = null;
      }
    };
  }, []);

  // Cargar chats cuando la pantalla está en foco
  useFocusEffect(
    useCallback(() => {
      // Background refetch
      refetchChats();
    }, [refetchChats])
  );

  // Formatear fecha del último mensaje
  const formatearFecha = (fechaStr) => {
    try {
      const fecha = parseISO(fechaStr);
      if (isToday(fecha)) {
        return format(fecha, 'h:mm a', { locale: es });
      } else if (isYesterday(fecha)) {
        return 'Ayer';
      } else {
        return format(fecha, 'dd/MM/yy', { locale: es });
      }
    } catch (error) {
      return '';
    }
  };

  // Renderizar un chat item
  const renderChatItem = ({ item }) => {
    const {
      oferta_id,
      otra_persona,
      vehiculo,
      ultimo_mensaje,
      mensajes_no_leidos,
      estado_oferta,
    } = item;

    // Verificar si este chat tiene un nuevo mensaje (highlight)
    const isHighlighted = chatHighlighted === oferta_id;

    // Handler para abrir el chat y resetear contador localmente
    const handleOpenChat = () => {
      // Resetear contador de no leídos localmente (feedback inmediato)
      if (mensajes_no_leidos > 0) {
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.oferta_id === oferta_id) {
              const chatActualizado = { ...chat };
              chatActualizado.mensajes_no_leidos = 0;
              return chatActualizado;
            }
            return chat;
          });
        });

        // Decrementar en el contexto
        decrementarNoLeidos(mensajes_no_leidos);
      }

      // Navegar al chat
      navigation.navigate('ChatOferta', { ofertaId: oferta_id });
    };

    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          isHighlighted && styles.chatItemHighlighted
        ]}
        onPress={handleOpenChat}
        activeOpacity={0.7}
      >
        {/* Foto de perfil */}
        <View style={styles.avatarContainer}>
          {otra_persona?.foto ? (
            <Image source={{ uri: otra_persona.foto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons name="person" size={32} color="#999" />
            </View>
          )}

          {/* Indicador de conexión - solo para mecánicos conectados */}
          {otra_persona?.tipo === 'mecanico' && otra_persona?.esta_conectado && (
            <View style={styles.connectionIndicator}>
              <Ionicons
                name="checkmark"
                size={8}
                color="#FFFFFF"
              />
            </View>
          )}

          {otra_persona?.tipo && (
            <View style={[
              styles.tipoBadge,
              otra_persona.tipo === 'taller' && styles.tipoBadgeTaller
            ]}>
              <Ionicons
                name={otra_persona.tipo === 'taller' ? 'business' : 'car'}
                size={10}
                color="#FFF"
              />
            </View>
          )}
        </View>

        {/* Información del chat */}
        <View style={styles.chatInfo}>
          {/* Línea 1: Nombre y hora */}
          <View style={styles.chatHeader}>
            <Text style={styles.chatNombre} numberOfLines={1}>
              {otra_persona?.nombre || 'Usuario'}
            </Text>
            <Text style={styles.chatFecha}>
              {formatearFecha(ultimo_mensaje.fecha_envio)}
            </Text>
          </View>

          {/* Línea 2: Vehículo */}
          {vehiculo && (
            <Text style={styles.chatVehiculo} numberOfLines={1}>
              {vehiculo.marca} {vehiculo.modelo} {vehiculo.year && `'${vehiculo.year.toString().slice(-2)}`}
              {vehiculo.patente && ` • ${vehiculo.patente}`}
            </Text>
          )}

          {/* Línea 3: Último mensaje */}
          <View style={styles.mensajeContainer}>
            {ultimo_mensaje.es_propio && (
              <Text style={styles.tuMensaje}>Tú: </Text>
            )}
            <Text
              style={[
                styles.chatUltimoMensaje,
                mensajes_no_leidos > 0 && !ultimo_mensaje.es_propio && styles.chatUltimoMensajeNoLeido
              ]}
              numberOfLines={1}
            >
              {ultimo_mensaje.mensaje}
            </Text>
            {mensajes_no_leidos > 0 && (
              <View style={styles.badgeNoLeidos}>
                <Text style={styles.badgeNoLeidosText}>
                  {mensajes_no_leidos > 99 ? '99+' : mensajes_no_leidos}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Indicador de check si el mensaje es propio */}
        {ultimo_mensaje.es_propio && (
          <Ionicons
            name={ultimo_mensaje.leido ? "checkmark-done" : "checkmark"}
            size={18}
            color={ultimo_mensaje.leido ? (colors.primary?.[500] || '#003459') : (colors.text?.secondary || '#5D6F75')}
            style={styles.checkIcon}
          />
        )}
      </TouchableOpacity>
    );
  };

  // Renderizar empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={80} color={colors.text?.secondary || '#5D6F75'} />
      <Text style={styles.emptyTitle}>No tienes mensajes</Text>
      <Text style={styles.emptySubtitle}>
        Tus conversaciones con proveedores aparecerán aquí
      </Text>
    </View>
  );

  // Renderizar header interno
  const renderInternalHeader = () => {
    return (
      <CustomHeader
        title="Chats"
        showBack={false}
        showProfile={true}
        notificationBadge={totalMensajesNoLeidos > 0 ? totalMensajesNoLeidos : 0}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background?.paper || '#FFFFFF'} />
      {renderInternalHeader()}
      <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>

        {/* Lista de chats */}
        {isLoadingChats && chats.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
            <Text style={styles.loadingText}>Cargando chats...</Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.oferta_id}
            contentContainerStyle={[
              styles.listContainer,
              chats.length === 0 && styles.listContainerEmpty
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary?.[500] || '#003459'}
                colors={[colors.primary?.[500] || '#003459']}
              />
            }
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  safeContent: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md || 12,
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  listContainer: {
    flexGrow: 1,
  },
  listContainerEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: colors.background?.paper || '#FFFFFF',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 12,
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    alignItems: 'center',
  },
  chatItemHighlighted: {
    backgroundColor: colors.primary?.[50] || '#E6F2F7',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.sm || 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borders.radius?.avatar?.md || 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: borders.radius?.avatar?.md || 28,
    backgroundColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: borders.radius?.badge?.full || 10,
    backgroundColor: colors.primary?.[500] || '#003459',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borders.width?.medium || 2,
    borderColor: colors.background?.paper || '#FFFFFF',
  },
  tipoBadgeTaller: {
    backgroundColor: colors.warning?.[500] || '#F59E0B',
  },
  // Indicador de conexión - solo verde (se muestra únicamente cuando está conectado)
  connectionIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: borders.radius?.badge?.full || 8,
    backgroundColor: colors.success?.[500] || '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borders.width?.medium || 2,
    borderColor: colors.background?.paper || '#FFFFFF',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  chatInfo: {
    flex: 1,
    marginRight: spacing.xs || 8,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs || 2,
  },
  chatNombre: {
    flex: 1,
    fontSize: typography.fontSize?.lg || 17,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
    marginRight: spacing.xs || 8,
  },
  chatFecha: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.regular || '400',
  },
  chatVehiculo: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
    marginBottom: spacing.xs || 2,
    fontWeight: typography.fontWeight?.regular || '400',
  },
  mensajeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tuMensaje: {
    fontSize: typography.fontSize?.base || 15,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.regular || '400',
  },
  chatUltimoMensaje: {
    flex: 1,
    fontSize: typography.fontSize?.base || 15,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.regular || '400',
  },
  chatUltimoMensajeNoLeido: {
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
  },
  badgeNoLeidos: {
    backgroundColor: colors.primary?.[500] || '#003459',
    borderRadius: borders.radius?.badge?.md || 10,
    paddingHorizontal: spacing.xs || 6,
    paddingVertical: spacing.xs || 2,
    marginLeft: spacing.xs || 8,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNoLeidosText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize?.xs || 12,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  checkIcon: {
    marginLeft: spacing.xs || 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl || 32,
  },
  emptyTitle: {
    fontSize: typography.fontSize?.['2xl'] || 22,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
    marginTop: spacing.md || 16,
    marginBottom: spacing.xs || 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
    textAlign: 'center',
    lineHeight: typography.fontSize?.md ? typography.fontSize.md * 1.4 : 22,
    fontWeight: typography.fontWeight?.regular || '400',
  },
});

export default ChatsListScreen;

