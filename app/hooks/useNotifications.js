import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as notificationService from '../services/notifications';

const EMPTY_LIST = [];

// ─── Helpers para actualizar el cache sin reemplazar toda la lista ───────────

const removeFromList = (old, id) => {
    if (!old) return old;
    const filtrar = (arr) => arr.filter((n) => String(n?.id) !== String(id));
    if (Array.isArray(old)) return filtrar(old);
    if (Array.isArray(old?.results)) return { ...old, results: filtrar(old.results) };
    return old;
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

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const useNotifications = () => {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: notificationService.getNotifications,
        // Nunca se considera "stale" automáticamente: el único refetch permitido
        // es el pull-to-refresh explícito del usuario (refetch()). Esto evita que
        // cualquier refetch automático sobreescriba el estado optimista.
        staleTime: Infinity,
        gcTime: 1000 * 60 * 10,         // Cache vive 10 min sin suscriptores
        refetchOnMount: false,           // No refetch al montar/re-montar la pantalla
        refetchOnWindowFocus: false,     // No refetch al volver al foco de la app
        refetchOnReconnect: false,       // No refetch al reconectar red
    });
};

export const useUnreadCount = () => {
    return useQuery({
        queryKey: ['unreadCount'],
        queryFn: notificationService.getUnreadCount,
        refetchInterval: 30000,
    });
};

// ─── Mutations ───────────────────────────────────────────────────────────────

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

export const useDeleteAllNotifications = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationService.deleteAllNotifications,
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });
            const previous = queryClient.getQueryData(['notifications']);
            // Vaciar la lista inmediatamente (optimistic)
            queryClient.setQueryData(['notifications'], (old) => {
                if (!old) return old;
                if (Array.isArray(old)) return EMPTY_LIST;
                if (Array.isArray(old?.results)) return { ...old, results: EMPTY_LIST, count: 0 };
                return old;
            });
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
            // Cancelar cualquier refetch en vuelo para que no sobreescriba el estado optimista
            await queryClient.cancelQueries({ queryKey: ['notifications'] });
            const previous = queryClient.getQueryData(['notifications']);

            // Eliminar del cache inmediatamente (actualización optimista)
            queryClient.setQueryData(['notifications'], (old) => removeFromList(old, notificationId));

            // Ajustar badge si la notificación eliminada estaba sin leer
            const list = Array.isArray(previous)
                ? previous
                : (Array.isArray(previous?.results) ? previous.results : []);
            const wasUnread = list.find((n) => String(n?.id) === String(notificationId) && !n?.leida);

            if (wasUnread) {
                queryClient.setQueryData(['unreadCount'], (old) => {
                    if (!old) return old;
                    if (typeof old === 'number') return Math.max(0, old - 1);
                    if (typeof old?.count === 'number') return { ...old, count: Math.max(0, old.count - 1) };
                    return old;
                });
            }

            return { previous };
        },
        onError: (_err, _notificationId, context) => {
            // Si falla el DELETE en el backend, restaurar el estado anterior
            if (context?.previous !== undefined) {
                queryClient.setQueryData(['notifications'], context.previous);
            }
        },
        onSuccess: () => {
            // NO invalidamos ['notifications']: el cache optimista ya es correcto.
            // Un refetch inmediato puede traer de vuelta la notificación si hay
            // cualquier latencia entre el commit del DELETE y la siguiente lectura.
            // El backend filtra eliminada=False, así que el siguiente pull-to-refresh
            // explícito del usuario devolverá la lista correcta.
            queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
        },
    });
};
