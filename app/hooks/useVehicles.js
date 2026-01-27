import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import * as vehicleService from '../services/vehicle';
import VehicleHealthService from '../services/vehicleHealthService';
import logger from '../utils/logger';

export const useVehicles = (userId) => {
    return useQuery({
        queryKey: ['vehicles', userId],
        queryFn: vehicleService.getUserVehicles,
        staleTime: 1000 * 60 * 5, // 5 min
        gcTime: 1000 * 60 * 60 * 24, // 24h
        select: (data) => data || [],
        enabled: !!userId, // Solo ejecutar si hay userId
    });
};

export const useVehicleHealth = (vehicleId) => {
    return useQuery({
        queryKey: ['vehicleHealth', vehicleId],
        queryFn: () => VehicleHealthService.getVehicleHealth(vehicleId),
        enabled: !!vehicleId,
        staleTime: 1000 * 60 * 5,
    });
};

export const useVehiclesHealth = (vehicles) => {
    return useQueries({
        queries: (vehicles || []).map((vehicle) => ({
            queryKey: ['vehicleHealth', vehicle.id],
            queryFn: () => VehicleHealthService.getVehicleHealth(vehicle.id),
            staleTime: 1000 * 60 * 2, // 2 min
        })),
        combine: (results) => {
            return {
                isLoading: results.some((r) => r.isLoading),
                data: results.map((r, index) => ({
                    vehicleId: vehicles[index].id,
                    health: r.data,
                    isLoading: r.isLoading,
                    error: r.error
                })),
            };
        },
    });
};

export const useCreateVehicle = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: vehicleService.createVehicle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            // Invalidate categories as they depend on vehicle brands
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            logger.info('Vehicle created, cache invalidated');
        },
        onError: (error) => {
            logger.error('Error creating vehicle:', error);
        }
    });
};

export const useUpdateVehicle = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => vehicleService.updateVehicle(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            queryClient.invalidateQueries({ queryKey: ['vehicleHealth', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            logger.info('Vehicle updated, cache invalidated');
        },
        onError: (error) => {
            logger.error('Error updating vehicle:', error);
        }
    });
};

export const useDeleteVehicle = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: vehicleService.deleteVehicle,
        onMutate: async (vehicleId) => {
            // Cancelar queries en curso para evitar sobrescribir nuestro update optimista
            await queryClient.cancelQueries({ queryKey: ['vehicles'] });

            // Snapshot del valor anterior
            const previousVehicles = queryClient.getQueryData(['vehicles']);

            // Actualizar optimísticamente el cache
            if (previousVehicles) {
                queryClient.setQueryData(['vehicles'], (old) => {
                    const oldList = Array.isArray(old) ? old : [];
                    return oldList.filter(v => v.id !== vehicleId);
                });
            }

            // Retornar contexto para rollback en caso de error
            return { previousVehicles };
        },
        onError: (err, newVehicleId, context) => {
            logger.error('Error deleting vehicle:', err);
            // Rollback al valor anterior si falla
            if (context?.previousVehicles) {
                queryClient.setQueryData(['vehicles'], context.previousVehicles);
            }
        },
        onSuccess: () => {
            // Ya actualizamos optimísticamente, pero invalidamos para asegurar consistencia final
            logger.info('Vehicle deleted (optimistic update applied), invalidating cache');
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });
};

export const useCarBrands = () => {
    return useQuery({
        queryKey: ['carBrands'],
        queryFn: vehicleService.getCarBrands,
        staleTime: 1000 * 60 * 60 * 24, // 24h
        select: (data) => data || [],
    });
};

export const useCarModels = (brandId) => {
    return useQuery({
        queryKey: ['carModels', brandId],
        queryFn: () => vehicleService.getCarModels(brandId),
        enabled: !!brandId,
        staleTime: 1000 * 60 * 60 * 1, // 1h
        select: (data) => data || [],
    });
};
