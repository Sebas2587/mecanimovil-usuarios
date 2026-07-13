import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  User,
  Car,
  CalendarDays,
  Sparkles,
  Send,
  Star,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { post } from '../../services/api';
import { showAlert } from '../../utils/platformAlert';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { BORDERS, SPACING, SHADOWS, TYPOGRAPHY } from '../../design-system/tokens';
import { TAB_BAR_BASE_HEIGHT } from '../../components/home/shared/homeLayoutConstants';
import { PENDING_REVIEWS_QUERY_KEY } from '../../hooks/usePendingReviews';

function extractReviewSubmitError(error) {
  const data = error?.response?.data;
  if (!data) return error?.message || 'Intenta de nuevo en unos segundos.';
  if (typeof data.error === 'string' && data.error.trim()) return data.error;
  if (typeof data.detail === 'string' && data.detail.trim()) return data.detail;
  if (Array.isArray(data) && data.length > 0) return String(data[0]);
  if (typeof data === 'object') {
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      if (Array.isArray(val) && val.length) return `${firstKey}: ${val[0]}`;
      if (typeof val === 'string') return `${firstKey}: ${val}`;
    }
  }
  return 'Intenta de nuevo en unos segundos.';
}

const CreateReviewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { service } = route.params || {};

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const providerType = service?.provider?.provider_type || service?.provider?.tipo || null;
  const isMecanicoDomicilio = String(providerType || '').toLowerCase().includes('mecanico');

  const [aspects, setAspects] = useState({
    puntualidad: 0,
    recepcion_a_tiempo: 0,
    limpieza_auto: 0,
    zona_limpia: 0,
    claridad_explicacion: 0,
    informacion_relevante: 0,
    trato: 0,
    entrego_repuestos: null,
  });

  const handleSubmit = async () => {
    if (rating === 0) {
      showAlert('Calificación requerida', 'Selecciona una calificación de 1 a 5 estrellas.');
      return;
    }

    const serviceOrderId = service?.service_order_id;
    const providerId = service?.provider?.provider_id;
    if (!serviceOrderId || !providerId) {
      showAlert(
        'Datos incompletos',
        'No pudimos identificar el servicio o el proveedor. Vuelve atrás e intenta de nuevo desde calificaciones pendientes.',
      );
      return;
    }

    try {
      setSubmitting(true);

      const reviewData = {
        service_order_id: serviceOrderId,
        rating,
        comment: comment.trim(),
        aspects: {
          puntualidad: aspects.puntualidad || null,
          recepcion_a_tiempo: !isMecanicoDomicilio ? (aspects.recepcion_a_tiempo || null) : null,
          limpieza_auto: !isMecanicoDomicilio ? (aspects.limpieza_auto || null) : null,
          zona_limpia: isMecanicoDomicilio ? (aspects.zona_limpia || null) : null,
          claridad_explicacion: aspects.claridad_explicacion || null,
          informacion_relevante: aspects.informacion_relevante || null,
          trato: aspects.trato || null,
          entrego_repuestos: aspects.entrego_repuestos,
        },
      };

      await post(`/usuarios/providers/${providerId}/reviews/`, reviewData);
      queryClient.invalidateQueries({ queryKey: PENDING_REVIEWS_QUERY_KEY });

      if (Platform.OS === 'web') {
        showAlert(
          '¡Reseña enviada!',
          'Gracias por compartir tu experiencia. Tu reseña ayudará a otros usuarios.',
        );
        navigation.goBack();
      } else {
        Alert.alert(
          '¡Reseña enviada!',
          'Gracias por compartir tu experiencia. Tu reseña ayudará a otros usuarios.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (error) {
      console.error('Error al enviar reseña:', error);
      showAlert('No se pudo enviar', extractReviewSubmitError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const setAspectValue = (key, value) => {
    setAspects((prev) => ({ ...prev, [key]: value }));
  };

  const ratingLabels = {
    1: 'Muy malo',
    2: 'Malo',
    3: 'Regular',
    4: 'Bueno',
    5: 'Excelente',
  };

  const renderMainStars = () => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= rating;
        return (
          <TouchableOpacity
            key={star}
            style={styles.starBtn}
            onPress={() => setRating(star)}
            accessibilityLabel={`${star} estrella${star > 1 ? 's' : ''}`}
          >
            <Star
              size={36}
              color={active ? COLORS.warning.main : COLORS.neutral.gray[300]}
              fill={active ? COLORS.warning.main : 'transparent'}
              strokeWidth={1.75}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderAspectRow = (label, key, helpText) => (
    <View style={styles.aspectBlock}>
      <Text style={styles.aspectLabel}>{label}</Text>
      {helpText ? <Text style={styles.aspectHelp}>{helpText}</Text> : null}
      <View style={styles.aspectStarsRow}>
        {[1, 2, 3, 4, 5].map((v) => {
          const active = v <= (aspects[key] || 0);
          return (
            <TouchableOpacity
              key={`${key}-${v}`}
              style={styles.aspectStarBtn}
              onPress={() => setAspectValue(key, v)}
              activeOpacity={0.85}
            >
              <Star
                size={22}
                color={active ? COLORS.primary[500] : COLORS.neutral.gray[300]}
                fill={active ? COLORS.primary[500] : 'transparent'}
                strokeWidth={1.75}
              />
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={styles.aspectClearBtn}
          onPress={() => setAspectValue(key, 0)}
          activeOpacity={0.85}
        >
          <Text style={styles.aspectClearText}>Omitir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBinaryRow = (label, key) => (
    <View style={styles.aspectBlock}>
      <Text style={styles.aspectLabel}>{label}</Text>
      <View style={styles.binaryRow}>
        {[
          { id: true, text: 'Sí' },
          { id: false, text: 'No' },
          { id: null, text: 'No aplica' },
        ].map((opt) => {
          const active = aspects[key] === opt.id;
          return (
            <TouchableOpacity
              key={`${key}-${String(opt.id)}`}
              style={[styles.binaryChip, active && styles.binaryChipActive]}
              onPress={() => setAspectValue(key, opt.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.binaryChipText, active && styles.binaryChipTextActive]}>
                {opt.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const footerBottomPad = Math.max(insets.bottom, SPACING.md) + TAB_BAR_BASE_HEIGHT;

  if (!service?.provider) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Servicio no disponible</Text>
          <Text style={styles.emptyText}>No pudimos cargar los datos del servicio.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: SPACING.xl + 88 + TAB_BAR_BASE_HEIGHT },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Servicio realizado */}
        <View style={styles.card}>
          <Text style={styles.serviceHeroTitle} numberOfLines={3}>
            {service.service_name}
          </Text>

          <View style={styles.providerRow}>
            {service.provider.provider_photo ? (
              <Image
                source={{ uri: service.provider.provider_photo }}
                style={styles.providerAvatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.providerPlaceholder}>
                <User size={20} color={COLORS.text.tertiary} strokeWidth={1.75} />
              </View>
            )}
            <Text style={styles.providerName}>{service.provider.provider_name}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Car size={16} color={COLORS.text.tertiary} strokeWidth={1.75} />
            <Text style={styles.detailText}>{service.vehicle?.full_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <CalendarDays size={16} color={COLORS.text.tertiary} strokeWidth={1.75} />
            <Text style={styles.detailText}>
              Completado el {new Date(service.completion_date).toLocaleDateString('es-CL')}
            </Text>
          </View>
        </View>

        {/* Calificación general */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>¿Cómo calificarías el servicio?</Text>
          {renderMainStars()}
          <Text style={[styles.ratingHint, rating > 0 && styles.ratingHintActive]}>
            {ratingLabels[rating] || 'Selecciona una calificación'}
          </Text>
        </View>

        {/* Comentario */}
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Cuéntanos tu experiencia (opcional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="¿Qué te pareció el servicio? ¿El tiempo de espera fue adecuado?"
            placeholderTextColor={COLORS.text.disabled}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.characterCount}>{comment.length}/500</Text>
        </View>

        {/* Aspectos */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Sparkles size={20} color={COLORS.primary[500]} strokeWidth={1.75} />
            <Text style={styles.cardTitle}>Aspectos del servicio</Text>
          </View>
          <Text style={styles.aspectIntro}>
            Opcional. Ayuda a destacar proveedores según su rendimiento reciente.
          </Text>

          {renderAspectRow('Puntualidad', 'puntualidad', '¿Llegó a tiempo?')}
          {!isMecanicoDomicilio
            ? renderAspectRow('Recepción / entrega a tiempo', 'recepcion_a_tiempo', 'Solo para talleres.')
            : null}
          {!isMecanicoDomicilio
            ? renderAspectRow('Auto limpio al entregar', 'limpieza_auto', 'Solo para talleres.')
            : null}
          {isMecanicoDomicilio
            ? renderAspectRow('Dejó limpia la zona', 'zona_limpia', 'Solo para domicilio.')
            : null}
          {renderBinaryRow('Entregó los repuestos al finalizar', 'entrego_repuestos')}
          {renderAspectRow('Claridad al explicar fallas/solución', 'claridad_explicacion')}
          {renderAspectRow('Información relevante y comunicación', 'informacion_relevante')}
          {renderAspectRow('Trato y educación', 'trato')}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerBottomPad }]}>
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            (rating === 0 || submitting) && styles.submitButtonDisabled,
            pressed && !(rating === 0 || submitting) && styles.submitButtonPressed,
          ]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}
          accessibilityRole="button"
          accessibilityLabel="Enviar reseña"
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.text.onPrimary} />
          ) : (
            <>
              <Send size={18} color={COLORS.text.onPrimary} strokeWidth={1.75} />
              <Text style={styles.submitButtonText}>Enviar reseña</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md + 4,
    marginBottom: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  serviceHeroTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    lineHeight: 26,
    marginBottom: SPACING.sm + 4,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  providerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.gray[100],
  },
  providerPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerName: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
    marginVertical: SPACING.sm + 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  detailText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    flex: 1,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  starBtn: {
    padding: 4,
    marginHorizontal: 2,
  },
  ratingHint: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  ratingHintActive: {
    color: COLORS.warning.dark,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  commentInput: {
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    minHeight: 120,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  characterCount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    textAlign: 'right',
    marginTop: 6,
  },
  aspectIntro: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
  aspectBlock: {
    marginTop: SPACING.sm + 4,
  },
  aspectLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  aspectHelp: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    marginBottom: 6,
  },
  aspectStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  aspectStarBtn: {
    padding: 4,
  },
  aspectClearBtn: {
    marginLeft: SPACING.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.neutral.gray[100],
  },
  aspectClearText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  binaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: 4,
  },
  binaryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.neutral.gray[100],
  },
  binaryChipActive: {
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[200],
  },
  binaryChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  binaryChipTextActive: {
    color: COLORS.primary[700],
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.background.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
    zIndex: 20,
    ...Platform.select({
      ios: SHADOWS.sm,
      android: { elevation: 8 },
      web: {
        position: 'sticky',
        bottom: 0,
        boxShadow: `0 -2px 8px ${withOpacity(COLORS.base.inkBlack, 0.06)}`,
      },
      default: {},
    }),
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[500],
    paddingVertical: 14,
    borderRadius: BORDERS.radius.pill,
    gap: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
      default: {},
    }),
  },
  submitButtonPressed: {
    opacity: 0.9,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.neutral.gray[300],
  },
  submitButtonText: {
    color: COLORS.text.onPrimary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default CreateReviewScreen;
