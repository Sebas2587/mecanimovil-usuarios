import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as locationService from '../services/location';

export const useMainAddress = (userId) => {
    return useQuery({
        queryKey: ['mainAddress', userId],
        queryFn: locationService.getMainAddress,
        enabled: !!userId,
        staleTime: 1000 * 60 * 10, // 10 min
    });
};
