import React, { useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useDeleteAllNotifications,
} from '../../hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES, SPACING, FONT_SIZES, BORDERS } from '../../utils/constants';
import { COLORS } from '../../design-system/tokens/colors';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/** `data` puede venir como objeto o JSON string desde la API. */
function resolveNotificationData(data) {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
}

/** IDs de solicitud son UUID — nunca usar parseInt (corrompe el id). */
function resolveSolicitudIdFromNotification(notification) {
  const payload = resolveNotificationData(notification?.data);
  const raw = payload.solicitud_id ?? payload.solicitudId;
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw).trim();
}

export default function NotificationCenterScreen({ navigation }) {
  const headerHeight = useHeaderHeight();
  const { height: windowHeight } = useWindowDimensions();
  const { data, isLoading, isFetching, refetch } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAllNotifications = useDeleteAllNotifications();

  const notifications = useMemo(
    () => data?.results || (Array.isArray(data) ? data : []) || [],
    [data]
  );

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
      const payload = resolveNotificationData(notification.data);
      const solicitudId = resolveSolicitudIdFromNotification(notification);
      const vehicleId = payload.vehicle_id ?? payload.vehicleId;

      if (notification.tipo === 'health_alert' && vehicleId) {
        navigation.navigate(ROUTES.VEHICLE_HEALTH, { vehicleId: String(vehicleId) });
      } else if (notification.tipo === 'review_reminder') {
        navigation.navigate(ROUTES.PROFILE, { screen: ROUTES.PENDING_REVIEWS });
      } else if (
        solicitudId &&
        (notification.tipo === 'payment_reminder' || notification.tipo === 'order_update')
      ) {
        navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId });
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
    let iconColor = COLORS.primary[500];

    if (item.tipo === 'health_alert') {
      iconName = 'construct';
      iconColor = item.data?.es_critico ? COLORS.error.main : COLORS.warning[500];
    } else if (item.tipo === 'payment_reminder') {
      iconName = 'card';
      iconColor = COLORS.primary[600];
    } else if (item.tipo === 'order_update') {
      iconName = 'document-text';
      iconColor = COLORS.success[600];
    } else if (item.tipo === 'review_reminder') {
      iconName = 'star';
      iconColor = COLORS.warning[600];
    }

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.75}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: isUnread ? `${iconColor}22` : COLORS.neutral.gray[100] },
          ]}
        >
          <Ionicons
            name={iconName}
            size={22}
            color={isUnread ? iconColor : COLORS.text.tertiary}
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
          <Ionicons name="trash-outline" size={20} color={COLORS.text.tertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const webRootStyle =
    Platform.OS === 'web'
      ? {
          minHeight: 0,
          height: Math.max(windowHeight - headerHeight, 0),
          maxHeight: Math.max(windowHeight - headerHeight, 0),
          overflow: 'hidden',
        }
      : null;

  return (
    <View style={[styles.container, webRootStyle]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <View style={styles.toolbar}>
        <TouchableOpacity
          onPress={() => markAllAsRead.mutate()}
          disabled={markAllAsRead.isPending || notifications.length === 0}
          style={styles.toolbarChip}
        >
          <Ionicons name="checkmark-done-outline" size={16} color={COLORS.success[600]} style={{ marginRight: 6 }} />
          <Text style={styles.toolbarChipText}>Marcar leídas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDeleteAll}
          disabled={deleteAllNotifications.isPending || notifications.length === 0}
          style={[styles.toolbarChip, styles.toolbarChipDanger]}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.error.main} style={{ marginRight: 6 }} />
          <Text style={styles.toolbarChipDangerText}>Limpiar todo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={Platform.OS === 'web' ? styles.listWeb : styles.listFlex}
        removeClippedSubviews={Platform.OS !== 'web'}
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={
              isFetching && !deleteNotification.isPending && !deleteAllNotifications.isPending
            }
            onRefresh={handleRefresh}
            tintColor={COLORS.primary[500]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={COLORS.neutral.gray[300]} />
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
    backgroundColor: COLORS.background.default,
  },
  listFlex: {
    flex: 1,
  },
  listWeb: {
    flex: 1,
    minHeight: 0,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  toolbarChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  toolbarChipText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.success[700],
    fontWeight: '600',
  },
  toolbarChipDanger: {
    borderColor: COLORS.error[200],
    backgroundColor: COLORS.error.light,
  },
  toolbarChipDangerText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.error.dark,
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
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  unreadItem: {
    borderColor: COLORS.primary[200],
    backgroundColor: COLORS.primary[50],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDERS.radius.full,
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
    color: COLORS.text.secondary,
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  message: {
    fontSize: FONT_SIZES.body,
    color: COLORS.text.secondary,
    marginBottom: 6,
  },
  time: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.text.tertiary,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary[500],
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.body,
    color: COLORS.text.secondary,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
});
