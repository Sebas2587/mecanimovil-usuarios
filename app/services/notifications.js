import { get, post, delete_ } from './api';

export const getNotifications = async () => {
    return await get('/usuarios/notificaciones/');
};

export const getUnreadCount = async () => {
    return await get('/usuarios/notificaciones/no_leidas_count/');
};

export const markAsRead = async (notificationId) => {
    return await post(`/usuarios/notificaciones/${notificationId}/marcar_leida/`);
};

export const markAllAsRead = async () => {
    return await post('/usuarios/notificaciones/marcar_todas_leidas/');
};

export const deleteNotification = async (notificationId) => {
    return await delete_(`/usuarios/notificaciones/${notificationId}/`);
};
