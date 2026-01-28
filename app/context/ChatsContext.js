import React, { createContext, useState, useContext, useEffect } from 'react';
import WebSocketService from '../services/websocketService';
import ofertasService from '../services/ofertasService';
import { useAuth } from './AuthContext';
import { useChatsList } from '../hooks/useChats';

const ChatsContext = createContext();

export const ChatsProvider = ({ children }) => {
  const [totalMensajesNoLeidos, setTotalMensajesNoLeidos] = useState(0);
  const { user } = useAuth();

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


  // Suscribirse a WebSocket para actualizaciones en tiempo real
  useEffect(() => {
    if (!user) return;

    const handler = (data) => {
      console.log('📨 [CHATS CONTEXT] Nuevo mensaje recibido:', data);

      // Invalidad cache de chats para que se actualice el total y la lista
      if (data.type === 'nuevo_mensaje_chat' && data.es_proveedor) {
        console.log('📊 [CHATS CONTEXT] Invalidando cache por nuevo mensaje');
        refetchChats();
      }
    };


    WebSocketService.onMessage('nuevo_mensaje_chat', handler);

    return () => {
      WebSocketService.offMessage('nuevo_mensaje_chat', handler);
    };
  }, [user, totalMensajesNoLeidos]);

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

