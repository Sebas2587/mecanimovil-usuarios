import { useQuery } from '@tanstack/react-query';
import * as userService from '../services/user';

export const useServicesHistory = (userId) => {
    return useQuery({
        queryKey: ['servicesHistory', userId],
        queryFn: userService.getServicesHistory,
        enabled: !!userId,
        staleTime: 1000 * 60 * 5,
        select: (data) => {
            // Normalize to array if needed, similar to loadVehiclesData logic
            if (Array.isArray(data?.results)) return data.results;
            if (Array.isArray(data)) return data;
            return [];
        }
    });
};
