import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useDeleteNotification } from '../../hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import { ROUTES, SPACING, COLORS, FONT_SIZES, BORDERS } from '../../utils/constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function NotificationCenterScreen({ navigation }) {
    const { data, isLoading, refetch } = useNotifications();
    const markAsRead = useMarkAsRead();
    const markAllAsRead = useMarkAllAsRead();
    const deleteNotification = useDeleteNotification();
    const theme = useTheme();

    // Extraer notificaciones de la respuesta (paginada o lista directa)
    const notifications = data?.results || (Array.isArray(data) ? data : []) || [];

    const handleNotificationPress = (notification) => {
        // Marcar como leída si no lo está
        if (!notification.leida) {
            markAsRead.mutate(notification.id);
        }

        // Navegar según el tipo
        try {
            if (notification.tipo === 'health_alert' && notification.data?.vehicle_id) {
                navigation.navigate(ROUTES.VEHICLE_HEALTH, { vehicleId: parseInt(notification.data.vehicle_id) });
            } else if (notification.tipo === 'payment_reminder' && notification.data?.solicitud_id) {
                navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: parseInt(notification.data.solicitud_id) });
            } else if (notification.tipo === 'order_update' && notification.data?.solicitud_id) {
                navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: parseInt(notification.data.solicitud_id) });
            }
        } catch (error) {
            console.warn('Error navigating from notification:', error);
        }
    };

    const handleDelete = (notificationId) => {
        deleteNotification.mutate(notificationId);
    };

    const renderNotification = ({ item }) => {
        const isUnread = !item.leida;

        // Icono según tipo
        let iconName = 'notifications';
        let iconColor = COLORS.primary;

        if (item.tipo === 'health_alert') {
            iconName = 'construct';
            iconColor = item.data?.es_critico ? COLORS.danger : COLORS.warning;
        } else if (item.tipo === 'payment_reminder') {
            iconName = 'card';
            iconColor = COLORS.info;
        } else if (item.tipo === 'order_update') {
            iconName = 'document-text';
            iconColor = COLORS.success;
        }

        return (
            <TouchableOpacity
                style={[styles.notificationItem, isUnread && styles.unreadItem]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: isUnread ? iconColor + '20' : '#F5F5F5' }]}>
                    <Ionicons
                        name={iconName}
                        size={24}
                        color={isUnread ? iconColor : COLORS.textLight}
                    />
                </View>
                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, isUnread && styles.unreadText]} numberOfLines={1}>
                            {item.titulo}
                        </Text>
                        {isUnread && <View style={styles.dot} />}
                    </View>
                    <Text style={styles.message} numberOfLines={2}>
                        {item.mensaje}
                    </Text>
                    <Text style={styles.time}>
                        {item.fecha_creacion ? format(new Date(item.fecha_creacion), "d MMM, HH:mm", { locale: es }) : ''}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="trash-outline" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notificaciones</Text>
                <TouchableOpacity
                    onPress={() => markAllAsRead.mutate()}
                    disabled={markAllAsRead.isPending || notifications.length === 0}
                >
                    <Text style={styles.markAllText}>Marcar todo leído</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={refetch} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={64} color={COLORS.textLight} />
                        <Text style={styles.emptyText}>No tienes notificaciones</Text>
                    </View>
                }
                contentContainerStyle={notifications.length === 0 ? styles.centerContent : styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    headerTitle: {
        fontSize: FONT_SIZES.h4,
        fontWeight: '600',
        color: COLORS.text,
    },
    markAllText: {
        fontSize: FONT_SIZES.caption,
        color: COLORS.primary,
        fontWeight: '500',
    },
    listContent: {
        paddingBottom: SPACING.xl,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationItem: {
        flexDirection: 'row',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        backgroundColor: COLORS.white,
    },
    unreadItem: {
        backgroundColor: COLORS.primary + '08', // Very light tint
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: BORDERS.radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: FONT_SIZES.body,
        fontWeight: '500',
        color: COLORS.text,
        flex: 1,
    },
    unreadText: {
        fontWeight: '700',
        color: COLORS.text,
    },
    message: {
        fontSize: FONT_SIZES.body,
        color: COLORS.textLight,
        marginBottom: 6,
    },
    time: {
        fontSize: FONT_SIZES.caption,
        color: COLORS.textLight,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
        marginLeft: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZES.body,
        color: COLORS.textLight,
    },
    deleteButton: {
        padding: 8,
        marginLeft: 8,
        alignSelf: 'center',
    },
});
