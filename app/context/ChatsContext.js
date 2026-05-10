import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import WebSocketService from '../services/websocketService';
import { useAuth } from './AuthContext';
import { useChatsList, CONVERSATIONS_KEYS, CHATS_KEYS } from '../hooks/useChats';

const ChatsContext = createContext();

/** Tras un ráfaga de WS, una sola reconciliación HTTP (no una petición por mensaje). */
const CHAT_SERVER_SYNC_DEBOUNCE_MS = 4500;

export const ChatsProvider = ({ children }) => {
  const [totalMensajesNoLeidos, setTotalMensajesNoLeidos] = useState(0);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const chatSyncTimerRef = useRef(null);

  // Use the same hook as the screen for consistency and caching
  const { data: chatsData, refetch: refetchChats } = useChatsList();


  // Sync total count from query data
  useEffect(() => {
    if (chatsData) {
      const total = chatsData.reduce((sum, chat) => sum + chat.mensajes_no_leidos, 0);
      setTotalMensajesNoLeidos(total);
      console.log(`📊 [CHATS CONTEXT] Total mensajes no leidos sincronizado: ${total}`);
    }
  }, [chatsData]);

  // Cargar el total inicial (Legacy/Fallback)
  const cargarTotalNoLeidos = async () => {
    console.log('📊 [CHATS CONTEXT] cargarTotalNoLeidos (Legacy call - handled by TanStack Query)');
  };

  const flushChatServerSync = useCallback(() => {
    chatSyncTimerRef.current = null;
    queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEYS.all, refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: CHATS_KEYS.all, refetchType: 'active' });
  }, [queryClient]);

  const scheduleChatServerSync = useCallback(() => {
    if (chatSyncTimerRef.current) {
      clearTimeout(chatSyncTimerRef.current);
    }
    chatSyncTimerRef.current = setTimeout(flushChatServerSync, CHAT_SERVER_SYNC_DEBOUNCE_MS);
  }, [flushChatServerSync]);

  useEffect(
    () => () => {
      if (chatSyncTimerRef.current) {
        clearTimeout(chatSyncTimerRef.current);
        chatSyncTimerRef.current = null;
      }
    },
    [],
  );

  // Suscribirse a WebSocket: UI vía caché optimista; reconciliación HTTP acumulada (debounce).
  useEffect(() => {
    if (!user) return;

    const handler = (data) => {
      if (data.type !== 'nuevo_mensaje_chat') return;

      const esProveedor =
        data.es_proveedor === true ||
        data.es_proveedor === 'true' ||
        data.es_proveedor === 1;

      if (esProveedor) {
        const bumpTab = (tab) => {
          const key = CONVERSATIONS_KEYS.list(tab);
          queryClient.setQueryData(key, (old) => {
            if (!Array.isArray(old)) return old;
            const cid =
              data.conversation_id != null && String(data.conversation_id).trim() !== ''
                ? String(data.conversation_id)
                : null;
            const sid = data.solicitud_id != null ? String(data.solicitud_id) : null;
            const text = data.mensaje ?? data.content ?? data.message ?? '';
            const ts = data.timestamp || new Date().toISOString();
            let touched = false;
            const next = old.map((c) => {
              const byConv = cid && String(c.id) === cid;
              const bySol =
                sid && c.context_id != null && String(c.context_id) === sid;
              if (byConv || bySol) {
                touched = true;
                return {
                  ...c,
                  unread_count: (Number(c.unread_count) || 0) + 1,
                  last_message: {
                    ...(c.last_message || {}),
                    content: text || c.last_message?.content,
                    timestamp: ts,
                    sender_id: data.sender_id ?? c.last_message?.sender_id,
                  },
                  updated_at: ts,
                };
              }
              return c;
            });
            return touched ? next : old;
          });
        };
        bumpTab('service');
        bumpTab('marketplace');
      }

      // No invalidar detalle de solicitud ni lista de solicitudes por cada mensaje (muy pesado).
      // Una sola pasada al servidor tras silencio breve; las pantallas siguen mostrando datos optimistas.
      scheduleChatServerSync();
    };

    WebSocketService.onMessage('nuevo_mensaje_chat', handler);

    return () => {
      WebSocketService.offMessage('nuevo_mensaje_chat', handler);
    };
  }, [user, queryClient, scheduleChatServerSync]);

  // Función para decrementar el contador (cuando se leen mensajes)
  const decrementarNoLeidos = (cantidad) => {
    setTotalMensajesNoLeidos(prev => Math.max(0, prev - cantidad));
    console.log(`📊 [CHATS CONTEXT] Total decrementado en ${cantidad}`);
  };

  // Función para resetear el contador
  const resetearNoLeidos = () => {
    setTotalMensajesNoLeidos(0);
    console.log('📊 [CHATS CONTEXT] Total reseteado');
  };

  // Función para actualizar manualmente el total
  const actualizarTotal = (nuevoTotal) => {
    setTotalMensajesNoLeidos(nuevoTotal);
    console.log(`📊 [CHATS CONTEXT] Total actualizado a: ${nuevoTotal}`);
  };

  return (
    <ChatsContext.Provider
      value={{
        totalMensajesNoLeidos,
        cargarTotalNoLeidos,
        decrementarNoLeidos,
        resetearNoLeidos,
        actualizarTotal,
        refetchChats,
      }}
    >
      {children}
    </ChatsContext.Provider>
  );
};

export const useChats = () => {
  const context = useContext(ChatsContext);
  if (!context) {
    throw new Error('useChats debe usarse dentro de ChatsProvider');
  }
  return context;
};

