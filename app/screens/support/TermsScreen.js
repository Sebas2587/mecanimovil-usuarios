import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

const TermsScreen = () => {
  const navigation = useNavigation();

  const termsContent = [
    {
      title: '1. Aceptación de los Términos',
      content: 'Al utilizar la aplicación MecaniMóvil, usted acepta estar sujeto a estos términos y condiciones de uso. Si no está de acuerdo con alguno de estos términos, no debe utilizar nuestra aplicación.',
    },
    {
      title: '2. Descripción del Servicio',
      content: 'MecaniMóvil es una plataforma que conecta a usuarios con talleres mecánicos y mecánicos a domicilio para servicios automotrices. Facilitamos la comunicación y coordinación entre las partes, pero no somos responsables de la calidad del servicio prestado.',
    },
    {
      title: '3. Registro de Usuario',
      content: 'Para utilizar ciertos servicios de la aplicación, debe registrarse y crear una cuenta. Usted es responsable de mantener la confidencialidad de su información de cuenta y de todas las actividades que ocurran bajo su cuenta.',
    },
    {
      title: '4. Uso Aceptable',
      content: 'Usted se compromete a utilizar la aplicación únicamente para fines legales y de acuerdo con estos términos. No debe usar la aplicación de manera que pueda dañar, deshabilitar o sobrecargar nuestros servidores.',
    },
    {
      title: '5. Privacidad',
      content: 'Su privacidad es importante para nosotros. Nuestra Política de Privacidad explica cómo recopilamos, usamos y protegemos su información cuando utiliza nuestros servicios.',
    },
    {
      title: '6. Limitación de Responsabilidad',
      content: 'MecaniMóvil no será responsable por daños directos, indirectos, incidentales, especiales o consecuentes que resulten del uso o la imposibilidad de usar nuestros servicios.',
    },
    {
      title: '7. Modificaciones',
      content: 'Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación en la aplicación.',
    },
    {
      title: '8. Contacto',
      content: 'Si tiene preguntas sobre estos términos y condiciones, puede contactarnos a través de soporte@mecanimovil.com',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Introducción */}
        <View style={styles.introCard}>
          <Ionicons name="document-text-outline" size={48} color={COLORS.primary} />
          <Text style={styles.introTitle}>Términos y Condiciones de Uso</Text>
          <Text style={styles.introText}>
            Última actualización: Enero 2025
          </Text>
        </View>

        {/* Contenido de términos */}
        <View style={styles.termsCard}>
          {termsContent.map((section, index) => (
            <View key={index} style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionContent}>{section.content}</Text>
            </View>
          ))}
          
          {/* Información adicional */}
          <View style={styles.additionalInfo}>
            <Text style={styles.additionalTitle}>Información Importante</Text>
            <Text style={styles.additionalText}>
              Al continuar usando MecaniMóvil, usted acepta estos términos y condiciones en su totalidad. 
              Si tiene alguna pregunta sobre estos términos, no dude en contactar a nuestro equipo de soporte.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  introCard: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
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
  introTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  termsCard: {
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
  sectionContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  additionalInfo: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  additionalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  additionalText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
});

export default TermsScreen; 