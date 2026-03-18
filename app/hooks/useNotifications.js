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

const setLeida = (old, id, valor) => {
    if (!old) return old;
    const marcar = (n) => (String(n?.id) === String(id) ? { ...n, leida: valor } : n);
    if (Array.isArray(old)) return old.map(marcar);
    if (Array.isArray(old?.results)) return { ...old, results: old.results.map(marcar) };
    return old;
};

const setTodasLeidas = (old) => {
    if (!old) return old;
    const marcar = (n) => ({ ...n, leida: true });
    if (Array.isArray(old)) return old.map(marcar);
    if (Array.isArray(old?.results)) return { ...old, results: old.results.map(marcar) };
    return old;
};

export const useMarkAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationService.markAsRead,
        onMutate: async (notificationId) => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });
            const previous = queryClient.getQueryData(['notifications']);
            queryClient.setQueryData(['notifications'], (old) => setLeida(old, notificationId, true));
            queryClient.setQueryData(['unreadCount'], (old) => {
                if (!old) return old;
                if (typeof old === 'number') return Math.max(0, old - 1);
                if (typeof old?.count === 'number') return { ...old, count: Math.max(0, old.count - 1) };
                return old;
            });
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous !== undefined) {
                queryClient.setQueryData(['notifications'], context.previous);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
        },
    });
};

export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationService.markAllAsRead,
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });
            const previous = queryClient.getQueryData(['notifications']);
            queryClient.setQueryData(['notifications'], (old) => setTodasLeidas(old));
            queryClient.setQueryData(['unreadCount'], (old) => {
                if (!old) return old;
                if (typeof old === 'number') return 0;
                if (typeof old?.count === 'number') return { ...old, count: 0 };
                return old;
            });
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous !== undefined) {
                queryClient.setQueryData(['notifications'], context.previous);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
        },
    });
};

export const useDeleteNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationService.deleteNotification,
        onMutate: async (notificationId) => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });
            const previous = queryClient.getQueryData(['notifications']);

            // Soportar respuesta paginada ({results: []}) o lista directa ([])
            queryClient.setQueryData(['notifications'], (old) => {
                if (!old) return old;
                if (Array.isArray(old)) {
                    return old.filter((n) => String(n?.id) !== String(notificationId));
                }
                if (old?.results && Array.isArray(old.results)) {
                    return {
                        ...old,
                        results: old.results.filter((n) => String(n?.id) !== String(notificationId)),
                    };
                }
                return old;
            });

            // Best-effort: ajustar badge si la notificación eliminada estaba no leída
            const deletedWasUnread = (() => {
                if (!previous) return null;
                const list = Array.isArray(previous)
                    ? previous
                    : (Array.isArray(previous?.results) ? previous.results : []);
                const found = list.find((n) => String(n?.id) === String(notificationId));
                if (!found) return null;
                return !found.leida;
            })();

            if (deletedWasUnread) {
                queryClient.setQueryData(['unreadCount'], (old) => {
                    if (!old) return old;
                    // endpoint suele devolver {count: number} o number
                    if (typeof old === 'number') return Math.max(0, old - 1);
                    if (typeof old?.count === 'number') return { ...old, count: Math.max(0, old.count - 1) };
                    return old;
                });
            }

            return { previous };
        },
        onError: (_err, _notificationId, context) => {
            if (context?.previous !== undefined) {
                queryClient.setQueryData(['notifications'], context.previous);
            }
        },
        onSuccess: () => {
            // Invalidamos ['notifications'] para sincronizar con el backend.
            // El backend ahora hace soft-delete (eliminada=True) y el GET filtra eliminada=False,
            // por lo que un refetch siempre devolverá la lista correcta sin la notificación eliminada.
            // Esto garantiza consistencia tanto en pull-to-refresh como en re-mount de la pantalla.
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
        },
    });
};
