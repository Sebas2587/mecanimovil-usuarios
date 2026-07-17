import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Calendar, MessageCircle } from 'lucide-react-native';
import { ROUTES } from '../../utils/constants';
import { COLORS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { useConversationsList } from '../../hooks/useChats';
import ActivityCard from '../../components/cards/ActivityCard';
import SolicitudCard from '../../components/solicitudes/SolicitudCard';
import EmptyState from '../../components/base/EmptyState/EmptyState';
import SegmentedControl from '../../components/base/SegmentedControl/SegmentedControl';
import AppHeader from '../../components/navigation/AppHeader';
import { TAB_BAR_BASE_HEIGHT } from '../../components/home/shared/homeLayoutConstants';
import { attachmentPreviewLabel, getMessageAttachmentUri } from '../../utils/chatAttachmentMedia';
import * as userService from '../../services/user';

const SEGMENTS = [
  { id: 'solicitudes', label: 'Solicitudes', Icon: ClipboardList },
  { id: 'citas', label: 'Citas', Icon: Calendar },
  { id: 'mensajes', label: 'Mensajes', Icon: MessageCircle },
];

const ActividadScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState('solicitudes');
  const { solicitudesActivas, cargarSolicitudesActivas } = useSolicitudes();
  const {
    data: conversations = [],
    refetch: refetchChats,
    isPending: chatsLoading,
  } = useConversationsList('service');

  const {
    data: citas = [],
    isPending: citasLoading,
    refetch: refetchCitas,
  } = useQuery({
    queryKey: ['activeAppointmentsPanel'],
    queryFn: () => userService.getActiveAppointments(),
    staleTime: 1000 * 60 * 2,
  });

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargarSolicitudesActivas();
      refetchCitas();
      refetchChats();
    }, [cargarSolicitudesActivas, refetchCitas, refetchChats]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([cargarSolicitudesActivas(), refetchCitas(), refetchChats()]);
    setRefreshing(false);
  }, [cargarSolicitudesActivas, refetchCitas, refetchChats]);

  const solicitudesList = useMemo(
    () => (Array.isArray(solicitudesActivas) ? solicitudesActivas : []),
    [solicitudesActivas],
  );

  const citasList = useMemo(() => (Array.isArray(citas) ? citas : []), [citas]);

  const unreadChats = useMemo(
    () => conversations.reduce((acc, c) => acc + (Number(c?.unread_count) || 0), 0),
    [conversations],
  );

  const segmentItems = useMemo(
    () =>
      SEGMENTS.map((seg) =>
        seg.id === 'mensajes' && unreadChats > 0 ? { ...seg, count: unreadChats } : seg,
      ),
    [unreadChats],
  );

  const handleSolicitudPress = useCallback(
    (solicitud) => {
      navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: solicitud.id });
    },
    [navigation],
  );

  const renderContent = () => {
    if (segment === 'solicitudes') {
      if (solicitudesList.length === 0) {
        return (
          <EmptyState
            icon={<ClipboardList size={40} color={COLORS.text.tertiary} />}
            title="Sin solicitudes activas"
            message="Cuando agendes un servicio, aparecerá aquí."
            actionLabel="Agendar servicio"
            onAction={() => navigation.navigate(ROUTES.CREAR_SOLICITUD)}
          />
        );
      }
      return solicitudesList.map((s) => (
        <View key={String(s.id)} style={styles.solicitudCardWrap}>
          <SolicitudCard
            solicitud={s}
            fullWidth
            onPress={handleSolicitudPress}
          />
        </View>
      ));
    }

    if (segment === 'citas') {
      if (citasLoading && citasList.length === 0) {
        return <Text style={styles.loading}>Cargando citas…</Text>;
      }
      if (citasList.length === 0) {
        return (
          <EmptyState
            icon={<Calendar size={40} color={COLORS.text.tertiary} />}
            title="Sin citas confirmadas"
            message="Tus agendamientos confirmados se mostrarán aquí."
          />
        );
      }
      return citasList.map((c) => (
        <ActivityCard
          key={String(c.id)}
          title={c.servicio_nombre || c.tipo_servicio || 'Cita'}
          subtitle={c.proveedor_nombre || c.taller_nombre}
          dateLabel={[c.fecha_servicio, c.hora_servicio].filter(Boolean).join(' ')}
          statusLabel={c.estado}
          statusVariant="success"
          onPress={() =>
            navigation.navigate(ROUTES.APPOINTMENT_DETAIL, {
              appointmentId: c.id,
              appointment: c,
            })
          }
        />
      ));
    }

    if (chatsLoading && conversations.length === 0) {
      return <Text style={styles.loading}>Cargando mensajes…</Text>;
    }
    if (conversations.length === 0) {
      return (
        <EmptyState
          icon={<MessageCircle size={40} color={COLORS.text.tertiary} />}
          title="Sin mensajes"
          message="Los chats con proveedores aparecerán aquí."
        />
      );
    }
    return conversations.map((c) => {
      const providerName =
        c.other_participant?.full_name ||
        [c.other_participant?.first_name, c.other_participant?.last_name]
          .filter(Boolean)
          .join(' ') ||
        c.other_participant?.username ||
        'Proveedor';
      const lastMsg = c.last_message?.content;
      const lastAttachment = getMessageAttachmentUri(c.last_message);
      const preview = lastMsg || (lastAttachment ? attachmentPreviewLabel(c.last_message) : 'Inicia la conversación');

      return (
        <ActivityCard
          key={String(c.id)}
          title={providerName}
          subtitle={preview}
          avatarUri={c.other_participant?.foto_perfil}
          statusLabel={
            (c.unread_count ?? 0) > 0 ? `${c.unread_count} nuevo${c.unread_count > 1 ? 's' : ''}` : null
          }
          statusVariant="accent"
          onPress={() =>
            navigation.navigate(ROUTES.CHAT_DETAIL, {
              conversationId: c.id,
              conversation: c,
            })
          }
        />
      );
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      {/* Mismo AppHeader que Cuenta / stack (safe area + tipografía h5) */}
      <AppHeader title="Actividad" />

      <SegmentedControl
        segments={segmentItems}
        value={segment}
        onChange={setSegment}
        style={styles.segments}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SPACING.container.horizontal,
          paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + SPACING.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  segments: {
    paddingHorizontal: SPACING.container.horizontal,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  solicitudCardWrap: {
    marginBottom: SPACING.md,
  },
  loading: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});

export default ActividadScreen;
