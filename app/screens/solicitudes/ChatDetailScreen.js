import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar, Keyboard, Alert, Modal,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import {
    Car,
    FileText,
    CircleX,
    Paperclip,
    Send,
    X,
    ChevronRight,
} from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, BORDERS, withOpacity } from '../../design-system/tokens';
import BackButton from '../../components/navigation/BackButton';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import chatService from '../../services/chatService';
import websocketService from '../../services/websocketService'; // Global WS for broadcasts
import AsyncStorage from '@react-native-async-storage/async-storage';
import serverConfig from '../../config/serverConfig';
import { isChatAttachmentImage, resolveChatAttachmentUri } from '../../utils/chatAttachmentMedia';
import { ROUTES } from '../../utils/constants';
import { CONVERSATIONS_KEYS } from '../../hooks/useChats';

/** Altura aproximada de la barra de composición (input + botones + safe area mínima). */
const CHAT_COMPOSER_MIN_HEIGHT = 76;

const ChatDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';

    const styles = getStyles();
    const composerBottomPad = Math.max(insets.bottom, 16);
    const composerBlockHeight = CHAT_COMPOSER_MIN_HEIGHT + composerBottomPad;

    const webScreenFrame = isWeb
        ? {
            height: windowHeight,
            maxHeight: windowHeight,
            minHeight: 0,
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
        }
        : null;

    const queryClient = useQueryClient();
    const { conversationId } = route.params;

    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [attachment, setAttachment] = useState(null); // { uri, type, name, mimeType }
    const [selectedImage, setSelectedImage] = useState(null);
    const flatListRef = useRef(null);
    const sentMessagesRef = useRef(new Set());
    /** context_id de la conversación = id solicitud pública; para filtrar WS sin conversation_id. */
    const solicitudContextRef = useRef(null);

    /**
     * Buffer de mensajes WS que llegan ANTES de que loadData termine.
     * loadData los fusiona al final para evitar la race condition de sobrescritura.
     */
    const pendingWsMessagesRef = useRef([]);
    /** true una vez que loadData terminó de setMessages. */
    const isLoadedRef = useRef(false);

    // Load current user ID
    useEffect(() => {
        const loadUser = async () => {
            try {
                const userJson = await AsyncStorage.getItem('user');
                if (userJson) {
                    const user = JSON.parse(userJson);
                    console.log('👤 [CHAT DETAIL] Loaded user ID:', user.id);
                    setCurrentUserId(user.id);
                } else {
                    console.warn('⚠️ [CHAT DETAIL] No user found in storage');
                }
            } catch (error) {
                console.error('Error loading user:', error);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        solicitudContextRef.current = conversation?.context_id ?? null;
    }, [conversation?.context_id]);

    /**
     * Punto de entrada único para agregar un mensaje al hilo.
     * Si loadData aún no terminó, el mensaje queda en el buffer (pendingWsMessagesRef).
     * loadData fusionará el buffer con los mensajes cargados del servidor.
     */
    const addMessageToState = useCallback((newMsg) => {
        // Sin id no podemos deduplicar → ignorar
        if (newMsg.id == null) return;

        if (!isLoadedRef.current) {
            pendingWsMessagesRef.current.push(newMsg);
            return;
        }

        setMessages((prev) => {
            const idStr = String(newMsg.id);

            // Si ya existe en el estado, enriquecer con attachment si el nuevo lo trae
            const existingIdx = prev.findIndex(
                (m) => m.id != null && String(m.id) === idStr
            );
            if (existingIdx !== -1) {
                const existing = prev[existingIdx];
                const hasNewAttachment =
                    (newMsg.attachment || newMsg.archivo_adjunto) &&
                    !existing.attachment &&
                    !existing.archivo_adjunto;
                if (hasNewAttachment) {
                    const updated = [...prev];
                    updated[existingIdx] = {
                        ...existing,
                        attachment: newMsg.attachment ?? newMsg.archivo_adjunto,
                        archivo_adjunto: newMsg.archivo_adjunto ?? newMsg.attachment,
                    };
                    return updated;
                }
                return prev;
            }

            // Lo enviamos nosotros (optimistic) - ignorar el eco del servidor
            // a menos que traiga attachment real (URL de servidor vs file://)
            if (sentMessagesRef.current.has(idStr)) {
                const optimisticIdx = prev.findIndex(
                    (m) => m.is_temp && (
                        m.content === newMsg.content ||
                        (m.attachment && newMsg.attachment)
                    )
                );
                if (
                    optimisticIdx !== -1 &&
                    newMsg.attachment &&
                    !String(newMsg.attachment).startsWith('file://')
                ) {
                    const updated = [...prev];
                    updated[optimisticIdx] = {
                        ...updated[optimisticIdx],
                        id: newMsg.id,
                        attachment: newMsg.attachment,
                        archivo_adjunto: newMsg.archivo_adjunto ?? newMsg.attachment,
                        is_temp: false,
                    };
                    return updated;
                }
                return prev;
            }

            return [newMsg, ...prev];
        });
    }, []);

    const patchConversationsUnreadZero = useCallback(
        (convId) => {
            ['service', 'marketplace'].forEach((tab) => {
                queryClient.setQueryData(CONVERSATIONS_KEYS.list(tab), (old) => {
                    if (!Array.isArray(old)) return old;
                    return old.map((c) =>
                        String(c.id) === String(convId)
                            ? { ...c, unread_count: 0 }
                            : c,
                    );
                });
            });
        },
        [queryClient],
    );

    const loadData = useCallback(async () => {
        try {
            const conv = await chatService.getConversation(conversationId);
            setConversation(conv);
            solicitudContextRef.current = conv?.context_id ?? null;

            const msgsData = await chatService.getMessages(conversationId);
            const raw = msgsData?.results ?? msgsData;
            const loadedList = (Array.isArray(raw) ? raw : []).map((m) => ({
                ...m,
                content: m.content ?? m.message ?? m.mensaje ?? '',
                attachment: m.attachment ?? m.archivo_adjunto ?? null,
            }));

            isLoadedRef.current = true;

            const pendingNow = pendingWsMessagesRef.current;
            pendingWsMessagesRef.current = [];

            setMessages(() => {
                const loadedIds = new Set(loadedList.map((m) => String(m.id)));
                const freshPending = pendingNow
                    .filter(
                        (m) =>
                            m.id != null &&
                            !loadedIds.has(String(m.id)) &&
                            !sentMessagesRef.current.has(String(m.id)),
                    )
                    .reverse();
                return [...freshPending, ...loadedList];
            });

            setLoading(false);

            chatService
                .markRead(conversationId)
                .then(() => patchConversationsUnreadZero(conversationId))
                .catch(() => {});
        } catch (error) {
            console.error('Error loading chat:', error);
        } finally {
            setLoading(false);
        }
    }, [conversationId, patchConversationsUnreadZero]);

    useEffect(() => {
        // Resetear estado de carga para esta conversación
        isLoadedRef.current = false;
        pendingWsMessagesRef.current = [];

        loadData();

        // WS específico de la conversación (recibe ecos de mensajes propios y mensajes del proveedor)
        chatService.connect(conversationId, (raw) => {
            const msgId = raw.id ?? raw.mensaje_id ?? null;
            if (msgId == null) return;
            const normalized = {
                id: msgId,
                content: raw.content ?? raw.message ?? raw.mensaje ?? '',
                sender_id: raw.sender_id ?? raw.sender?.id,
                sender: raw.sender ?? { id: raw.sender_id ?? raw.sender?.id },
                timestamp: raw.timestamp ?? raw.created_at,
                created_at: raw.created_at ?? raw.timestamp,
                attachment: raw.attachment ?? raw.archivo_adjunto ?? null,
                archivo_adjunto: raw.archivo_adjunto ?? raw.attachment ?? null,
                is_read: raw.is_read ?? false,
            };
            addMessageToState(normalized);
        });

        // WS global: recibe broadcasts del proveedor hacia el usuario
        const handleGlobalMessage = (data) => {
            if (data.type !== 'nuevo_mensaje_chat') return;

            const myConv = String(conversationId);

            // Filtrar por conversation_id si está presente
            const wsConv =
                data.conversation_id != null && String(data.conversation_id).trim() !== ''
                    ? String(data.conversation_id)
                    : null;

            if (wsConv != null) {
                // Tenemos conversation_id → filtro exacto
                if (wsConv !== myConv) return;
            } else {
                // Sin conversation_id → intentar filtro por solicitud_id
                // Si solicitud aún no cargó (solicitudContextRef null), NO descartar:
                // el WS de conversación ya está manejando el mensaje.
                const sid = solicitudContextRef.current;
                if (sid != null) {
                    if (data.solicitud_id == null || String(data.solicitud_id) !== String(sid)) return;
                }
                // Si sid == null, dejar pasar (el WS de conversación cubre este caso)
            }

            // ID robusto: el backend puede enviar mensaje_id o id
            const msgId = data.mensaje_id ?? data.id ?? null;
            if (msgId == null) return;

            const newMessage = {
                id: msgId,
                content: data.mensaje ?? data.content ?? data.message ?? '',
                sender_id: data.sender_id,
                sender: { id: data.sender_id, username: data.enviado_por },
                created_at: data.timestamp ?? new Date().toISOString(),
                timestamp: data.timestamp ?? new Date().toISOString(),
                attachment: data.archivo_adjunto ?? data.attachment ?? null,
                is_read: false,
            };

            addMessageToState(newMessage);
        };

        websocketService.onMessage('nuevo_mensaje_chat', handleGlobalMessage);

        // Asegurar que el WS global esté conectado
        if (!websocketService.getConnectionStatus()) {
            websocketService.connect();
        }

        return () => {
            chatService.disconnect();
            websocketService.offMessage('nuevo_mensaje_chat', handleGlobalMessage);
        };
    }, [conversationId, addMessageToState, loadData]);

    const handlePickAttachment = async () => {
        Alert.alert(
            'Adjuntar archivo',
            'Selecciona el tipo de archivo',
            [
                {
                    text: 'Galería de fotos',
                    onPress: async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: 0.8,
                            allowsEditing: false, // Send full image
                        });

                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            const asset = result.assets[0];
                            setAttachment({
                                uri: asset.uri,
                                type: 'image',
                                name: asset.fileName || `image_${Date.now()}.jpg`,
                                mimeType: asset.mimeType || 'image/jpeg'
                            });
                        }
                    }
                },
                {
                    text: 'Cámara',
                    onPress: async () => {
                        try {
                            const { status } = await ImagePicker.requestCameraPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert('Permiso denegado', 'Se requiere permiso para acceder a la cámara.');
                                return;
                            }

                            const result = await ImagePicker.launchCameraAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                quality: 0.8,
                            });

                            if (!result.canceled && result.assets && result.assets.length > 0) {
                                const asset = result.assets[0];
                                setAttachment({
                                    uri: asset.uri,
                                    type: 'image',
                                    name: `camera_${Date.now()}.jpg`,
                                    mimeType: 'image/jpeg'
                                });
                            }
                        } catch (error) {
                            console.error("Error launching camera:", error);
                            Alert.alert('Error', 'No se pudo abrir la cámara.');
                        }
                    }
                },
                {
                    text: 'Documento',
                    onPress: async () => {
                        try {
                            const result = await DocumentPicker.getDocumentAsync({
                                type: '*/*', // All files
                                copyToCacheDirectory: true
                            });

                            if (!result.canceled && result.assets && result.assets.length > 0) {
                                const asset = result.assets[0];
                                setAttachment({
                                    uri: asset.uri,
                                    type: 'document',
                                    name: asset.name,
                                    mimeType: asset.mimeType
                                });
                            }
                        } catch (err) {
                            console.log('Error picking document', err);
                        }
                    }
                },
                {
                    text: 'Cancelar',
                    style: 'cancel'
                }
            ]
        );
    };

    const sendMessage = async () => {
        const text = inputText.trim();
        console.log('📤 [CHAT DETAIL] Attempting to send message:', { text, hasAttachment: !!attachment, currentUserId });

        // Allow sending if there is an attachment OR text
        if ((!text && !attachment) || !currentUserId) {
            console.warn('❌ [CHAT DETAIL] Cannot send: missing text/attachment or user ID', { text, hasAttachment: !!attachment, currentUserId });
            return;
        }

        setSending(true);

        // Optimistic UI: create temp message
        const tempMsg = {
            id: `temp-${Date.now()}`,
            content: text,
            sender_id: currentUserId,
            timestamp: new Date().toISOString(),
            is_temp: true,
            attachment: attachment ? attachment.uri : null // Preview
        };

        setMessages(prev => [tempMsg, ...prev]);
        setInputText(''); // Clear input immediately
        const tempAttachment = attachment;
        setAttachment(null); // Clear attachment

        try {
            // Send via HTTP with FormData
            const formData = new FormData();
            if (text) formData.append('content', text);
            if (tempAttachment) {
                formData.append('attachment', {
                    uri: tempAttachment.uri,
                    name: tempAttachment.name,
                    type: tempAttachment.mimeType || 'application/octet-stream'
                });
            }

            const realMsg = await chatService.sendMessageHTTP(conversationId, formData, true); // true = isMultipart

            // Add to sent messages set to avoid duplicate from WebSocket
            if (realMsg && realMsg.id) {
                sentMessagesRef.current.add(String(realMsg.id));
                // Clear after 30 seconds
                setTimeout(() => {
                    sentMessagesRef.current.delete(String(realMsg.id));
                }, 30000);
            }

            // Replace temp message with real one
            setMessages(prev =>
                prev.map((m) =>
                    m.id === tempMsg.id
                        ? {
                              ...realMsg,
                              content: realMsg.content ?? realMsg.message ?? realMsg.mensaje ?? text,
                              attachment: realMsg.attachment ?? realMsg.archivo_adjunto ?? null,
                          }
                        : m,
                ),
            );
        } catch (error) {
            console.error('Error sending message:', error);
            // Remove temp message on error
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
            Alert.alert('Error', 'No se pudo enviar el mensaje. Intenta nuevamente.');
            // Restore text if failed? Maybe too complex for now
        } finally {
            setSending(false);
        }
    };

    const renderHeader = () => {
        const providerName = conversation?.other_participant?.full_name || 'Proveedor';

        const vehicleInfo = conversation?.context_info?.title || '';
        const serviceInfo = conversation?.context_info?.subtitle || '';
        const contextText = serviceInfo ? `${vehicleInfo} • ${serviceInfo}` : vehicleInfo || 'Detalles del chat';

        return (
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.headerTop}>
                    <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />

                    <Image
                        source={conversation?.other_participant?.foto_perfil || 'https://via.placeholder.com/40'}
                        style={styles.headerAvatar}
                        contentFit="cover"
                        transition={200}
                    />

                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName}>{providerName || conversation?.other_participant?.username || 'Proveedor'}</Text>
                        <Text style={styles.headerRole}>
                            {conversation?.other_participant?.es_mecanico ? 'Mecánico' : 'Usuario'} • Conectado
                        </Text>
                    </View>
                </View>

                {/* Context Bar */}
                <TouchableOpacity
                    style={styles.contextBar}
                    onPress={() => {
                        const type = conversation?.context_info?.type;
                        const id = conversation?.context_info?.id;
                        // console.log('Navigation Context:', { type, id, routes: ROUTES }); // Debug log

                        if (!type || !id) return;

                        const lowerType = type.toLowerCase();

                        if (lowerType === 'solicitudservicio' || lowerType === 'solicitud' || lowerType.includes('solicitud')) {
                            navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: id });
                        } else if (lowerType === 'vehiculo' || lowerType === 'vehicle' || lowerType.includes('vehiculo')) {
                            navigation.navigate(ROUTES.VEHICLE_PROFILE, { vehiculoId: id });
                        } else {
                            // Fallback for debugging
                            if (__DEV__) {
                                Alert.alert('Debug', `Unknown context type: ${type}, ID: ${id}`);
                            }
                        }
                    }}
                >
                    <View style={styles.contextIcon}>
                        <Car size={16} color={COLORS.primary[500]} />
                    </View>
                    <Text style={styles.contextText}>{contextText}</Text>
                    <ChevronRight size={16} color={COLORS.text.tertiary} />
                </TouchableOpacity>
            </View>
        );
    };

    const renderMessage = ({ item }) => {
        const senderId = item.sender_id ?? item.sender?.id;
        const isMe =
            currentUserId != null &&
            senderId != null &&
            String(senderId) === String(currentUserId);
        const messageBody = item.content ?? item.message ?? item.mensaje ?? '';
        const attachmentUri = item.attachment ?? item.archivo_adjunto;
        const hasAttachment = !!attachmentUri;
        const imageUri = hasAttachment
            ? resolveChatAttachmentUri(attachmentUri, () => serverConfig.getMediaURL())
            : '';
        const showAsImage = hasAttachment && isChatAttachmentImage(attachmentUri);

        return (
            <View style={[
                styles.messageContainer,
                isMe ? styles.messageRight : styles.messageLeft,
                hasAttachment ? { maxWidth: '70%' } : {} // Allow more width for images
            ]}>
                <View style={[
                    styles.bubble,
                    isMe ? styles.bubbleRight : styles.bubbleLeft,
                    hasAttachment ? { padding: 4 } : {} // Less padding for images
                ]}>
                    {hasAttachment && (
                        <View style={styles.attachmentContainer}>
                            {showAsImage && imageUri ? (
                                <TouchableOpacity onPress={() => setSelectedImage(imageUri)}>
                                    <Image
                                        source={{ uri: imageUri }}
                                        style={styles.messageImage}
                                        contentFit="cover"
                                        cachePolicy="disk"
                                    />
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.documentAttachment}>
                                    <FileText size={24} color={isMe ? COLORS.text.onPrimary : COLORS.primary[600]} />
                                    <Text style={[styles.documentText, isMe ? { color: COLORS.text.onPrimary } : { color: COLORS.text.primary }]} numberOfLines={1}>
                                        {typeof attachmentUri === 'string' ? attachmentUri.split('?')[0].split('/').pop() : 'Documento'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {!!messageBody && (
                        <Text style={[
                            styles.messageText,
                            isMe ? styles.textRight : styles.textLeft,
                            hasAttachment ? { paddingHorizontal: 10, paddingBottom: 6 } : {}
                        ]}>{messageBody}</Text>
                    )}

                    <Text style={[
                        styles.messageTime,
                        isMe ? styles.timeRight : styles.timeLeft,
                        hasAttachment ? { paddingRight: 10, paddingBottom: 6 } : {}
                    ]}>
                        {(item.timestamp || item.created_at)
                            ? new Date(item.timestamp || item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                    </Text>
                </View>
            </View>
        );
    };

    const composerBlock = (
        <>
            {attachment && (
                <View style={styles.previewContainer}>
                    <View style={styles.previewWrapper}>
                        {attachment.type === 'document' ? (
                            <View style={styles.docPreview}>
                                <FileText size={24} color={COLORS.text.secondary} />
                                <Text style={styles.previewName} numberOfLines={1}>{attachment.name}</Text>
                            </View>
                        ) : (
                            <Image source={{ uri: attachment.uri }} style={styles.imagePreview} contentFit="cover" />
                        )}
                        <TouchableOpacity style={styles.removePreviewButton} onPress={() => setAttachment(null)}>
                            <CircleX size={24} color={COLORS.error.main} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={[styles.inputContainer, { paddingBottom: composerBottomPad }]}>
                <TouchableOpacity style={styles.iconButton} onPress={handlePickAttachment}>
                    <Paperclip size={24} color={COLORS.primary[500]} />
                </TouchableOpacity>

                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        placeholder="Escribe un mensaje..."
                        placeholderTextColor={COLORS.text.disabled}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        blurOnSubmit={false}
                        returnKeyType="send"
                        onSubmitEditing={Platform.OS !== 'web' ? sendMessage : undefined}
                        onKeyPress={Platform.OS === 'web' ? (e) => {
                            if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                                e.preventDefault?.();
                                sendMessage();
                            }
                        } : undefined}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.sendButton, (!inputText.trim() && !attachment) && styles.sendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={!inputText.trim() && !attachment}
                >
                    <Send
                        size={20}
                        color={(!inputText.trim() && !attachment) ? COLORS.text.disabled : COLORS.text.onPrimary}
                    />
                </TouchableOpacity>
            </View>
        </>
    );

    const listPaddingTopForComposer =
        composerBlockHeight + (attachment ? 56 : 0);

    return (
        <View style={[styles.container, webScreenFrame]}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            {renderHeader()}

            <View style={[styles.messagesPane, isWeb && styles.messagesPaneWeb]}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary[500]} />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => String(item.id)}
                        style={isWeb ? styles.listWeb : undefined}
                        contentContainerStyle={[
                            styles.listContent,
                            isWeb && { paddingTop: listPaddingTopForComposer },
                        ]}
                        inverted
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    />
                )}
            </View>

            {isWeb ? (
                <View style={styles.composerDockWeb}>
                    {composerBlock}
                </View>
            ) : (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={0}
                >
                    {composerBlock}
                </KeyboardAvoidingView>
            )}

            <Modal
                visible={!!selectedImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        style={[styles.modalCloseButton, { top: insets.top + 20 }]}
                        onPress={() => setSelectedImage(null)}
                    >
                        <X size={30} color={COLORS.text.inverse} />
                    </TouchableOpacity>

                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.fullImage}
                            contentFit="contain"
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
};

const getStyles = () => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.default,
        ...(Platform.OS === 'web' ? { display: 'flex', flexDirection: 'column' } : null),
    },
    messagesPane: {
        flex: 1,
    },
    messagesPaneWeb: {
        minHeight: 0,
        overflow: 'hidden',
    },
    listWeb: {
        flex: 1,
        minHeight: 0,
    },
    composerDockWeb: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        backgroundColor: COLORS.background.default,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    header: {
        backgroundColor: COLORS.background.paper,
        borderBottomWidth: BORDERS.width.thin,
        borderBottomColor: COLORS.border.light,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 56,
    },
    backButton: {
        marginRight: 8,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: COLORS.neutral.gray[200],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    headerInfo: {
        flex: 1,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text.primary,
        lineHeight: 20,
    },
    headerRole: {
        fontSize: 12,
        color: COLORS.text.secondary,
        fontWeight: '500',
    },
    contextBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.neutral.gray[100],
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.border.light,
    },
    contextIcon: {
        marginRight: 8,
    },
    contextText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.primary[700],
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: 32,
    },
    messageContainer: {
        marginBottom: 8,
        maxWidth: '80%',
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    messageRight: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end',
    },
    messageLeft: {
        alignSelf: 'flex-start',
        justifyContent: 'flex-start',
    },
    bubble: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 18,
        maxWidth: '100%',
    },
    bubbleRight: {
        backgroundColor: COLORS.primary[500],
        borderBottomRightRadius: 4,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.primary[600],
    },
    bubbleLeft: {
        backgroundColor: COLORS.neutral.gray[100],
        borderBottomLeftRadius: 4,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    textRight: {
        color: COLORS.text.onPrimary,
    },
    textLeft: {
        color: COLORS.text.primary,
    },
    messageTime: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    timeRight: {
        color: withOpacity(COLORS.base.white, 0.85),
    },
    timeLeft: {
        color: COLORS.text.tertiary,
    },
    messageImage: {
        width: 200,
        height: 150,
        borderRadius: 12,
    },
    documentAttachment: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        gap: 8,
    },
    documentText: {
        fontSize: 14,
        fontWeight: '500',
        maxWidth: 150,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: COLORS.background.paper,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.border.light,
    },
    iconButton: {
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.neutral.gray[100],
        borderRadius: 24,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        marginHorizontal: 8,
        paddingHorizontal: 12,
        marginBottom: 8,
        minHeight: 44,
    },
    input: {
        flex: 1,
        maxHeight: 100,
        paddingVertical: 10,
        paddingRight: 8,
        fontSize: 14,
        color: COLORS.text.primary,
    },
    clipButton: {
        padding: 4,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        marginLeft: 4,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.primary[600],
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.neutral.gray[200],
        borderColor: COLORS.border.light,
    },
    previewContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        paddingTop: 4,
        backgroundColor: COLORS.background.paper,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.border.light,
    },
    previewWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.neutral.gray[100],
        borderRadius: BORDERS.radius.md,
        padding: 8,
        alignSelf: 'flex-start',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    imagePreview: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 8,
    },
    docPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
        gap: 4,
    },
    previewName: {
        fontSize: 12,
        color: COLORS.text.secondary,
        maxWidth: 150,
    },
    removePreviewButton: {
        padding: 2,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: withOpacity(COLORS.base.inkBlack, 0.95),
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButton: {
        position: 'absolute',
        right: 20,
        zIndex: 20,
        padding: 10,
        backgroundColor: withOpacity(COLORS.base.white, 0.15),
        borderRadius: 25,
        borderWidth: 1,
        borderColor: withOpacity(COLORS.base.white, 0.2),
    },
    fullImage: {
        width: '100%',
        height: '80%',
    },
});

export default ChatDetailScreen;
