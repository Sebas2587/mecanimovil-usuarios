import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { post } from '../../services/api';
import { COLORS } from '../../utils/constants';

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

const CreateReviewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { service } = route.params;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Dejar Reseña',
      headerShown: true,
      headerBackTitleVisible: false,
      headerTintColor: '#F9FAFB',
      headerTitleStyle: { fontWeight: '700', color: '#F9FAFB' },
    });
  }, [navigation]);

  const handleRatingPress = (selectedRating) => {
    setRating(selectedRating);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Por favor selecciona una calificación');
      return;
    }

    try {
      setSubmitting(true);

      const reviewData = {
        service_order_id: service.service_order_id,
        rating: rating,
        comment: comment.trim()
      };

      // Determinar el provider_id basado en el tipo de proveedor
      const providerId = service.provider.provider_id;

      await post(`/usuarios/providers/${providerId}/reviews/`, reviewData);

      Alert.alert(
        '¡Reseña enviada!',
        'Gracias por compartir tu experiencia. Tu reseña ayudará a otros usuarios.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error al enviar reseña:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo enviar la reseña. Intenta de nuevo.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            style={styles.starButton}
            onPress={() => handleRatingPress(star)}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={32}
              color={star <= rating ? "#FFD700" : "#E0E0E0"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingText = () => {
    const ratingTexts = {
      1: 'Muy malo',
      2: 'Malo',
      3: 'Regular',
      4: 'Bueno',
      5: 'Excelente'
    };
    return ratingTexts[rating] || 'Selecciona una calificación';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.08)' }} />
        <View style={{ position: 'absolute', top: 340, left: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(99,102,241,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -50, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(6,182,212,0.05)' }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información del servicio */}
        <View style={styles.card}>
          {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
          <View style={styles.cardHeader}>
            <Ionicons name="receipt-outline" size={20} color="#93C5FD" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Detalles del Servicio</Text>
          </View>

          <View style={styles.serviceInfoContainer}>
            <View style={styles.providerRow}>
              {service.provider.provider_photo ? (
                <Image
                  source={{ uri: service.provider.provider_photo }}
                  style={styles.providerAvatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.providerPlaceholder}>
                  <Ionicons name="person" size={20} color="rgba(255,255,255,0.5)" />
                </View>
              )}
              <View>
                <Text style={styles.providerName}>{service.provider.provider_name}</Text>
                <Text style={styles.serviceName}>{service.service_name}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Ionicons name="car-outline" size={16} color="rgba(255,255,255,0.5)" />
              <Text style={styles.detailText}>{service.vehicle.full_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.5)" />
              <Text style={styles.detailText}>Completado el {new Date(service.completion_date).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>

        {/* Calificación */}
        <View style={styles.card}>
          {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
          <Text style={styles.sectionTitleCenter}>¿Cómo calificarías el servicio?</Text>
          {renderStars()}
          <Text style={[styles.ratingText, { color: rating > 0 ? '#FBBF24' : 'rgba(255,255,255,0.45)' }]}>
            {getRatingText()}
          </Text>
        </View>

        {/* Comentario */}
        <View style={styles.card}>
          {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
          <Text style={styles.inputLabel}>Cuéntanos tu experiencia (opcional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="¿Qué te pareció el servicio? ¿El tiempo de espera fue adecuado?"
            placeholderTextColor={'rgba(255,255,255,0.35)'}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {comment.length}/500 caracteres
          </Text>
        </View>
      </ScrollView>

      {/* Botón de envío */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (rating === 0 || submitting) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#F9FAFB" />
          ) : (
            <>
              <Ionicons name="send" size={16} color="#F9FAFB" />
              <Text style={styles.submitButtonText}>Enviar Reseña</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  card: {
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  serviceInfoContainer: {
    gap: 12,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  providerPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  serviceName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  sectionTitleCenter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 16,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
    marginHorizontal: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(3,7,18,0.55)' : 'rgba(3,7,18,0.75)',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#F9FAFB',
    minHeight: 120,
    marginBottom: 8,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  characterCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'right',
  },
  footer: {
    padding: 16,
    backgroundColor: GLASS_BG,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: GLASS_BORDER,
    borderRightColor: GLASS_BORDER,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007EA7',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.25)',
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  submitButtonText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CreateReviewScreen; 