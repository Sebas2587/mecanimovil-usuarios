import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar, Keyboard, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import chatService from '../../services/chatService';
import websocketService from '../../services/websocketService'; // Global WS for broadcasts
import AsyncStorage from '@react-native-async-storage/async-storage';
import serverConfig from '../../config/serverConfig';
import { ROUTES } from '../../utils/constants';
import { useChats } from '../../context/ChatsContext';

const GLASS_BG = Platform.select({
    ios: 'rgba(255,255,255,0.06)',
    android: 'rgba(255,255,255,0.10)',
    default: 'rgba(255,255,255,0.08)',
});

const ChatDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const styles = getStyles();

    const { refetchChats } = useChats();
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
        loadData();

        // Connect to conversation-specific WS (for User→Provider messages)
        chatService.connect(conversationId, (newMessage) => {
            console.log('📨 [USER APP] Message from conversation WS:', newMessage);
            setMessages((prev) => [newMessage, ...prev]);
        });

        // 🔔 ALSO subscribe to global WebSocket for Provider→User broadcasts
        console.log('🔗 [USER APP] Subscribing to global WebSocket for Provider messages...');
        const handleGlobalMessage = (data) => {
            console.log('📨 [USER APP] Global WS message received:', JSON.stringify(data, null, 2));

            // Only process chat messages
            if (data.type === 'nuevo_mensaje_chat') {
                console.log('💬 [USER APP] New chat message broadcast:', {
                    mensaje_id: data.mensaje_id,
                    oferta_id: data.oferta_id,
                    solicitud_id: data.solicitud_id,
                    es_proveedor: data.es_proveedor
                });

                // Add message directly to state (like Provider App does)
                setMessages((prevMessages) => {
                    // Check if message already exists
                    const exists = prevMessages.find(m => String(m.id) === String(data.mensaje_id));
                    if (exists) {
                        console.log('💬 [USER APP] Message already exists, ignoring:', data.mensaje_id);
                        return prevMessages;
                    }

                    // Check if we sent this message (optimistic UI)
                    if (sentMessagesRef.current.has(data.mensaje_id)) {
                        console.log('💬 [USER APP] Message sent by us (optimistic), ignoring WS broadcast:', data.mensaje_id);
                        return prevMessages;
                    }

                    console.log('✅ [USER APP] Adding new message from broadcast');
                    // Create message object
                    const newMessage = {
                        id: data.mensaje_id,
                        content: data.mensaje || data.message || data.content,
                        sender: {
                            id: data.sender_id,
                            username: data.enviado_por
                        },
                        created_at: data.timestamp,
                        is_read: false
                    };

                    // Add to beginning of array (newest first)
                    return [newMessage, ...prevMessages];
                });
            }
        };

        // Register handler for ALL messages from global WS
        websocketService.onMessage('nuevo_mensaje_chat', handleGlobalMessage);

        // Ensure global WS is connected
        if (!websocketService.getConnectionStatus()) {
            console.log('🔗 [USER APP] Global WS not connected, connecting now...');
            websocketService.connect();
        }

        return () => {
            chatService.disconnect();
            websocketService.offMessage('nuevo_mensaje_chat', handleGlobalMessage);
        };
    }, [conversationId]);

    const loadData = async () => {
        try {
            // Load specific conversation details
            const conv = await chatService.getConversation(conversationId);

            setConversation(conv);

            // Load messages
            const msgsData = await chatService.getMessages(conversationId);
            setMessages(msgsData.results || msgsData);

            // Mark as read
            await chatService.markRead(conversationId);

            // Sync global unread count
            if (refetchChats) {
                console.log('🔄 [CHAT DETAIL] Refreshing global chat list to update unread count...');
                refetchChats();
            }
        } catch (error) {
            console.error('Error loading chat:', error);
        } finally {
            setLoading(false);
        }
    };

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
            setMessages(prev => prev.map(m => m.id === tempMsg.id ? realMsg : m));
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
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
                    </TouchableOpacity>

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
                            // If it's a marketplace vehicle
                            navigation.navigate(ROUTES.MARKETPLACE_VEHICLE_DETAIL, { vehicleId: id });
                        } else {
                            // Fallback for debugging
                            if (__DEV__) {
                                Alert.alert('Debug', `Unknown context type: ${type}, ID: ${id}`);
                            }
                        }
                    }}
                >
                    <View style={styles.contextIcon}>
                        <Ionicons name="car" size={16} color="#6EE7B7" />
                    </View>
                    <Text style={styles.contextText}>{contextText}</Text>
                    <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.45)" />
                </TouchableOpacity>
            </View>
        );
    };

    const renderMessage = ({ item }) => {
        const isMe = item.sender_id === currentUserId;
        const hasAttachment = !!item.attachment;

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
                            {/* Simple logic: if it ends in jpg/png/jpeg it's image, else doc */}
                            {(() => {
                                const isImage = typeof item.attachment === 'string' && (item.attachment.match(/\.(jpeg|jpg|png|gif|webp|bmp)$/i) || item.attachment.startsWith('file://'));

                                let imageUri = item.attachment;
                                if (typeof item.attachment === 'string' && !item.attachment.startsWith('http') && !item.attachment.startsWith('file://')) {
                                    // It's a relative path from backend
                                    const baseUrl = serverConfig.getMediaURL();
                                    if (baseUrl) {
                                        imageUri = `${baseUrl}${item.attachment.startsWith('/') ? '' : '/'}${item.attachment}`;
                                    }
                                }

                                if (isImage) {
                                    return <TouchableOpacity onPress={() => setSelectedImage(imageUri)}>
                                        <Image
                                            source={{ uri: imageUri }}
                                            style={styles.messageImage}
                                            contentFit="cover"
                                            cachePolicy="disk"
                                        />
                                    </TouchableOpacity>

                                } else {
                                    return (
                                        <View style={styles.documentAttachment}>
                                            <Ionicons name="document-text" size={24} color={isMe ? '#FFF' : '#93C5FD'} />
                                            <Text style={[styles.documentText, isMe ? { color: '#FFF' } : { color: '#F9FAFB' }]} numberOfLines={1}>
                                                {typeof item.attachment === 'string' ? item.attachment.split('/').pop() : 'Documento'}
                                            </Text>
                                        </View>
                                    );
                                }
                            })()}
                        </View>
                    )}

                    {!!item.content && (
                        <Text style={[
                            styles.messageText,
                            isMe ? styles.textRight : styles.textLeft,
                            hasAttachment ? { paddingHorizontal: 10, paddingBottom: 6 } : {}
                        ]}>{item.content}</Text>
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

    return (
        <View style={styles.container}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <LinearGradient colors={['#030712', '#0a0f1a', '#030712']} style={StyleSheet.absoluteFill} />
                <View style={styles.blobA} />
                <View style={styles.blobB} />
            </View>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            {renderHeader()}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#6EE7B7" />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => String(item.id)}
                        contentContainerStyle={styles.listContent}
                        inverted
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    />
                )}

                {/* Attachment Preview */}
                {attachment && (
                    <View style={styles.previewContainer}>
                        <View style={styles.previewWrapper}>
                            {attachment.type === 'document' ? (
                                <View style={styles.docPreview}>
                                    <Ionicons name="document-text" size={24} color="rgba(255,255,255,0.55)" />
                                    <Text style={styles.previewName} numberOfLines={1}>{attachment.name}</Text>
                                </View>
                            ) : (
                                <Image source={{ uri: attachment.uri }} style={styles.imagePreview} contentFit="cover" />
                            )}
                            <TouchableOpacity style={styles.removePreviewButton} onPress={() => setAttachment(null)}>
                                <Ionicons name="close-circle" size={24} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <TouchableOpacity style={styles.iconButton} onPress={handlePickAttachment}>
                        <Feather name="paperclip" size={24} color="#93C5FD" />
                    </TouchableOpacity>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Escribe un mensaje..."
                            placeholderTextColor="rgba(255,255,255,0.35)"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.sendButton, (!inputText.trim() && !attachment) && styles.sendButtonDisabled]}
                        onPress={sendMessage}
                        disabled={!inputText.trim() && !attachment} // Disable only if BOTH are empty
                    >
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

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
                        <Ionicons name="close" size={30} color="#FFF" />
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
        backgroundColor: '#030712',
    },
    blobA: {
        position: 'absolute',
        top: 120,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(99,102,241,0.08)',
    },
    blobB: {
        position: 'absolute',
        bottom: 200,
        left: -30,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(16,185,129,0.06)',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    header: {
        backgroundColor: 'rgba(3,7,18,0.92)',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
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
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    headerInfo: {
        flex: 1,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F9FAFB',
        lineHeight: 20,
    },
    headerRole: {
        fontSize: 12,
        color: '#6EE7B7',
        fontWeight: '500',
    },
    contextBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GLASS_BG,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    contextIcon: {
        marginRight: 8,
    },
    contextText: {
        flex: 1,
        fontSize: 12,
        color: '#93C5FD',
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
        backgroundColor: '#007EA7',
        borderBottomRightRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,168,232,0.35)',
    },
    bubbleLeft: {
        backgroundColor: GLASS_BG,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    textRight: {
        color: '#FFF',
    },
    textLeft: {
        color: '#F9FAFB',
    },
    messageTime: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    timeRight: {
        color: 'rgba(255,255,255,0.75)',
    },
    timeLeft: {
        color: 'rgba(255,255,255,0.4)',
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
        backgroundColor: 'rgba(3,7,18,0.96)',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.1)',
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
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
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
        color: '#F9FAFB',
    },
    clipButton: {
        padding: 4,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#007EA7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        marginLeft: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,168,232,0.4)',
    },
    sendButtonDisabled: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderColor: 'rgba(255,255,255,0.08)',
    },
    previewContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        paddingTop: 4,
        backgroundColor: 'rgba(3,7,18,0.96)',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    previewWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GLASS_BG,
        borderRadius: 12,
        padding: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
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
        color: 'rgba(255,255,255,0.65)',
        maxWidth: 150,
    },
    removePreviewButton: {
        padding: 2,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButton: {
        position: 'absolute',
        right: 20,
        zIndex: 20,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    fullImage: {
        width: '100%',
        height: '80%',
    },
});

export default ChatDetailScreen;
