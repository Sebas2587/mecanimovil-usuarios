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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { ROUTES } from '../../utils/constants';
import { useConversationsList } from '../../hooks/useChats';
import ChatsListSkeleton from '../../components/utils/ChatsListSkeleton';

const ChatsListScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('service');

  const {
    data: conversations = [],
    isLoading,
    isFetching,
    refetch,
  } = useConversationsList(activeTab);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab((prev) => (prev !== tab ? tab : prev));
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  const renderItem = useCallback(
    ({ item }) => {
      const otherUser = item.other_participant;
      const name = otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : 'Usuario desconocido';
      const serviceTitle = item.context_info?.subtitle || 'Consultas Generales';
      const vehicleInfo = item.context_info?.title || 'Detalles no disponibles';
      const lastMsg = item.last_message?.content || 'Inicia la conversación';
      const time = item.last_message?.timestamp
        ? new Date(item.last_message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      const unread = item.unread_count > 0;

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate(ROUTES.CHAT_DETAIL, { conversationId: item.id })}
          activeOpacity={0.8}
        >
          <Text style={styles.serviceTitle} numberOfLines={1}>
            {serviceTitle}
          </Text>
          <View style={styles.vehicleBadge}>
            <Ionicons name="car-sport-outline" size={14} color={COLORS.primary[500]} />
            <Text style={styles.vehicleText} numberOfLines={1}>
              {vehicleInfo}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.providerContainer}>
            <View style={styles.avatarWrapper}>
              <Image
                source={otherUser?.photo_url || 'https://via.placeholder.com/50'}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
              />
            </View>
            <View style={styles.infoColumn}>
              <View style={styles.nameTimeRow}>
                <Text style={styles.providerName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.timeText}>{time}</Text>
              </View>
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
          </View>
        </TouchableOpacity>
      );
    },
    [navigation]
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="message-text-outline" size={64} color={COLORS.neutral.gray[300]} />
        <Text style={styles.emptyText}>No tienes mensajes en esta sección</Text>
      </View>
    ),
    []
  );

  const showSkeleton = isLoading;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="chevron-back" size={26} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Mensajes</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>

        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentButton, activeTab === 'service' && styles.segmentActive]}
            onPress={() => handleTabChange('service')}
          >
            <Text style={[styles.segmentText, activeTab === 'service' && styles.segmentTextActive]}>Servicios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, activeTab === 'marketplace' && styles.segmentActive]}
            onPress={() => handleTabChange('marketplace')}
          >
            <Text style={[styles.segmentText, activeTab === 'marketplace' && styles.segmentTextActive]}>
              Negocios
            </Text>
          </TouchableOpacity>
        </View>

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
              <RefreshControl refreshing={isFetching && !isLoading} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />
            }
            ListEmptyComponent={conversations.length === 0 ? listEmpty : null}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS !== 'web'}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  safe: {
    flex: 1,
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
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  backBtnPlaceholder: {
    width: 44,
    height: 44,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: 14,
    padding: 4,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.tertiary,
  },
  segmentTextActive: {
    color: COLORS.text.primary,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    marginBottom: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary[700],
    marginBottom: 6,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  vehicleText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
    marginBottom: 10,
  },
  providerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.neutral.gray[200],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  nameTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: COLORS.success[500],
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: COLORS.text.inverse,
    fontSize: 10,
    fontWeight: 'bold',
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
