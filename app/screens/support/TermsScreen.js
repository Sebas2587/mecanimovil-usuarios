import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS, SPACING, SHADOWS } from '../../design-system/tokens';

const TermsScreen = () => {
  const termsContent = [
    {
      title: '1. Aceptación de los Términos',
      content:
        'Al registrarse y utilizar la aplicación MecaniMóvil, el usuario acepta estos Términos y Condiciones. Si no está de acuerdo con alguna de sus disposiciones, debe abstenerse de utilizar la plataforma y sus servicios asociados.',
    },
    {
      title: '2. Objeto y Naturaleza del Servicio',
      content:
        'MecaniMóvil es una plataforma digital de intermediación que conecta clientes con talleres y mecánicos para la contratación de servicios automotrices. El uso de la plataforma no constituye relación laboral entre MecaniMóvil y los prestadores de servicios publicados en la aplicación.',
    },
    {
      title: '3. Derechos del Consumidor (Ley N. 19.496)',
      content:
        'El cliente podrá ejercer los derechos reconocidos en la Ley sobre Protección de los Derechos de los Consumidores (Ley N. 19.496), incluyendo información veraz y oportuna, trato no discriminatorio, seguridad en el consumo, reparación e indemnización cuando corresponda, y acceso a mecanismos de reclamo ante el proveedor respectivo.',
    },
    {
      title: '4. Cláusula de Responsabilidad',
      content:
        'El Usuario, en adelante "cliente", tendrá la libertad de ejercer los derechos previstos por la Ley sobre Protección de los Derechos de los Consumidores (Ley N. 19.496) respecto a los servicios prestados. MecaníMovil SPA actúa como intermediario entre el cliente, los talleres y mecánicos, seleccionando profesionales evaluados para promover un servicio confiable.',
    },
    {
      title: '5. Alcance de la Intermediación',
      content:
        'MecaniMóvil facilita la publicación, comparación, coordinación y seguimiento de servicios. La ejecución material del trabajo, los tiempos técnicos, garantías mecánicas y resultados específicos del servicio son de responsabilidad del taller o mecánico que acepta la solicitud del cliente.',
    },
    {
      title: '6. Precios, Cotizaciones y Pago',
      content:
        'Los precios y cotizaciones informados en la plataforma pueden ser referenciales hasta su confirmación por el prestador. El cliente acepta revisar el detalle del servicio antes de pagar. Cualquier cobro indebido o diferencia relevante deberá reclamarse por los canales de soporte y, en su caso, ante el proveedor que emitió la cotización.',
    },
    {
      title: '7. Cancelaciones, Reprogramaciones y Retracto',
      content:
        'Las condiciones de cancelación o reprogramación dependerán del estado de la solicitud y de las reglas informadas por el prestador. Cuando proceda legalmente, el cliente podrá ejercer los derechos de retracto u otros derechos establecidos en la Ley N. 19.496, considerando la naturaleza y etapa de ejecución del servicio contratado.',
    },
    {
      title: '8. Obligaciones del Usuario',
      content:
        'El cliente se obliga a entregar información veraz del vehículo, falla reportada, dirección y datos de contacto; a respetar a los prestadores; y a utilizar la plataforma de buena fe. El uso fraudulento, suplantación o manipulación del sistema podrá implicar suspensión o cierre de la cuenta.',
    },
    {
      title: '9. Protección de Datos Personales',
      content:
        'MecaniMóvil tratará los datos personales del cliente conforme a la normativa chilena aplicable, utilizándolos para la operación del servicio, soporte, seguridad y mejora de la experiencia. El cliente podrá solicitar actualización o rectificación de sus datos por los canales oficiales de soporte.',
    },
    {
      title: '10. Modificaciones de los Términos',
      content:
        'MecaniMóvil podrá actualizar estos Términos y Condiciones para ajustarlos a cambios legales, regulatorios o de operación de la plataforma. Las nuevas versiones se publicarán en la aplicación y entrarán en vigencia desde su publicación, salvo que se indique una fecha distinta.',
    },
    {
      title: '11. Canal de Contacto y Reclamos',
      content:
        'Para consultas, soporte y reclamos, el cliente puede comunicarse a soporte@mecanimovil.cl o por WhatsApp al +56995945258. En caso de controversias de consumo, el cliente mantiene su derecho de acudir a las instancias contempladas por la legislación chilena.',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.introCard}>
          <Ionicons name="document-text-outline" size={48} color={COLORS.primary[500]} />
          <Text style={styles.introTitle}>Términos y Condiciones de Uso</Text>
          <Text style={styles.introText}>Última actualización: Enero 2025</Text>
        </View>

        <View style={styles.termsCard}>
          {termsContent.map((section, index) => (
            <View key={index} style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionContent}>{section.content}</Text>
            </View>
          ))}

          <View style={styles.additionalInfo}>
            <Text style={styles.additionalTitle}>Información Importante</Text>
            <Text style={styles.additionalText}>
              Al continuar usando MecaniMóvil, usted acepta estos términos y condiciones en su totalidad. Si tiene
              alguna pregunta sobre estos términos, no dude en contactar a nuestro equipo de soporte en
              soporte@mecanimovil.cl o por WhatsApp al +56995945258.
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
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  scrollContainer: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  introCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: 24,
    marginBottom: 20,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  termsCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: 20,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  sectionContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  additionalInfo: {
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.md,
    padding: 16,
    marginTop: 8,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
  },
  additionalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary[700],
    marginBottom: 8,
  },
  additionalText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
});

export default TermsScreen;
