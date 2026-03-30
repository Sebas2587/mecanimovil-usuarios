import { useQuery, useQueryClient } from '@tanstack/react-query';
import ofertasService from '../services/ofertasService';
import { useAuth } from '../context/AuthContext';

export const CHATS_KEYS = {
    all: ['chats'],
    list: () => [...CHATS_KEYS.all, 'list'],
};

/**
 * Hook to fetch the list of chats/conversations
 */
export const useChatsList = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: CHATS_KEYS.list(),
        queryFn: () => ofertasService.obtenerListaChats(),
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
    });
};
