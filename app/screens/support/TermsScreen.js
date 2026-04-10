import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, StatusBar } from 'react-native';
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

const TermsScreen = () => {
  const termsContent = [
    {
      title: '1. Aceptación de los Términos',
      content: 'Al registrarse y utilizar la aplicación MecaniMóvil, el usuario acepta estos Términos y Condiciones. Si no está de acuerdo con alguna de sus disposiciones, debe abstenerse de utilizar la plataforma y sus servicios asociados.',
    },
    {
      title: '2. Objeto y Naturaleza del Servicio',
      content: 'MecaniMóvil es una plataforma digital de intermediación que conecta clientes con talleres y mecánicos para la contratación de servicios automotrices. El uso de la plataforma no constituye relación laboral entre MecaniMóvil y los prestadores de servicios publicados en la aplicación.',
    },
    {
      title: '3. Derechos del Consumidor (Ley N. 19.496)',
      content: 'El cliente podrá ejercer los derechos reconocidos en la Ley sobre Protección de los Derechos de los Consumidores (Ley N. 19.496), incluyendo información veraz y oportuna, trato no discriminatorio, seguridad en el consumo, reparación e indemnización cuando corresponda, y acceso a mecanismos de reclamo ante el proveedor respectivo.',
    },
    {
      title: '4. Cláusula de Responsabilidad',
      content: 'El Usuario, en adelante "cliente", tendrá la libertad de ejercer los derechos previstos por la Ley sobre Protección de los Derechos de los Consumidores (Ley N. 19.496) respecto a los servicios prestados. MecaníMovil SPA actúa como intermediario entre el cliente, los talleres y mecánicos, seleccionando profesionales evaluados para promover un servicio confiable.',
    },
    {
      title: '5. Alcance de la Intermediación',
      content: 'MecaniMóvil facilita la publicación, comparación, coordinación y seguimiento de servicios. La ejecución material del trabajo, los tiempos técnicos, garantías mecánicas y resultados específicos del servicio son de responsabilidad del taller o mecánico que acepta la solicitud del cliente.',
    },
    {
      title: '6. Precios, Cotizaciones y Pago',
      content: 'Los precios y cotizaciones informados en la plataforma pueden ser referenciales hasta su confirmación por el prestador. El cliente acepta revisar el detalle del servicio antes de pagar. Cualquier cobro indebido o diferencia relevante deberá reclamarse por los canales de soporte y, en su caso, ante el proveedor que emitió la cotización.',
    },
    {
      title: '7. Cancelaciones, Reprogramaciones y Retracto',
      content: 'Las condiciones de cancelación o reprogramación dependerán del estado de la solicitud y de las reglas informadas por el prestador. Cuando proceda legalmente, el cliente podrá ejercer los derechos de retracto u otros derechos establecidos en la Ley N. 19.496, considerando la naturaleza y etapa de ejecución del servicio contratado.',
    },
    {
      title: '8. Obligaciones del Usuario',
      content: 'El cliente se obliga a entregar información veraz del vehículo, falla reportada, dirección y datos de contacto; a respetar a los prestadores; y a utilizar la plataforma de buena fe. El uso fraudulento, suplantación o manipulación del sistema podrá implicar suspensión o cierre de la cuenta.',
    },
    {
      title: '9. Protección de Datos Personales',
      content: 'MecaniMóvil tratará los datos personales del cliente conforme a la normativa chilena aplicable, utilizándolos para la operación del servicio, soporte, seguridad y mejora de la experiencia. El cliente podrá solicitar actualización o rectificación de sus datos por los canales oficiales de soporte.',
    },
    {
      title: '10. Modificaciones de los Términos',
      content: 'MecaniMóvil podrá actualizar estos Términos y Condiciones para ajustarlos a cambios legales, regulatorios o de operación de la plataforma. Las nuevas versiones se publicarán en la aplicación y entrarán en vigencia desde su publicación, salvo que se indique una fecha distinta.',
    },
    {
      title: '11. Canal de Contacto y Reclamos',
      content: 'Para consultas, soporte y reclamos, el cliente puede comunicarse a soporte@mecanimovil.cl o por WhatsApp al +56995945258. En caso de controversias de consumo, el cliente mantiene su derecho de acudir a las instancias contempladas por la legislación chilena.',
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
              Si tiene alguna pregunta sobre estos términos, no dude en contactar a nuestro equipo de soporte en soporte@mecanimovil.cl o por WhatsApp al +56995945258.
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
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  /** Web: altura acotada para que el ScrollView no crezca con el contenido y permita scroll vertical. */
  scrollContainer: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
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