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
    entrego_repuestos: null, // true/false/null
  });

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

  const setAspectValue = (key, value) => {
    setAspects((prev) => ({ ...prev, [key]: value }));
  };

  const renderAspectRow = (label, key, helpText) => (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.aspectLabel}>{label}</Text>
      {helpText ? <Text style={styles.aspectHelp}>{helpText}</Text> : null}
      <View style={styles.aspectStarsRow}>
        {[1, 2, 3, 4, 5].map((v) => (
          <TouchableOpacity
            key={`${key}-${v}`}
            style={styles.aspectStarBtn}
            onPress={() => setAspectValue(key, v)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={v <= (aspects[key] || 0) ? 'star' : 'star-outline'}
              size={22}
              color={v <= (aspects[key] || 0) ? '#60A5FA' : 'rgba(255,255,255,0.28)'}
            />
          </TouchableOpacity>
        ))}
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
    <View style={{ marginTop: 14 }}>
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
              style={[styles.binaryChip, active ? styles.binaryChipActive : styles.binaryChipIdle]}
              onPress={() => setAspectValue(key, opt.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.binaryChipText, active ? styles.binaryChipTextActive : styles.binaryChipTextIdle]}>
                {opt.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

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

        {/* Aspectos (alimentan KPIs) */}
        <View style={styles.card}>
          {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles-outline" size={20} color="#93C5FD" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Aspectos del servicio</Text>
          </View>
          <Text style={styles.aspectIntro}>
            Estos datos ayudan a que los mejores proveedores tengan más relevancia según su rendimiento reciente.
          </Text>

          {renderAspectRow('Puntualidad', 'puntualidad', '¿Llegó a tiempo?')}
          {!isMecanicoDomicilio
            ? renderAspectRow('Recepción / entrega a tiempo', 'recepcion_a_tiempo', 'Solo para talleres.')
            : null}
          {!isMecanicoDomicilio ? renderAspectRow('Auto limpio al entregar', 'limpieza_auto', 'Solo para talleres.') : null}
          {isMecanicoDomicilio ? renderAspectRow('Dejó limpia la zona', 'zona_limpia', 'Solo para domicilio.') : null}
          {renderBinaryRow('Entregó los repuestos al finalizar', 'entrego_repuestos')}
          {renderAspectRow('Claridad al explicar fallas/solución', 'claridad_explicacion')}
          {renderAspectRow('Información relevante y comunicación', 'informacion_relevante')}
          {renderAspectRow('Trato y educación', 'trato')}
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
  aspectIntro: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 18,
    marginBottom: 8,
  },
  aspectLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 6,
  },
  aspectHelp: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: -2,
    marginBottom: 6,
  },
  aspectStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  aspectStarBtn: {
    padding: 4,
    borderRadius: 10,
  },
  aspectClearBtn: {
    marginLeft: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  aspectClearText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
  },
  binaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  binaryChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  binaryChipActive: {
    backgroundColor: 'rgba(147,197,253,0.18)',
    borderColor: 'rgba(147,197,253,0.35)',
  },
  binaryChipIdle: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  binaryChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  binaryChipTextActive: {
    color: '#93C5FD',
  },
  binaryChipTextIdle: {
    color: 'rgba(255,255,255,0.6)',
  },
});

export default CreateReviewScreen; 