import { get, post, patch } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import serverConfig from '../config/serverConfig';

class ChatService {
    constructor() {
        this.socket = null;
        this.messageCallback = null;
        this.reconnectInterval = 3000;
        this.activeConversationId = null;
        this.isTypingTimeout = null;
    }

    async getConversations(type = 'service') {
        const query = type ? `?type=${type}` : '';
        return await get(`/chat/conversations/${query}`);
    }

    async getConversation(id) {
        return await get(`/chat/conversations/${id}/`);
    }

    async getMessages(conversationId) {
        return await get(`/chat/conversations/${conversationId}/messages/`);
    }

    async getOrCreateConversation({ ofertaId, solicitudId, type = 'service' }) {
        // Get or create conversation for an offer
        // Backend will create if doesn't exist, return existing if it does
        const response = await post('/chat/conversations/get_or_create/', {
            oferta_id: ofertaId,
            solicitud_id: solicitudId,
            type
        });
        return response.id; // Return conversationId
    }

    async sendMessageHTTP(conversationId, content, isMultipart = false) {
        // HTTP fallback for sending messages (works without WebSocket)
        // content can be JSON object or FormData
        return await post(`/chat/conversations/${conversationId}/send_message/`, content, isMultipart);
    }


    async markRead(conversationId) {
        return await post(`/chat/conversations/${conversationId}/mark_read/`);
    }

    async connect(conversationId, onMessageCallback) {
        if (this.socket && this.activeConversationId === conversationId) {
            console.log('Already connected to this conversation');
            this.messageCallback = onMessageCallback; // Update callback
            return;
        }

        this.disconnect(); // Close existing

        this.activeConversationId = conversationId;
        this.messageCallback = onMessageCallback;

        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                console.error('No token found for chat connection');
                return;
            }

            // Dynamically get Base URL
            let baseURL = serverConfig.getBaseURL();
            if (!baseURL) {
                // Determine if we need to init or if it's too early
                await serverConfig.initialize();
                baseURL = serverConfig.getBaseURL();
            }

            if (!baseURL) {
                console.error('Could not determine Base URL for WS');
                return;
            }

            const wsBase = baseURL.replace('http', 'ws');
            const wsUrl = `${wsBase}/chat/${conversationId}/?token=${token}`;

            console.log('Connecting to WS:', wsUrl);

            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('WebSocket Connected');
            };

            this.socket.onmessage = (e) => {
                const data = JSON.parse(e.data);
                console.log('WS Message:', data);
                if (this.messageCallback) {
                    this.messageCallback(data);
                }
            };

            this.socket.onerror = (e) => {
                console.log('WebSocket Error:', e.message);
            };

            this.socket.onclose = (e) => {
                console.log('WebSocket Closed:', e.code, e.reason);
                if (this.activeConversationId === conversationId) {
                    // Try to reconnect if expected to be connected
                    setTimeout(() => {
                        console.log('Attempting Reconnect...');
                        this.connect(conversationId, onMessageCallback);
                    }, this.reconnectInterval);
                }
            };

        } catch (error) {
            console.error('Connection setup error:', error);
        }
    }

    disconnect() {
        if (this.socket) {
            this.activeConversationId = null; // Prevent reconnect
            this.socket.close();
            this.socket = null;
            this.messageCallback = null;
        }
    }

    sendMessage(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ message }));
        } else {
            console.error('WebSocket is not open. State:', this.socket ? this.socket.readyState : 'null');
            // Could implement queueing here
        }
    }
}

export const chatService = new ChatService();
export default chatService;
