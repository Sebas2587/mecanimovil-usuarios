import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../utils/constants';

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.08)' }} />
        <View style={{ position: 'absolute', top: 360, left: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(99,102,241,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -50, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(6,182,212,0.05)' }} />
      </View>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Introducción */}
        <View style={styles.introCard}>
          {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
          <Ionicons name="document-text-outline" size={48} color="#93C5FD" />
          <Text style={styles.introTitle}>Términos y Condiciones de Uso</Text>
          <Text style={styles.introText}>
            Última actualización: Enero 2025
          </Text>
        </View>

        {/* Contenido de términos */}
        <View style={styles.termsCard}>
          {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  introCard: {
    alignItems: 'center',
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
  },
  introTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  termsCard: {
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
  },
  sectionContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
  },
  additionalInfo: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(147,197,253,0.08)' : 'rgba(147,197,253,0.10)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.18)',
  },
  additionalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#93C5FD',
    marginBottom: 8,
  },
  additionalText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
  },
});

export default TermsScreen; 