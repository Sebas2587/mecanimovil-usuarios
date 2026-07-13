import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, StatusBar } from 'react-native';
import { Headphones, Mail, MessageCircle, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, BORDERS, SPACING, SHADOWS, TYPOGRAPHY } from '../../design-system/tokens';

const SupportScreen = () => {
  const supportOptions = [
    {
      id: 'contact',
      title: 'Contactar Soporte',
      description: 'Habla directamente con nuestro equipo de soporte',
      Icon: Mail,
      action: () => Linking.openURL('mailto:soporte@mecanimovil.cl'),
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      description: 'Envíanos un mensaje por WhatsApp',
      Icon: MessageCircle,
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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeCard}>
          <Headphones size={60} color={COLORS.primary[500]} />
          <Text style={styles.welcomeTitle}>¿Necesitas ayuda?</Text>
          <Text style={styles.welcomeText}>
            Estamos aquí para ayudarte. Selecciona una opción para obtener la asistencia que necesitas.
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {supportOptions.map((option) => {
            const OptionIcon = option.Icon;
            return (
              <TouchableOpacity
                key={option.id}
                style={styles.optionCard}
                onPress={() => handleOptionPress(option)}
                activeOpacity={0.8}
              >
                <View style={styles.optionIcon}>
                  <OptionIcon size={22} color={COLORS.primary[600]} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <ChevronRight size={20} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  welcomeCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  welcomeTitle: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  welcomeText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    marginBottom: SPACING.lg,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  optionDescription: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
});

export default SupportScreen;
