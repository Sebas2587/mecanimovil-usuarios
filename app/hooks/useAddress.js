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

export const useUserAddresses = () => {
    return useQuery({
        queryKey: ['userAddresses'],
        queryFn: locationService.getUserAddresses,
        staleTime: 1000 * 60 * 5, // 5 min
    });
};

export const useSaveAddress = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: locationService.saveAddress,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userAddresses'] });
            queryClient.invalidateQueries({ queryKey: ['mainAddress'] });
        },
    });
};

export const useDeleteAddress = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: locationService.deleteAddress,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userAddresses'] });
            queryClient.invalidateQueries({ queryKey: ['mainAddress'] });
        },
    });
};

export const useSetMainAddress = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: locationService.setMainAddress,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userAddresses'] });
            queryClient.invalidateQueries({ queryKey: ['mainAddress'] });
        }
    });
};
