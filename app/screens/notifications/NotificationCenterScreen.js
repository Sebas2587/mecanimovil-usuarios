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
import {
  Bell,
  Wrench,
  CreditCard,
  FileText,
  Star,
  Trash2,
  ListChecks,
  BellOff,
} from 'lucide-react-native';
import { ROUTES } from '../../utils/constants';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import PrimaryGradientBadge from '../../components/base/PrimaryGradientBadge/PrimaryGradientBadge';
import BrandIconWell from '../../components/base/BrandIconWell/BrandIconWell';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/** Quita emoji / símbolos decorativos del inicio (Airbnb: tipografía limpia). */
function cleanNotificationCopy(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}⛔🔴🟡🟢⚠️✅❌•\s]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

function resolveSolicitudIdFromNotification(notification) {
  const payload = resolveNotificationData(notification?.data);
  const raw = payload.solicitud_id ?? payload.solicitudId;
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw).trim();
}

function resolveIcon(tipo, payload) {
  if (tipo === 'health_alert') {
    return {
      Icon: Wrench,
      color: payload?.es_critico ? COLORS.error.main : COLORS.primary[500],
      soft: payload?.es_critico ? COLORS.error[50] : COLORS.primary[50],
    };
  }
  if (tipo === 'payment_reminder') {
    return { Icon: CreditCard, color: COLORS.primary[500], soft: COLORS.primary[50] };
  }
  if (tipo === 'order_update') {
    return { Icon: FileText, color: COLORS.primary[600], soft: COLORS.primary[50] };
  }
  if (tipo === 'review_reminder') {
    return { Icon: Star, color: COLORS.primary[500], soft: COLORS.primary[50] };
  }
  return { Icon: Bell, color: COLORS.primary[500], soft: COLORS.primary[50] };
}

export default function NotificationCenterScreen({ navigation }) {
  const headerHeight = useHeaderHeight();
  const { height: windowHeight } = useWindowDimensions();
  const { data, isFetching, refetch } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAllNotifications = useDeleteAllNotifications();

  const notifications = useMemo(
    () => data?.results || (Array.isArray(data) ? data : []) || [],
    [data],
  );

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
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

  const renderNotification = ({ item }) => {
    const isUnread = !item.leida;
    const payload = resolveNotificationData(item.data);
    const { Icon, color, soft } = resolveIcon(item.tipo, payload);
    const title = cleanNotificationCopy(item.titulo);
    const message = cleanNotificationCopy(item.mensaje);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        {isUnread && !payload?.es_critico ? (
          <BrandIconWell size={40}>
            <Icon size={18} strokeWidth={2} />
          </BrandIconWell>
        ) : (
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isUnread ? soft : COLORS.neutral.gray[100],
              },
            ]}
          >
            <Icon
              size={18}
              color={isUnread ? color : COLORS.text.tertiary}
              strokeWidth={2}
            />
          </View>
        )}
        <View style={styles.textBlock}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, isUnread && styles.unreadText]} numberOfLines={2}>
              {title}
            </Text>
            {isUnread ? <PrimaryGradientBadge style={styles.dot} /> : null}
          </View>
          {message ? (
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
          ) : null}
          <Text style={styles.time}>
            {item.fecha_creacion
              ? format(new Date(item.fecha_creacion), 'd MMM, HH:mm', { locale: es })
              : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteNotification.mutate(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Eliminar notificación"
        >
          <Trash2 size={16} color={COLORS.text.tertiary} strokeWidth={2} />
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

  const empty = notifications.length === 0;

  return (
    <View style={[styles.container, webRootStyle]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      <View style={styles.toolbar}>
        <TouchableOpacity
          onPress={() => markAllAsRead.mutate()}
          disabled={markAllAsRead.isPending || empty}
          style={styles.toolbarAction}
          accessibilityRole="button"
          accessibilityLabel="Marcar todas como leídas"
        >
          <BrandIconWell size={28}>
            <ListChecks size={14} strokeWidth={2} />
          </BrandIconWell>
          <Text style={styles.toolbarActionText}>Marcar leídas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDeleteAll}
          disabled={deleteAllNotifications.isPending || empty}
          style={styles.toolbarAction}
          accessibilityRole="button"
          accessibilityLabel="Limpiar todas las notificaciones"
        >
          <Trash2 size={16} color={COLORS.text.secondary} strokeWidth={2} />
          <Text style={styles.toolbarActionMuted}>Limpiar todo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={Platform.OS === 'web' ? styles.listWeb : styles.listFlex}
        removeClippedSubviews={Platform.OS !== 'web'}
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => String(item.id)}
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
            <View style={styles.emptyIcon}>
              <BellOff size={28} color={COLORS.text.tertiary} strokeWidth={1.75} />
            </View>
            <Text style={styles.emptyTitle}>Sin notificaciones</Text>
            <Text style={styles.emptyText}>Aquí verás alertas de salud, pagos y solicitudes.</Text>
          </View>
        }
        contentContainerStyle={empty ? styles.centerContent : styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingHorizontal: SPACING.container.horizontal,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  toolbarAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  toolbarActionText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[600],
  },
  toolbarActionMuted: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
  },
  listContent: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  separator: {
    height: SPACING.sm,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  unreadItem: {
    borderColor: COLORS.primary[200],
    backgroundColor: COLORS.primary[50],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    marginBottom: 2,
  },
  title: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    flex: 1,
  },
  unreadText: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
  message: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  time: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.neutral.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
  emptyText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
