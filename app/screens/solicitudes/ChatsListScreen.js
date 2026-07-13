import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Platform,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { MessageSquare } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import { useQueryClient } from '@tanstack/react-query';
import { useConversationsList, CONVERSATIONS_KEYS } from '../../hooks/useChats';
import ChatsListSkeleton from '../../components/utils/ChatsListSkeleton';
import chatService from '../../services/chatService';
import ChatSwipeableRow from '../../components/chats/ChatSwipeableRow';
import { attachmentPreviewLabel, getMessageAttachmentUri } from '../../utils/chatAttachmentMedia';

const ChatsListScreen = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { height: windowHeight } = useWindowDimensions();
  const [deletingId, setDeletingId] = useState(null);

  /** RN Web: sin altura acotada al viewport el VirtualizedList no hace scroll interno. */
  const webRootFrame =
    Platform.OS === 'web'
      ? {
          height: windowHeight,
          maxHeight: windowHeight,
          minHeight: 0,
          flex: 1,
          overflow: 'hidden',
        }
      : null;

  const {
    data: conversations = [],
    isPending,
    refetch,
  } = useConversationsList('service');

  const [pullRefreshing, setPullRefreshing] = useState(false);

  const deleteConversation = useCallback(
    async (conversationId) => {
      setDeletingId(conversationId);
      try {
        await chatService.deleteConversation(conversationId);
        await queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEYS.all });
      } catch (e) {
        Alert.alert('Error', e?.message || 'No se pudo eliminar la conversación');
        throw e;
      } finally {
        setDeletingId(null);
      }
    },
    [queryClient],
  );

  const onRefresh = useCallback(() => {
    setPullRefreshing(true);
    refetch()
      .catch(() => {})
      .finally(() => {
        setPullRefreshing(false);
      });
  }, [refetch]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  const renderItem = useCallback(
    ({ item }) => {
      const otherUser = item.other_participant;
      const name =
        otherUser?.full_name ||
        [otherUser?.first_name, otherUser?.last_name].filter(Boolean).join(' ') ||
        otherUser?.username ||
        'Proveedor';
      const serviceTitle = item.context_info?.subtitle || 'Consultas Generales';
      const vehicleInfo = item.context_info?.title || 'Detalles no disponibles';
      const lastMsgText = item.last_message?.content;
      const lastAttachment = getMessageAttachmentUri(item.last_message);
      const lastMsg =
        lastMsgText ||
        (lastAttachment ? attachmentPreviewLabel(item.last_message) : 'Inicia la conversación');
      const time = item.last_message?.timestamp
        ? new Date(item.last_message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      const unread = item.unread_count > 0;

      const isDeleting = deletingId === item.id;

      return (
        <ChatSwipeableRow
          rowKey={String(item.id)}
          disabled={isDeleting}
          onDelete={() => deleteConversation(item.id)}
        >
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate(ROUTES.CHAT_DETAIL, { conversationId: item.id })}
            activeOpacity={0.92}
            disabled={isDeleting}
          >
            <Image
              source={otherUser?.foto_perfil || 'https://via.placeholder.com/50'}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.infoColumn}>
              <View style={styles.nameTimeRow}>
                <Text style={styles.providerName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.timeText}>{time}</Text>
              </View>
              <Text style={styles.contextLine} numberOfLines={1}>
                {vehicleInfo} · {serviceTitle}
              </Text>
              <View style={styles.messageRow}>
                <Text style={[styles.lastMessage, unread && styles.lastMessageUnread]} numberOfLines={1}>
                  {lastMsg}
                </Text>
                {unread ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread_count}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        </ChatSwipeableRow>
      );
    },
    [navigation, deletingId, deleteConversation]
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyState}>
        <MessageSquare size={64} color={COLORS.neutral.gray[300]} strokeWidth={1.5} />
        <Text style={styles.emptyText}>No tienes mensajes en esta sección</Text>
      </View>
    ),
    []
  );

  // Solo pantalla vacía de carga inicial: con datos en caché (optimista/placeholder) no ocultar la lista.
  const showSkeleton = isPending;

  return (
    <View style={[styles.root, webRootFrame]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <View style={styles.mainColumn}>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <View style={styles.topBar}>
            <BackButton onPress={handleBack} />
            <Text style={styles.screenTitle}>Mensajes</Text>
            <View style={styles.backBtnPlaceholder} />
          </View>
        </SafeAreaView>

        <View style={styles.listContainer}>
          {showSkeleton ? (
            <ChatsListSkeleton />
          ) : (
            <FlatList
              data={conversations}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={[
                styles.listContent,
                conversations.length === 0 && styles.listContentEmpty,
              ]}
              refreshControl={
                <RefreshControl
                  refreshing={pullRefreshing}
                  onRefresh={onRefresh}
                  tintColor={COLORS.primary[500]}
                />
              }
              ListEmptyComponent={conversations.length === 0 ? listEmpty : null}
              showsVerticalScrollIndicator={false}
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={Platform.OS !== 'web'}
              style={styles.list}
              {...(Platform.OS === 'web' ? { nestedScrollEnabled: true } : {})}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  mainColumn: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web' ? { display: 'flex', flexDirection: 'column' } : null),
  },
  safe: {
    flexGrow: 0,
    flexShrink: 0,
  },
  listContainer: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web' ? { overflow: 'hidden' } : null),
  },
  list: {
    ...(Platform.OS === 'web'
      ? {
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          minHeight: 0,
          overflow: 'scroll',
          WebkitOverflowScrolling: 'touch',
        }
      : { flex: 1 }),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: 12,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  backBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  screenTitle: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.text.primary,
  },
  listContent: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
    paddingBottom: 100,
    gap: SPACING.sm,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    gap: SPACING.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.neutral.gray[200],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  infoColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  nameTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  providerName: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
  },
  contextLine: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
    marginBottom: 4,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: COLORS.primary[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.onPrimary,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

export default ChatsListScreen;
