import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as userService from '../services/user';
import logger from '../utils/logger';

export const useUserProfile = (userId) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['userProfile', userId],
        queryFn: () => userService.getUserProfile(userId),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 60 * 24, // 24 horas
        retry: 2,
        onError: (error) => {
            logger.error('Error fetching user profile:', error);
        }
    });

    const updateProfileMutation = useMutation({
        mutationFn: (data) => userService.updateUserProfile(data),
        onSuccess: (updatedUser) => {
            // Invalidar y refetch de la query del perfil
            queryClient.invalidateQueries(['userProfile', userId]);

            // Actualizar datos en cache inmediatamente (Optimistic update support or just direct set)
            queryClient.setQueryData(['userProfile', userId], (oldData) => ({
                ...oldData,
                ...updatedUser
            }));

            logger.debug('✅ Perfil actualizado y cache invalidado');
        },
        onError: (error) => {
            logger.error('Error updating user profile:', error);
        }
    });

    const updateProfilePictureMutation = useMutation({
        mutationFn: (formData) => userService.updateProfilePicture(formData),
        onSuccess: () => {
            // La actualización de foto suele devolver solo status, así que invalidamos para obtener la nueva URL
            queryClient.invalidateQueries(['userProfile', userId]);
            logger.debug('✅ Foto de perfil actualizada y cache invalidado');
        },
        onError: (error) => {
            logger.error('Error updating profile picture:', error);
        }
    });

    return {
        ...query,
        updateProfile: updateProfileMutation.mutateAsync,
        isUpdating: updateProfileMutation.isPending,
        updateProfilePicture: updateProfilePictureMutation.mutateAsync,
        isUpdatingPicture: updateProfilePictureMutation.isPending
    };
};
