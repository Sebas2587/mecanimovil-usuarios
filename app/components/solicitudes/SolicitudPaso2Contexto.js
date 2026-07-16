import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { Camera } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import ServicePhotosCarousel from '../provider/ServicePhotosCarousel';
import AddressSelector from '../forms/AddressSelector';
import SolicitudUrgenciaToggle from './SolicitudUrgenciaToggle';

/**
 * Paso 2: ubicación → preferencias → detalles + fotos.
 * Bloque detalles: editorial Airbnb (sin GlassCard / sombra / radio 24).
 */
export default function SolicitudPaso2Contexto({
  formData,
  setFormData,
  sinVehiculoRegistrado,
  servicioSeleccionado,
  renderFotosNecesidadEditor,
  GlassCard: _GlassCard,
  styles,
  childrenBeforeDetalles = null,
  preferenciasBlock = null,
  hideUrgencia = false,
  embedUbicacion = false,
  descripcionError = null,
  onDescripcionEdited = null,
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
        <Text style={paso2Styles.sectionTitle}>
          Detalles para el proveedor <Text style={styles.paso2Required}>*</Text>
        </Text>
        <Text style={paso2Styles.sectionSubtitle}>
          Cuéntanos qué necesitas para que el proveedor entienda tu solicitud.
        </Text>

        <View style={paso2Styles.fields}>
          {tieneFotosProveedor ? (
            <View style={paso2Styles.fotosProveedorBlock}>
              <Text style={paso2Styles.fieldLabel}>Fotos del servicio (proveedor)</Text>
              <ServicePhotosCarousel photos={fotosProveedor} height={120} />
            </View>
          ) : null}

          <View style={paso2Styles.fieldBlock}>
            <TextInput
              style={[
                paso2Styles.textArea,
                descripcionError ? paso2Styles.textAreaError : null,
              ]}
              multiline
              numberOfLines={5}
              placeholder={placeholderDetalles}
              placeholderTextColor={COLORS.text.disabled}
              value={formData.descripcion_problema || ''}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, descripcion_problema: text || '' }));
                if (typeof onDescripcionEdited === 'function') onDescripcionEdited(text);
              }}
              textAlignVertical="top"
              accessibilityLabel="Descripción del problema"
            />
            {descripcionError ? (
              <Text style={paso2Styles.fieldError} accessibilityLiveRegion="polite">
                {descripcionError}
              </Text>
            ) : null}
          </View>

          {typeof renderFotosNecesidadEditor === 'function' ? (
            <View style={paso2Styles.fotosUsuarioBlock}>
              <View style={paso2Styles.fotosUsuarioHeader}>
                <Camera size={16} color={COLORS.icon.default} strokeWidth={2} />
                <Text style={[paso2Styles.fieldLabel, paso2Styles.fieldLabelInline]}>
                  Tus fotos (opcional)
                </Text>
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
        </View>
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
  sectionTitle: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.text.primary,
    marginBottom: SPACING.xxs,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  fields: {
    gap: SPACING.md,
  },
  fieldBlock: {
    gap: SPACING.xs,
  },
  fieldLabel: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
  },
  fieldLabelInline: {
    marginBottom: 0,
  },
  textArea: {
    minHeight: 112,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.paper,
    ...(Platform.OS === 'web'
      ? {
          outlineStyle: 'none',
          outlineWidth: 0,
          boxShadow: 'none',
        }
      : null),
  },
  textAreaError: {
    borderColor: COLORS.error.main,
    backgroundColor: COLORS.error.light,
  },
  fieldError: {
    marginTop: SPACING.xxs,
    ...TYPOGRAPHY.styles.small,
    color: COLORS.error.main,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  fotosProveedorBlock: {
    gap: SPACING.xs,
  },
  fotosUsuarioBlock: {
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
    gap: SPACING.xs,
  },
  fotosUsuarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fotosUsuarioHint: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
    lineHeight: 17,
    marginBottom: SPACING.xs,
  },
});
