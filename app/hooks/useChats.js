import { Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ofertasService from '../services/ofertasService';
import chatService from '../services/chatService';
import { useAuth } from '../context/AuthContext';

const CACHE = {
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: Platform.OS === 'web',
    placeholderData: (previousData) => previousData,
};

export const CHATS_KEYS = {
    all: ['chats'],
    list: () => [...CHATS_KEYS.all, 'list'],
};

export const CONVERSATIONS_KEYS = {
    all: ['conversations'],
    list: (tab) => [...CONVERSATIONS_KEYS.all, tab],
};

export const useChatsList = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: CHATS_KEYS.list(),
        queryFn: () => ofertasService.obtenerListaChats(),
        enabled: !!user,
        ...CACHE,
    });
};

export const useConversationsList = (activeTab) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: CONVERSATIONS_KEYS.list(activeTab),
        queryFn: async () => {
            const data = await chatService.getConversations(activeTab);
            if (!data) return [];
            if (Array.isArray(data)) return data;
            if (Array.isArray(data.results)) return data.results;
            return [];
        },
        enabled: !!user,
        ...CACHE,
    });
};
