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
    Paperclip,
    ArrowUp,
    X,
    Image as ImageIcon,
    Camera,
    FileText,
} from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, BORDERS, SPACING, withOpacity } from '../../design-system/tokens';
import BackButton from '../../components/navigation/BackButton';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AttachmentStagingTray from '../../components/chats/AttachmentStagingTray';
import AudioRecorderBar from '../../components/chats/AudioRecorderBar';
import ChatMessageRow, { prepareChatListItems } from '../../components/chats/ChatMessageRow';
import {
  appendChatFileToFormData,
  normalizeChatMessage,
  normalizeAttachmentRef,
} from '../../utils/chatAttachmentMedia';

import chatService from '../../services/chatService';
import websocketService from '../../services/websocketService'; // Global WS for broadcasts
import AsyncStorage from '@react-native-async-storage/async-storage';
import serverConfig from '../../config/serverConfig';
import { ROUTES } from '../../utils/constants';
import { CONVERSATIONS_KEYS } from '../../hooks/useChats';

/** Altura aproximada de la barra de composición (input compacto Airbnb + safe area mínima). */
const CHAT_COMPOSER_MIN_HEIGHT = 64;

const ChatDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';

    const styles = getStyles();
    const composerBottomPad = Math.max(insets.bottom, 10);
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
    const [attachments, setAttachments] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [voiceRecording, setVoiceRecording] = useState(false);
    const [attachMenuVisible, setAttachMenuVisible] = useState(false);
    const flatListRef = useRef(null);
    const sentMessagesRef = useRef(new Set());
    const currentUserIdRef = useRef(null);
    /** temp-* aún no confirmados por HTTP/WS */
    const pendingOptimisticRef = useRef(new Set());
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
                    currentUserIdRef.current = user.id;
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
        const normalized = normalizeChatMessage(newMsg);
        if (normalized.id == null) return;

        if (!isLoadedRef.current) {
            pendingWsMessagesRef.current.push(normalized);
            return;
        }

        setMessages((prev) => {
            const idStr = String(normalized.id);
            const ownId = currentUserIdRef.current;
            const isOwn =
                ownId != null &&
                String(normalized.sender_id ?? normalized.sender?.id) === String(ownId);

            const existingIdx = prev.findIndex(
                (m) => m.id != null && String(m.id) === idStr
            );
            if (existingIdx !== -1) {
                const existing = prev[existingIdx];
                const hasNewAttachment =
                    (normalized.attachment || normalized.archivo_adjunto) &&
                    !existing.attachment &&
                    !existing.archivo_adjunto;
                if (hasNewAttachment || existing.is_temp) {
                    const updated = [...prev];
                    updated[existingIdx] = {
                        ...existing,
                        ...normalized,
                        attachment: normalized.attachment ?? existing.attachment,
                        archivo_adjunto:
                            normalized.archivo_adjunto ??
                            normalized.attachment ??
                            existing.archivo_adjunto,
                        attachment_mime: normalized.attachment_mime || existing.attachment_mime,
                        attachment_name: normalized.attachment_name || existing.attachment_name,
                        is_temp: false,
                    };
                    return updated;
                }
                return prev;
            }

            // Eco propio: reemplazar temp pendiente (evita duplicado optimistic + WS)
            if (isOwn && pendingOptimisticRef.current.size > 0) {
                const incomingContent = normalized.content || '';
                let optIdx = -1;
                for (let i = prev.length - 1; i >= 0; i -= 1) {
                    const m = prev[i];
                    if (!m.is_temp || !pendingOptimisticRef.current.has(String(m.id))) continue;
                    if (String(m.sender_id) !== String(ownId)) continue;
                    if ((m.content || '') !== incomingContent) continue;
                    if (!!m.attachment !== !!normalized.attachment) continue;
                    optIdx = i;
                    break;
                }
                if (optIdx === -1) {
                    for (let i = prev.length - 1; i >= 0; i -= 1) {
                        const m = prev[i];
                        if (m.is_temp && pendingOptimisticRef.current.has(String(m.id))) {
                            optIdx = i;
                            break;
                        }
                    }
                }
                if (optIdx !== -1) {
                    pendingOptimisticRef.current.delete(String(prev[optIdx].id));
                    sentMessagesRef.current.add(idStr);
                    const updated = [...prev];
                    updated[optIdx] = {
                        ...prev[optIdx],
                        ...normalized,
                        id: normalized.id,
                        attachment: normalized.attachment ?? prev[optIdx].attachment,
                        archivo_adjunto:
                            normalized.archivo_adjunto ??
                            normalized.attachment ??
                            prev[optIdx].archivo_adjunto,
                        attachment_mime:
                            normalized.attachment_mime || prev[optIdx].attachment_mime,
                        attachment_name:
                            normalized.attachment_name || prev[optIdx].attachment_name,
                        is_temp: false,
                    };
                    return updated;
                }
            }

            if (sentMessagesRef.current.has(idStr)) {
                return prev;
            }

            return [normalized, ...prev];
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
            const loadedList = (Array.isArray(raw) ? raw : []).map((m) =>
                normalizeChatMessage({
                    ...m,
                    content: m.content ?? m.message ?? m.mensaje ?? '',
                    attachment: normalizeAttachmentRef(m.attachment ?? m.archivo_adjunto),
                }),
            );

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
            const normalized = normalizeChatMessage({
                id: msgId,
                content: raw.content ?? raw.message ?? raw.mensaje ?? '',
                sender_id: raw.sender_id ?? raw.sender?.id,
                sender: raw.sender ?? { id: raw.sender_id ?? raw.sender?.id },
                timestamp: raw.timestamp ?? raw.created_at,
                created_at: raw.created_at ?? raw.timestamp,
                attachment: normalizeAttachmentRef(raw.attachment ?? raw.archivo_adjunto),
                is_read: raw.is_read ?? false,
            });
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

            // El remitente ya recibe el eco por el WS de conversación; evita doble inserción
            if (
                currentUserIdRef.current != null &&
                data.sender_id != null &&
                String(data.sender_id) === String(currentUserIdRef.current)
            ) {
                return;
            }

            const newMessage = normalizeChatMessage({
                id: msgId,
                content: data.mensaje ?? data.content ?? data.message ?? '',
                sender_id: data.sender_id,
                sender: { id: data.sender_id, username: data.enviado_por },
                created_at: data.timestamp ?? new Date().toISOString(),
                timestamp: data.timestamp ?? new Date().toISOString(),
                attachment: normalizeAttachmentRef(data.archivo_adjunto ?? data.attachment),
                is_read: false,
            });

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

    const listItems = React.useMemo(
        () => prepareChatListItems(messages, currentUserId),
        [messages, currentUserId],
    );

    const mapAssetToAttachment = (asset, fallbackType = 'image') => {
        const mime = asset.mimeType || asset.mime || '';
        const name = asset.fileName || asset.name || '';
        const lower = name.toLowerCase();
        const isVideo =
            asset.type === 'video' ||
            mime.startsWith('video/') ||
            /\.(mp4|mov|webm|m4v)$/i.test(lower);
        const isAudio =
            mime.startsWith('audio/') ||
            /\.(mp3|m4a|wav|aac|ogg|caf)$/i.test(lower);
        const type = isVideo ? 'video' : isAudio ? 'audio' : fallbackType;
        const ext = isVideo ? 'mp4' : isAudio ? 'm4a' : 'jpg';
        return {
            uri: asset.uri,
            type,
            name: name || `${type}_${Date.now()}.${ext}`,
            mimeType:
                mime ||
                (isVideo ? 'video/mp4' : isAudio ? 'audio/m4a' : 'image/jpeg'),
        };
    };

    const pickFromGallery = async () => {
        try {
            if (Platform.OS !== 'web') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permiso denegado', 'Se requiere acceso a la galería.');
                    return;
                }
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                quality: 0.8,
                allowsMultipleSelection: true,
                selectionLimit: 10,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const mapped = result.assets.map((a) => mapAssetToAttachment(a));
                setAttachments((prev) => [...prev, ...mapped].slice(0, 10));
            }
        } catch (error) {
            console.error('Error picking gallery:', error);
            Alert.alert('Error', 'No se pudo abrir la galería.');
        }
    };

    const pickFromCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso denegado', 'Se requiere permiso para acceder a la cámara.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const mapped = mapAssetToAttachment(result.assets[0]);
                setAttachments((prev) => [...prev, mapped].slice(0, 10));
            }
        } catch (error) {
            console.error('Error launching camera:', error);
            Alert.alert('Error', 'No se pudo abrir la cámara.');
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
                multiple: true,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const mapped = result.assets.map((asset) => {
                    const lower = (asset.name || '').toLowerCase();
                    const mime = asset.mimeType || '';
                    if (mime.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(lower)) {
                        return mapAssetToAttachment(asset, 'video');
                    }
                    if (mime.startsWith('audio/') || /\.(mp3|m4a|wav|aac)$/i.test(lower)) {
                        return mapAssetToAttachment(asset, 'audio');
                    }
                    if (mime.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(lower)) {
                        return mapAssetToAttachment(asset, 'image');
                    }
                    return {
                        uri: asset.uri,
                        type: 'document',
                        name: asset.name || `documento_${Date.now()}`,
                        mimeType: mime || (lower.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
                    };
                });
                setAttachments((prev) => [...prev, ...mapped].slice(0, 10));
            }
        } catch (err) {
            console.log('Error picking document', err);
        }
    };

    const handlePickAttachment = () => {
        // Alert.alert con botones no funciona de forma fiable en web (RN).
        if (Platform.OS === 'web') {
            setAttachMenuVisible(true);
            return;
        }
        Alert.alert(
            'Adjuntar archivo',
            'Selecciona el tipo de archivo',
            [
                { text: 'Galería (fotos y videos)', onPress: pickFromGallery },
                { text: 'Cámara', onPress: pickFromCamera },
                { text: 'Documento', onPress: pickDocument },
                { text: 'Cancelar', style: 'cancel' },
            ],
        );
    };

    const runAttachOption = async (option) => {
        setAttachMenuVisible(false);
        if (option === 'gallery') await pickFromGallery();
        else if (option === 'camera') await pickFromCamera();
        else if (option === 'document') await pickDocument();
    };

    const sendSingleMessage = async ({ text, attachmentItem, optimisticId }) => {
        const formData = new FormData();
        const safeText = typeof text === 'string' ? text : '';
        if (safeText) formData.append('content', safeText);
        if (attachmentItem) {
            await appendChatFileToFormData(formData, 'attachment', attachmentItem);
        }

        const realMsg = await chatService.sendMessageHTTP(conversationId, formData, true);

        if (realMsg?.id) {
            sentMessagesRef.current.add(String(realMsg.id));
            setTimeout(() => {
                sentMessagesRef.current.delete(String(realMsg.id));
            }, 30000);
        }
        pendingOptimisticRef.current.delete(String(optimisticId));

        const normalizedReal = normalizeChatMessage({
            ...realMsg,
            content: realMsg?.content ?? realMsg?.message ?? realMsg?.mensaje ?? safeText,
            attachment: normalizeAttachmentRef(realMsg?.attachment ?? realMsg?.archivo_adjunto),
            attachment_mime: attachmentItem?.mimeType || attachmentItem?.mime || null,
            attachment_name:
                attachmentItem?.name ||
                (realMsg?.attachment
                    ? String(realMsg.attachment).split('?')[0].split('/').pop()
                    : null),
            is_temp: false,
        });

        // Reemplaza temp y elimina cualquier eco WS que ya haya insertado el mismo id
        setMessages((prev) => {
            const realId = normalizedReal?.id != null ? String(normalizedReal.id) : null;
            const filtered = prev.filter((m) => {
                if (m.id === optimisticId) return false;
                if (realId && String(m.id) === realId) return false;
                return true;
            });
            return [normalizedReal, ...filtered];
        });
    };

    const sendMessage = async (audioAttachment = null) => {
        const text = inputText.trim();
        const queue = audioAttachment ? [audioAttachment] : [...attachments];

        if ((!text && queue.length === 0) || !currentUserId) return;

        setSending(true);
        setInputText('');
        const queueSnapshot = [...queue];
        if (!audioAttachment) setAttachments([]);

        const payloads =
            queueSnapshot.length > 0
                ? queueSnapshot.map((att, index) => ({
                      attachment: att,
                      content: index === queueSnapshot.length - 1 ? text : '',
                  }))
                : [{ attachment: null, content: text }];

        const optimisticIds = payloads.map((p, i) => `temp-${Date.now()}-${i}`);
        optimisticIds.forEach((id) => pendingOptimisticRef.current.add(String(id)));
        const optimisticMessages = payloads.map((p, i) =>
            normalizeChatMessage({
                id: optimisticIds[i],
                content: typeof p.content === 'string' ? p.content : '',
                sender_id: currentUserId,
                timestamp: new Date().toISOString(),
                is_temp: true,
                attachment: p.attachment?.uri ?? null,
                attachment_mime: p.attachment?.mimeType || p.attachment?.mime || null,
                attachment_name: p.attachment?.name || null,
            }),
        );

        setMessages((prev) => [...optimisticMessages.reverse(), ...prev]);

        try {
            for (let i = 0; i < payloads.length; i += 1) {
                await sendSingleMessage({
                    text: payloads[i].content,
                    attachmentItem: payloads[i].attachment,
                    optimisticId: optimisticIds[i],
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
            optimisticIds.forEach((id) => pendingOptimisticRef.current.delete(String(id)));
            setMessages((prev) => prev.filter((m) => !optimisticIds.includes(m.id)));
            if (!audioAttachment) setAttachments(queueSnapshot);
            Alert.alert('Error', 'No se pudo enviar el mensaje. Intenta nuevamente.');
        } finally {
            setSending(false);
        }
    };

    const handleAudioRecorded = (audioAttachment) => {
        sendMessage(audioAttachment);
    };

    const renderHeader = () => {
        const providerName =
            conversation?.other_participant?.full_name ||
            conversation?.other_participant?.username ||
            'Proveedor';

        const vehicleInfo = (conversation?.context_info?.title || '').trim();
        const serviceInfo = (conversation?.context_info?.subtitle || '').trim();
        const contextSubtitle = [vehicleInfo, serviceInfo].filter(Boolean).join(' • ');

        const openContext = () => {
            const type = conversation?.context_info?.type;
            const id = conversation?.context_info?.id;
            if (!type || !id) return;

            const lowerType = type.toLowerCase();
            if (
                lowerType === 'solicitudservicio' ||
                lowerType === 'solicitud' ||
                lowerType.includes('solicitud')
            ) {
                navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: id });
            } else if (
                lowerType === 'vehiculo' ||
                lowerType === 'vehicle' ||
                lowerType.includes('vehiculo')
            ) {
                navigation.navigate(ROUTES.VEHICLE_PROFILE, { vehiculoId: id });
            }
        };

        const hasContext = !!(conversation?.context_info?.type && conversation?.context_info?.id);

        return (
            <View style={[styles.header, { paddingTop: insets.top + SPACING.xs }]}>
                <View style={styles.headerRow}>
                    <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />

                    <TouchableOpacity
                        style={styles.headerIdentity}
                        onPress={hasContext ? openContext : undefined}
                        activeOpacity={hasContext ? 0.85 : 1}
                        disabled={!hasContext}
                    >
                        <Image
                            source={
                                conversation?.other_participant?.foto_perfil ||
                                'https://via.placeholder.com/40'
                            }
                            style={styles.headerAvatar}
                            contentFit="cover"
                            transition={200}
                        />
                        <View style={styles.headerTextCol}>
                            <Text style={styles.headerName} numberOfLines={1}>
                                {providerName}
                            </Text>
                            <Text style={styles.headerContext} numberOfLines={1}>
                                {contextSubtitle ||
                                    (conversation?.other_participant?.es_mecanico
                                        ? 'Mecánico'
                                        : 'Chat')}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {hasContext ? (
                        <TouchableOpacity
                            style={styles.detailsPill}
                            onPress={openContext}
                            accessibilityLabel="Ver detalles"
                            activeOpacity={0.85}
                        >
                            <Text style={styles.detailsPillText}>Detalles</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.detailsPillPlaceholder} />
                    )}
                </View>
            </View>
        );
    };

    const renderMessage = ({ item, index }) => {
        const isMe = item.isMe;
        const newestOwnRead =
            index === 0 &&
            isMe &&
            item.messages?.[0]?.is_read &&
            !item.messages?.[0]?.is_temp;

        return (
            <ChatMessageRow
                item={item}
                isMe={isMe}
                currentUserId={currentUserId}
                onImagePress={setSelectedImage}
                getMediaBase={() => serverConfig.getMediaURL()}
                showReadReceipt={newestOwnRead}
            />
        );
    };

    const canSend = inputText.trim().length > 0 || attachments.length > 0;

    const composerBlock = (
        <>
            <AttachmentStagingTray
                attachments={attachments}
                onRemove={(removeIndex) =>
                    setAttachments((prev) => prev.filter((_, i) => i !== removeIndex))
                }
            />

            {/*
              Tres slots fijos (adjuntar / input / mic). El mic NUNCA cambia de índice
              en el árbol, así la grabación no se pierde al expandir la barra.
            */}
            <View style={[styles.inputContainer, { paddingBottom: composerBottomPad }]}>
                <View style={[styles.attachSlot, voiceRecording && styles.slotCollapsed]}>
                    {!voiceRecording ? (
                        <TouchableOpacity
                            style={styles.attachButton}
                            onPress={handlePickAttachment}
                            accessibilityLabel="Adjuntar archivo"
                            hitSlop={8}
                        >
                            <Paperclip size={20} color={COLORS.text.secondary} strokeWidth={2} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                <View style={[styles.composerMainSlot, voiceRecording && styles.slotCollapsed]}>
                    {!voiceRecording ? (
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
                                {...(Platform.OS === 'web' ? { rows: 1 } : {})}
                                onSubmitEditing={Platform.OS !== 'web' ? () => sendMessage() : undefined}
                                onKeyPress={
                                    Platform.OS === 'web'
                                        ? (e) => {
                                              if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                                                  e.preventDefault?.();
                                                  if (canSend) sendMessage();
                                              }
                                          }
                                        : undefined
                                }
                            />
                            {canSend ? (
                                <View style={styles.trailingAction}>
                                    <TouchableOpacity
                                        style={styles.sendButton}
                                        onPress={() => sendMessage()}
                                        disabled={sending}
                                        accessibilityLabel="Enviar mensaje"
                                    >
                                        {sending ? (
                                            <ActivityIndicator size="small" color={COLORS.text.onPrimary} />
                                        ) : (
                                            <ArrowUp
                                                size={16}
                                                color={COLORS.text.onPrimary}
                                                strokeWidth={2.5}
                                            />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </View>
                    ) : null}
                </View>

                <View
                    style={[
                        voiceRecording ? styles.recordingSlot : styles.trailingAction,
                        canSend && !voiceRecording ? styles.slotCollapsed : null,
                    ]}
                >
                    <AudioRecorderBar
                        onRecorded={handleAudioRecorded}
                        onRecordingChange={setVoiceRecording}
                        disabled={sending || (canSend && !voiceRecording)}
                        variant="inline"
                    />
                </View>
            </View>
        </>
    );

    const listPaddingTopForComposer =
        composerBlockHeight + (attachments.length > 0 ? 72 : 0);

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
                        data={listItems}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.key}
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
                visible={attachMenuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setAttachMenuVisible(false)}
            >
                <View style={styles.attachSheetOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => setAttachMenuVisible(false)}
                    />
                    <View style={styles.attachSheet}>
                        <Text style={styles.attachSheetTitle}>Adjuntar</Text>
                        <TouchableOpacity
                            style={styles.attachSheetRow}
                            onPress={() => runAttachOption('gallery')}
                        >
                            <View style={styles.attachSheetIcon}>
                                <ImageIcon size={20} color={COLORS.text.primary} />
                            </View>
                            <Text style={styles.attachSheetLabel}>Galería (fotos y videos)</Text>
                        </TouchableOpacity>
                        {Platform.OS !== 'web' ? (
                            <TouchableOpacity
                                style={styles.attachSheetRow}
                                onPress={() => runAttachOption('camera')}
                            >
                                <View style={styles.attachSheetIcon}>
                                    <Camera size={20} color={COLORS.text.primary} />
                                </View>
                                <Text style={styles.attachSheetLabel}>Cámara</Text>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            style={styles.attachSheetRow}
                            onPress={() => runAttachOption('document')}
                        >
                            <View style={styles.attachSheetIcon}>
                                <FileText size={20} color={COLORS.text.primary} />
                            </View>
                            <Text style={styles.attachSheetLabel}>Documento</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.attachSheetCancel}
                            onPress={() => setAttachMenuVisible(false)}
                        >
                            <Text style={styles.attachSheetCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.border.light,
        zIndex: 10,
        paddingBottom: SPACING.xs,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        minHeight: 52,
        gap: SPACING.xs,
    },
    backButton: {
        marginRight: 0,
        flexShrink: 0,
    },
    headerIdentity: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 0,
        gap: SPACING.sm,
    },
    headerTextCol: {
        flex: 1,
        minWidth: 0,
    },
    detailsPill: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 8,
        borderRadius: BORDERS.radius.pill,
        backgroundColor: COLORS.neutral.gray[100],
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailsPillPlaceholder: {
        width: 72,
        height: 32,
    },
    detailsPillText: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.primary,
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.neutral.gray[200],
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.border.light,
        flexShrink: 0,
    },
    headerName: {
        ...TYPOGRAPHY.styles.bodyBold,
        fontSize: 15,
        lineHeight: 20,
        color: COLORS.text.primary,
    },
    headerContext: {
        ...TYPOGRAPHY.styles.small,
        color: COLORS.text.secondary,
        marginTop: 1,
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
        borderBottomRightRadius: 4,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.primary[600],
        overflow: 'hidden',
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
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.xs,
        backgroundColor: COLORS.background.paper,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.border.light,
        gap: SPACING.xs,
    },
    attachButton: {
        width: 36,
        height: 36,
        borderRadius: BORDERS.radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    attachSlot: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    composerMainSlot: {
        flex: 1,
        minWidth: 0,
    },
    slotCollapsed: {
        width: 0,
        height: 0,
        minHeight: 0,
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        opacity: 0,
        flex: 0,
        pointerEvents: 'none',
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.neutral.gray[50],
        borderRadius: BORDERS.radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.border.light,
        paddingLeft: SPACING.sm + 2,
        paddingRight: 4,
        minHeight: 44,
        maxHeight: 120,
    },
    input: {
        flex: 1,
        maxHeight: 100,
        paddingTop: 10,
        paddingBottom: 10,
        paddingRight: SPACING.xs,
        margin: 0,
        fontSize: 15,
        lineHeight: 20,
        color: COLORS.text.primary,
        ...(Platform.OS === 'web'
            ? {
                  outlineStyle: 'none',
                  minHeight: 20,
                  height: 'auto',
                  resize: 'none',
              }
            : null),
    },
    trailingAction: {
        width: 32,
        height: 32,
        marginVertical: 6,
        marginRight: 2,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    sendButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.neutral.gray[800],
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonActive: {
        backgroundColor: COLORS.neutral.gray[800],
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.neutral.gray[200],
    },
    recordingSlot: {
        flex: 1,
        minHeight: 44,
        justifyContent: 'center',
    },
    recordingActionSlotFull: {
        flex: 1,
        minHeight: 44,
    },
    actionSlot: {
        width: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    attachSheetOverlay: {
        flex: 1,
        backgroundColor: withOpacity(COLORS.base.inkBlack, 0.4),
        justifyContent: 'flex-end',
        padding: SPACING.md,
        ...(Platform.OS === 'web' ? { cursor: 'default' } : null),
    },
    attachSheet: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.xl,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xs,
        paddingHorizontal: SPACING.xs,
    },
    attachSheetTitle: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        marginBottom: SPACING.xs,
        marginTop: SPACING.xxs,
    },
    attachSheetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.sm,
        borderRadius: BORDERS.radius.md,
        gap: SPACING.sm,
    },
    attachSheetIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.neutral.gray[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    attachSheetLabel: {
        ...TYPOGRAPHY.styles.body,
        color: COLORS.text.primary,
        flex: 1,
    },
    attachSheetCancel: {
        marginTop: SPACING.xxs,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.border.light,
    },
    attachSheetCancelText: {
        ...TYPOGRAPHY.styles.bodyBold,
        color: COLORS.text.secondary,
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
