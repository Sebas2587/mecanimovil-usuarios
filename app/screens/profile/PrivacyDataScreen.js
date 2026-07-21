import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Share2 } from 'lucide-react-native';
import {
  exportMyData,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../services/privacyService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '../../design-system/tokens';
import Button from '../../components/base/Button/Button';
import ProfileMenuSection from '../../components/profile/ProfileMenuSection';
import ProfileMenuItem from '../../components/profile/ProfileMenuItem';
import { ROUTES } from '../../utils/constants';
import { showAlert } from '../../utils/platformAlert';
import { useNavigation } from '@react-navigation/native';

const PrivacyDataScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [prefs, setPrefs] = useState({
    push_operativo: true,
    push_marketing: false,
    email_marketing: false,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const loadPrefs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotificationPreferences();
      setPrefs({
        push_operativo: data.push_operativo !== false,
        push_marketing: !!data.push_marketing,
        email_marketing: !!data.email_marketing,
      });
    } catch {
      /* defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrefs();
  }, [loadPrefs]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const data = await exportMyData();
      const json = JSON.stringify(data, null, 2);
      if (typeof navigator !== 'undefined' && navigator.share) {
        const blob = new Blob([json], { type: 'application/json' });
        const file = new File([blob], `mecanimovil-mis-datos-${Date.now()}.json`, {
          type: 'application/json',
        });
        await navigator.share({ files: [file], title: 'Mis datos MecaniMóvil' });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        showAlert('Datos copiados', 'El export JSON quedó en el portapapeles.');
      } else {
        showAlert('Export listo', 'Tus datos fueron preparados. Revisa la consola de desarrollo.');
        console.log('[privacy-export]', data);
      }
    } catch (e) {
      showAlert('Error', e?.response?.data?.error || e?.message || 'No se pudo exportar.');
    } finally {
      setExporting(false);
    }
  }, []);

  const togglePref = useCallback(async (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSavingPrefs(true);
    try {
      await updateNotificationPreferences({ [key]: value });
    } catch {
      setPrefs(prefs);
      showAlert('Error', 'No se pudieron guardar las preferencias.');
    } finally {
      setSavingPrefs(false);
    }
  }, [prefs]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.intro}>
        Ejerce tus derechos ARCOP: accede, exporta y configura cómo te contactamos.
      </Text>

      <Button
        title={exporting ? 'Preparando export…' : 'Exportar mis datos (JSON)'}
        onPress={handleExport}
        fullWidth
        disabled={exporting}
        iconNode={<Share2 size={18} color={COLORS.text.inverse} />}
        style={styles.exportBtn}
      />

      <Text style={styles.sectionTitle}>Preferencias de comunicación</Text>
      <View style={styles.prefRow}>
        <View style={styles.prefCopy}>
          <Text style={styles.prefLabel}>Notificaciones operativas</Text>
          <Text style={styles.prefHint}>Órdenes, citas y mensajes del servicio</Text>
        </View>
        <Switch
          value={prefs.push_operativo}
          onValueChange={(v) => togglePref('push_operativo', v)}
          disabled={savingPrefs}
        />
      </View>
      <View style={styles.prefRow}>
        <View style={styles.prefCopy}>
          <Text style={styles.prefLabel}>Promociones push</Text>
          <Text style={styles.prefHint}>Ofertas y novedades comerciales</Text>
        </View>
        <Switch
          value={prefs.push_marketing}
          onValueChange={(v) => togglePref('push_marketing', v)}
          disabled={savingPrefs}
        />
      </View>
      <View style={styles.prefRow}>
        <View style={styles.prefCopy}>
          <Text style={styles.prefLabel}>Email comercial</Text>
          <Text style={styles.prefHint}>Comunicaciones de marketing por correo</Text>
        </View>
        <Switch
          value={prefs.email_marketing}
          onValueChange={(v) => togglePref('email_marketing', v)}
          disabled={savingPrefs}
        />
      </View>

      <ProfileMenuSection title="CUENTA">
        <ProfileMenuItem
          icon="trash-outline"
          label="Eliminar cuenta"
          isLast
          onPress={() => navigation.navigate(ROUTES.DELETE_ACCOUNT)}
        />
      </ProfileMenuSection>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.container.horizontal,
    paddingBottom: SPACING.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  exportBtn: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border?.default || '#E5E7EB',
  },
  prefCopy: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  prefLabel: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
  },
  prefHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
});

export default PrivacyDataScreen;
