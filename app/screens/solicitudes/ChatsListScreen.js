import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import { COLORS } from '../../design-system/tokens/colors';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { SPACING } from '../../design-system/tokens/spacing';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import { BORDERS } from '../../design-system/tokens/borders';
import { ROUTES } from '../../utils/constants';

import chatService from '../../services/chatService';

const ChatsListScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState('service'); // 'service' | 'marketplace'
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    try {
      const data = await chatService.getConversations(activeTab);
      setConversations(data.results || data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      return () => { };
    }, [activeTab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const handleTabChange = (tab) => {
    if (activeTab !== tab) {
      setLoading(true);
      setActiveTab(tab);
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
      <Text style={styles.headerTitle}>Mensajes</Text>

      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'service' && styles.segmentActive]}
          onPress={() => handleTabChange('service')}
        >
          <Text style={[
            styles.segmentText,
            activeTab === 'service' && styles.segmentTextActive
          ]}>Servicios</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'marketplace' && styles.segmentActive]}
          onPress={() => handleTabChange('marketplace')}
        >
          <Text style={[
            styles.segmentText,
            activeTab === 'marketplace' && styles.segmentTextActive
          ]}>Negocios</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    const otherUser = item.other_participant;
    const name = otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : 'Usuario desconocido';

    // New Layout Mapping:
    // Title -> Service Name (subtitle from backend)
    // Badge -> Vehicle Info (title from backend)
    const serviceTitle = item.context_info?.subtitle || 'Consultas Generales';
    const vehicleInfo = item.context_info?.title || 'Detalles no disponibles';

    const lastMsg = item.last_message?.content || 'Inicia la conversación';
    const time = item.last_message?.timestamp ? new Date(item.last_message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const unread = item.unread_count > 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate(ROUTES.CHAT_DETAIL, { conversationId: item.id })}
      >
        {/* Row 1: Service Title */}
        <Text style={styles.serviceTitle} numberOfLines={1}>{serviceTitle}</Text>

        {/* Row 2: Vehicle Badge */}
        <View style={styles.vehicleBadge}>
          <Ionicons name="car-sport-outline" size={14} color={COLORS.text.secondary} />
          <Text style={styles.vehicleText} numberOfLines={1}>{vehicleInfo}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Row 3: Provider & Message Info */}
        <View style={styles.providerContainer}>
          <View style={styles.avatarWrapper}>
            <Image
              source={otherUser?.photo_url || 'https://via.placeholder.com/50'}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
            />
            {/* Online indicator could go here */}
          </View>

          <View style={styles.infoColumn}>
            <View style={styles.nameTimeRow}>
              <Text style={styles.providerName} numberOfLines={1}>{name}</Text>
              <Text style={styles.timeText}>{time}</Text>
            </View>

            <View style={styles.messageRow}>
              <Text style={[styles.lastMessage, unread && styles.lastMessageUnread]} numberOfLines={1}>
                {lastMsg}
              </Text>
              {unread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unread_count}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="message-text-outline" size={64} color={COLORS.neutral.gray[300]} />
              <Text style={styles.emptyText}>No tienes mensajes en esta sección</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.light,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.gray[100],
  },
  headerTitle: {
    fontSize: 28, // XL was too small, moving to 3XL equivalent
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.lg,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BORDERS.radius.md,
  },
  segmentActive: {
    backgroundColor: '#fff',
    ...SHADOWS.sm,
  },
  segmentText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  segmentTextActive: {
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray[100],
  },
  serviceTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary[500],
    marginBottom: 6,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray[200],
  },
  vehicleText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.neutral.gray[100],
    marginBottom: 8,
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
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  timeText: {
    fontSize: 10,
    color: COLORS.text.tertiary,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary[500],
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.tertiary,
  },
});

export default ChatsListScreen;
