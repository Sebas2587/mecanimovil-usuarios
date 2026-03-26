import React, { useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    StatusBar,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    useNotifications,
    useMarkAsRead,
    useMarkAllAsRead,
    useDeleteNotification,
    useDeleteAllNotifications,
} from '../../hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES, SPACING, FONT_SIZES, BORDERS } from '../../utils/constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const GLASS_BG = Platform.select({
    ios: 'rgba(255,255,255,0.06)',
    android: 'rgba(255,255,255,0.10)',
    default: 'rgba(255,255,255,0.08)',
});

export default function NotificationCenterScreen({ navigation }) {
    const { data, isLoading, isFetching, refetch } = useNotifications();
    const markAsRead = useMarkAsRead();
    const markAllAsRead = useMarkAllAsRead();
    const deleteNotification = useDeleteNotification();
    const deleteAllNotifications = useDeleteAllNotifications();

    const notifications = useMemo(
        () => data?.results || (Array.isArray(data) ? data : []) || [],
        [data]
    );

    // Al abrir la pantalla, pedir datos frescos al API (Celery crea filas en servidor;
    // la lista vacía suele ser “aún no hay filas para este usuario”, no un fallo del diseño).
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const handleRefresh = () => {
        if (!deleteNotification.isPending && !deleteAllNotifications.isPending) {
            refetch();
        }
    };

    const handleDeleteAll = () => {
        if (notifications.length > 0) {
            deleteAllNotifications.mutate();
        }
    };

    const handleNotificationPress = (notification) => {
        if (!notification.leida) {
            markAsRead.mutate(notification.id);
        }

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

        let iconName = 'notifications';
        let iconColor = '#93C5FD';

        if (item.tipo === 'health_alert') {
            iconName = 'construct';
            iconColor = item.data?.es_critico ? '#F87171' : '#FBBF24';
        } else if (item.tipo === 'payment_reminder') {
            iconName = 'card';
            iconColor = '#38BDF8';
        } else if (item.tipo === 'order_update') {
            iconName = 'document-text';
            iconColor = '#6EE7B7';
        }

        return (
            <TouchableOpacity
                style={[styles.notificationItem, isUnread && styles.unreadItem]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.75}
            >
                <View style={[styles.iconContainer, { backgroundColor: isUnread ? `${iconColor}28` : 'rgba(255,255,255,0.06)' }]}>
                    <Ionicons
                        name={iconName}
                        size={22}
                        color={isUnread ? iconColor : 'rgba(255,255,255,0.45)'}
                    />
                </View>
                <View style={styles.textBlock}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, isUnread && styles.unreadText]} numberOfLines={1}>
                            {item.titulo}
                        </Text>
                        {isUnread ? <View style={styles.dot} /> : null}
                    </View>
                    <Text style={styles.message} numberOfLines={2}>
                        {item.mensaje}
                    </Text>
                    <Text style={styles.time}>
                        {item.fecha_creacion ? format(new Date(item.fecha_creacion), 'd MMM, HH:mm', { locale: es }) : ''}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <LinearGradient colors={['#030712', '#0a0f1a', '#030712']} style={StyleSheet.absoluteFill} />
                <View style={styles.blobA} />
                <View style={styles.blobB} />
            </View>

            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Acciones (el título lo muestra CustomHeader del stack) */}
            <View style={styles.toolbar}>
                <TouchableOpacity
                    onPress={() => markAllAsRead.mutate()}
                    disabled={markAllAsRead.isPending || notifications.length === 0}
                    style={styles.toolbarChip}
                >
                    <Ionicons name="checkmark-done-outline" size={16} color="#6EE7B7" style={{ marginRight: 6 }} />
                    <Text style={styles.toolbarChipText}>Marcar leídas</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleDeleteAll}
                    disabled={deleteAllNotifications.isPending || notifications.length === 0}
                    style={[styles.toolbarChip, styles.toolbarChipDanger]}
                >
                    <Ionicons name="trash-outline" size={16} color="#FCA5A5" style={{ marginRight: 6 }} />
                    <Text style={styles.toolbarChipDangerText}>Limpiar todo</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl
                        refreshing={
                            isFetching && !deleteNotification.isPending && !deleteAllNotifications.isPending
                        }
                        onRefresh={handleRefresh}
                        tintColor="#6EE7B7"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={64} color="rgba(255,255,255,0.2)" />
                        <Text style={styles.emptyText}>No tienes notificaciones</Text>
                    </View>
                }
                contentContainerStyle={
                    notifications.length === 0 ? styles.centerContent : styles.listContent
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030712',
    },
    blobA: {
        position: 'absolute',
        top: 60,
        right: -40,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(99,102,241,0.08)',
    },
    blobB: {
        position: 'absolute',
        bottom: 100,
        left: -30,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(16,185,129,0.06)',
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    toolbarChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: GLASS_BG,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    toolbarChipText: {
        fontSize: FONT_SIZES.caption,
        color: '#6EE7B7',
        fontWeight: '600',
    },
    toolbarChipDanger: {
        borderColor: 'rgba(248,113,113,0.35)',
    },
    toolbarChipDangerText: {
        fontSize: FONT_SIZES.caption,
        color: '#FCA5A5',
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.xl,
        paddingTop: SPACING.sm,
    },
    centerContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: SPACING.md,
        marginBottom: 16,
        borderRadius: BORDERS.radius.lg || 16,
        backgroundColor: GLASS_BG,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    unreadItem: {
        borderColor: 'rgba(147,197,253,0.35)',
        backgroundColor: 'rgba(147,197,253,0.06)',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: BORDERS.radius.round,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    textBlock: {
        flex: 1,
        minWidth: 0,
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
        color: 'rgba(255,255,255,0.75)',
        flex: 1,
    },
    unreadText: {
        fontWeight: '700',
        color: '#F9FAFB',
    },
    message: {
        fontSize: FONT_SIZES.body,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 6,
    },
    time: {
        fontSize: FONT_SIZES.caption,
        color: 'rgba(255,255,255,0.35)',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#6EE7B7',
        marginLeft: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZES.body,
        color: 'rgba(255,255,255,0.45)',
    },
    deleteButton: {
        padding: 8,
        marginLeft: 4,
    },
});
