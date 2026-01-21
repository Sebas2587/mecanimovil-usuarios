import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as notificationService from '../services/notifications';

export const useNotifications = () => {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: notificationService.getNotifications,
        staleTime: 1000 * 60, // 1 min
    });
};

export const useUnreadCount = () => {
    return useQuery({
        queryKey: ['unreadCount'],
        queryFn: notificationService.getUnreadCount,
        refetchInterval: 30000, // Refetch every 30s to keep badge updated
    });
};

export const useMarkAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationService.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
        },
    });
};

export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationService.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
        },
    });
};

export const useDeleteNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationService.deleteNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
        },
    });
};
