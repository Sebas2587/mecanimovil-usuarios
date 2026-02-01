import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { post } from '../../services/api';
import { COLORS } from '../../utils/constants';

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
      headerTintColor: COLORS.primary,
      headerTitleStyle: {
        fontWeight: 'bold',
        color: COLORS.text,
      },
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información del servicio */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="receipt-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
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
                  <Ionicons name="person" size={20} color={COLORS.textLight} />
                </View>
              )}
              <View>
                <Text style={styles.providerName}>{service.provider.provider_name}</Text>
                <Text style={styles.serviceName}>{service.service_name}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Ionicons name="car-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.detailText}>{service.vehicle.full_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.detailText}>Completado el {new Date(service.completion_date).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>

        {/* Calificación */}
        <View style={styles.card}>
          <Text style={styles.sectionTitleCenter}>¿Cómo calificarías el servicio?</Text>
          {renderStars()}
          <Text style={[styles.ratingText, { color: rating > 0 ? COLORS.warning : COLORS.textLight }]}>
            {getRatingText()}
          </Text>
        </View>

        {/* Comentario */}
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Cuéntanos tu experiencia (opcional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="¿Qué te pareció el servicio? ¿El tiempo de espera fue adecuado?"
            placeholderTextColor={COLORS.textLight}
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
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="send" size={16} color="white" />
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
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
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
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  serviceName: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  sectionTitleCenter: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
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
    color: COLORS.text,
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 120,
    marginBottom: 8,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'right',
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CreateReviewScreen; 