import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Linking, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

const SupportScreen = () => {
  const navigation = useNavigation();

  const supportOptions = [
    {
      id: 'contact',
      title: 'Contactar Soporte',
      description: 'Habla directamente con nuestro equipo de soporte',
      icon: 'mail-outline',
      action: () => Linking.openURL('mailto:soporte@mecanimovil.cl'),
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      description: 'Envíanos un mensaje por WhatsApp',
      icon: 'logo-whatsapp',
      action: () => Linking.openURL('https://wa.me/56995945258'),
    },
  ];

  const handleOptionPress = (option) => {
    if (option.action) {
      option.action();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.08)' }} />
        <View style={{ position: 'absolute', top: 360, left: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(99,102,241,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -50, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(6,182,212,0.05)' }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Sección de bienvenida */}
        <View style={styles.welcomeCard}>
          {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
          <Ionicons name="headset-outline" size={60} color="#93C5FD" />
          <Text style={styles.welcomeTitle}>¿Necesitas ayuda?</Text>
          <Text style={styles.welcomeText}>
            Estamos aquí para ayudarte. Selecciona una opción para obtener la asistencia que necesitas.
          </Text>
        </View>

        {/* Opciones de soporte */}
        <View style={styles.optionsContainer}>
          {supportOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => handleOptionPress(option)}
              activeOpacity={0.8}
            >
              <View style={styles.optionIcon}>
                {Platform.OS === 'ios' && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
                <Ionicons name={option.icon} size={22} color="#6EE7B7" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.35)" />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  welcomeCard: {
    alignItems: 'center',
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GLASS_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(147,197,253,0.14)' : 'rgba(147,197,253,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.22)',
    overflow: 'hidden',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
});

export default SupportScreen; 