import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, Linking, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

const SupportScreen = () => {
  const navigation = useNavigation();

  const supportOptions = [
    {
      id: 'faq',
      title: 'Preguntas Frecuentes',
      description: 'Encuentra respuestas a las preguntas más comunes',
      icon: 'help-circle-outline',
      action: () => console.log('FAQ seleccionado'),
    },
    {
      id: 'contact',
      title: 'Contactar Soporte',
      description: 'Habla directamente con nuestro equipo de soporte',
      icon: 'mail-outline',
      action: () => Linking.openURL('mailto:soporte@mecanimovil.com'),
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      description: 'Envíanos un mensaje por WhatsApp',
      icon: 'logo-whatsapp',
      action: () => Linking.openURL('https://wa.me/+1234567890'),
    },
    {
      id: 'phone',
      title: 'Llamar',
      description: 'Llámanos directamente',
      icon: 'call-outline',
      action: () => Linking.openURL('tel:+1234567890'),
    },
  ];

  const handleOptionPress = (option) => {
    if (option.action) {
      option.action();
    }
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+56912345678');
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:soporte@mecanimovil.com');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Sección de bienvenida */}
        <View style={styles.welcomeCard}>
          <Ionicons name="headset-outline" size={60} color={COLORS.primary} />
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
                <Ionicons name={option.icon} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Información de contacto */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Información de Contacto</Text>
          
          <TouchableOpacity style={styles.contactItem} onPress={handleEmailSupport}>
            <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
            <Text style={styles.contactText}>soporte@mecanimovil.com</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.contactItem} onPress={handleCallSupport}>
            <Ionicons name="call-outline" size={20} color={COLORS.primary} />
            <Text style={styles.contactText}>+56 9 1234 5678</Text>
          </TouchableOpacity>
          
          <View style={styles.contactItem}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <Text style={styles.contactText}>Lunes a Viernes: 9:00 - 18:00</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeCard: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  contactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contactText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
  },
});

export default SupportScreen; 