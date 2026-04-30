import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as userService from '../services/user';

const CACHE = {
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: Platform.OS === 'web',
    placeholderData: (previousData) => previousData,
};

export const useServicesHistory = (userId) => {
    return useQuery({
        queryKey: ['servicesHistory', userId],
        queryFn: userService.getServicesHistory,
        enabled: !!userId,
        select: (data) => {
            if (Array.isArray(data?.results)) return data.results;
            if (Array.isArray(data)) return data;
            return [];
        },
        ...CACHE,
    });
};
