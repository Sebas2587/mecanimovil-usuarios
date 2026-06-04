import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { FileText, Camera } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import ServicePhotosCarousel from '../provider/ServicePhotosCarousel';
import AddressSelector from '../forms/AddressSelector';
import SolicitudUrgenciaToggle from './SolicitudUrgenciaToggle';

/**
 * Paso 2: ubicación → preferencias → detalles + fotos.
 */
export default function SolicitudPaso2Contexto({
  formData,
  setFormData,
  sinVehiculoRegistrado,
  servicioSeleccionado,
  renderFotosNecesidadEditor,
  GlassCard,
  styles,
  childrenBeforeDetalles = null,
  preferenciasBlock = null,
  hideUrgencia = false,
  embedUbicacion = false,
}) {
  const fotosProveedor = Array.isArray(servicioSeleccionado?.fotos_servicio)
    ? servicioSeleccionado.fotos_servicio
    : [];
  const tieneFotosProveedor = fotosProveedor.length > 0;

  const placeholderDetalles = sinVehiculoRegistrado
    ? 'Ej: Chevrolet Sail 2016, 145.000 km. Indica qué quieres revisar antes de comprar.'
    : 'Ej: Mi auto hace un ruido al frenar, necesito revisión de 60.000 km…';

  const ubicacionBlock = embedUbicacion ? (
    <View style={paso2Styles.sectionWrap}>
      <AddressSelector
        currentAddress={formData.direccion_usuario}
        glassStyle
        autoSelectPrincipal
        onAddressChange={(direccion) => {
          setFormData((prev) => ({
            ...prev,
            direccion_usuario: direccion,
            direccion_servicio_texto: direccion?.direccion || '',
            ubicacion_servicio: direccion?.ubicacion || null,
          }));
        }}
      />
    </View>
  ) : null;

  return (
    <>
      {childrenBeforeDetalles}
      {ubicacionBlock}
      {preferenciasBlock}

      <View style={paso2Styles.sectionWrap}>
        <View style={paso2Styles.sectionHeaderRow}>
          <View style={paso2Styles.sectionIconWrap}>
            <FileText size={18} color={COLORS.primary[500]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={paso2Styles.sectionTitle}>
              Detalles para el proveedor <Text style={styles.paso2Required}>*</Text>
            </Text>
            <Text style={paso2Styles.sectionSubtitle}>
              Cuéntanos qué necesitas para que el proveedor entienda tu solicitud.
            </Text>
          </View>
        </View>

        <GlassCard style={paso2Styles.detallesCard}>
          {tieneFotosProveedor ? (
            <View style={paso2Styles.fotosProveedorBlock}>
              <Text style={paso2Styles.fieldLabel}>Fotos del servicio (proveedor)</Text>
              <ServicePhotosCarousel photos={fotosProveedor} height={120} />
              <View style={paso2Styles.hairline} />
            </View>
          ) : null}

          <Text style={paso2Styles.fieldLabel}>Descripción</Text>
          <TextInput
            style={paso2Styles.textArea}
            multiline
            numberOfLines={5}
            placeholder={placeholderDetalles}
            placeholderTextColor={COLORS.text.disabled}
            value={formData.descripcion_problema || ''}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, descripcion_problema: text || '' }))
            }
            textAlignVertical="top"
          />

          {typeof renderFotosNecesidadEditor === 'function' ? (
            <View style={paso2Styles.fotosUsuarioBlock}>
              <View style={paso2Styles.fotosUsuarioHeader}>
                <Camera size={16} color={COLORS.text.secondary} />
                <Text style={paso2Styles.fieldLabel}>Tus fotos (opcional)</Text>
              </View>
              <Text style={paso2Styles.fotosUsuarioHint}>
                Adjunta hasta 3 fotos para ayudar al proveedor a evaluar tu caso.
              </Text>
              {renderFotosNecesidadEditor(
                Array.isArray(formData.fotos_necesidad) ? formData.fotos_necesidad : [],
                (next) => setFormData((prev) => ({ ...prev, fotos_necesidad: next })),
                { hideLabel: true },
              )}
            </View>
          ) : null}
        </GlassCard>
      </View>

      {!hideUrgencia ? (
        <>
          <Text style={[styles.pasoTitle, styles.paso2UrgenciaTitle]}>¿Qué tan urgente es?</Text>
          <Text style={styles.pasoDescripcion}>Selecciona el nivel de urgencia del servicio</Text>
          <SolicitudUrgenciaToggle
            value={formData.urgencia || 'normal'}
            onChange={(urgencia) => setFormData((prev) => ({ ...prev, urgencia }))}
          />
        </>
      ) : null}
    </>
  );
}

const paso2Styles = StyleSheet.create({
  sectionWrap: {
    marginBottom: SPACING.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    lineHeight: 24,
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    color: COLORS.text.secondary,
  },
  detallesCard: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: 0,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  textArea: {
    minHeight: 112,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    borderRadius: BORDERS.radius.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.paper,
    ...SHADOWS.sm,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
    marginVertical: SPACING.md,
  },
  fotosProveedorBlock: {
    marginBottom: SPACING.xs,
  },
  fotosUsuarioBlock: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
  },
  fotosUsuarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  fotosUsuarioHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: 17,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
  },
});
