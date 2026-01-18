import React, { useState } from 'react';
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
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Dejar Reseña</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información del servicio */}
        <View style={styles.serviceCard}>
          <Text style={styles.serviceTitle}>Servicio Completado</Text>
          <Text style={styles.providerName}>{service.provider.provider_name}</Text>
          <Text style={styles.serviceName}>{service.service_name}</Text>
          <Text style={styles.vehicleInfo}>
            Vehículo: {service.vehicle.full_name}
          </Text>
          <Text style={styles.completionDate}>
            Completado: {new Date(service.completion_date).toLocaleDateString()}
          </Text>
        </View>

        {/* Calificación */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>¿Cómo calificarías el servicio?</Text>
          {renderStars()}
          <Text style={styles.ratingText}>{getRatingText()}</Text>
        </View>

        {/* Comentario */}
        <View style={styles.commentSection}>
          <Text style={styles.sectionTitle}>Comentario (opcional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Comparte tu experiencia con este proveedor..."
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceTitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
  },
  vehicleInfo: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  completionDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  ratingSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
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
    color: COLORS.primary,
    textAlign: 'center',
  },
  commentSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 100,
    marginBottom: 8,
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