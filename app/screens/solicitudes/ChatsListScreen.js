import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { ROUTES } from '../../utils/constants';

import chatService from '../../services/chatService';
import { useQuery } from '@tanstack/react-query';

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});

const ChatsListScreen = () => {
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState('service');

  const {
    data: conversations = [],
    isLoading: loading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['conversations', activeTab],
    queryFn: async () => {
      const data = await chatService.getConversations(activeTab);
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.results)) return data.results;
      return [];
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleTabChange = (tab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const renderItem = ({ item }) => {
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
          <Ionicons name="car-sport-outline" size={14} color="#93C5FD" />
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
  };

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient colors={['#030712', '#0a0f1a', '#030712']} style={StyleSheet.absoluteFill} />
      </View>

      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="chevron-back" size={26} color="#F9FAFB" />
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

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6EE7B7" />
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#6EE7B7" />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="message-text-outline" size={64} color="rgba(255,255,255,0.2)" />
                <Text style={styles.emptyText}>No tienes mensajes en esta sección</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030712',
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
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  backBtnPlaceholder: {
    width: 44,
    height: 44,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  segmentTextActive: {
    color: '#F9FAFB',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: GLASS_BG,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#93C5FD',
    marginBottom: 6,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  vehicleText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginLeft: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    color: '#F9FAFB',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: 'rgba(16,185,129,0.85)',
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
    marginTop: 80,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

export default ChatsListScreen;
