import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Clock, Zap } from 'lucide-react-native';
import { COLORS, BORDERS } from '../../design-system/tokens';
import ServicePhotosCarousel from '../provider/ServicePhotosCarousel';

/**
 * Bloque de paso 2: panel unificado de detalles + fotos y urgencia en 2 columnas.
 * Usa los mismos estilos que FormularioSolicitud (pasoContainer se aplica en el padre).
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
}) {
  const fotosProveedor = Array.isArray(servicioSeleccionado?.fotos_servicio)
    ? servicioSeleccionado.fotos_servicio
    : [];
  const tieneFotosProveedor = fotosProveedor.length > 0;

  const placeholderDetalles = sinVehiculoRegistrado
    ? 'Ej: Chevrolet Sail 2016, 145.000 km. Indica qué quieres revisar antes de comprar.'
    : 'Ej: Mi auto hace un ruido al frenar, necesito revisión de 60.000 km…';

  return (
    <>
      {childrenBeforeDetalles}

      <GlassCard style={styles.paso2DetallesCard}>
        {tieneFotosProveedor ? (
          <View style={styles.paso2FotosProveedorBlock}>
            <Text style={styles.descripcionLabel}>Fotos del servicio (proveedor)</Text>
            <ServicePhotosCarousel photos={fotosProveedor} height={120} />
            <View style={styles.paso2Divider} />
          </View>
        ) : null}

        <Text style={styles.descripcionLabel}>
          Detalles para el proveedor <Text style={styles.paso2Required}>*</Text>
        </Text>
        <Text style={styles.paso2DetallesHint}>
          Obligatorio. El proveedor usa esto para entender tu solicitud y preparar el trabajo.
        </Text>
        <TextInput
          style={styles.textArea}
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
          <View style={styles.paso2FotosUsuario}>
            {renderFotosNecesidadEditor(
              Array.isArray(formData.fotos_necesidad) ? formData.fotos_necesidad : [],
              (next) => setFormData((prev) => ({ ...prev, fotos_necesidad: next })),
            )}
          </View>
        ) : null}
      </GlassCard>

      <Text style={[styles.pasoTitle, styles.paso2UrgenciaTitle]}>¿Qué tan urgente es?</Text>
      <Text style={styles.pasoDescripcion}>Selecciona el nivel de urgencia del servicio</Text>

      <View style={styles.paso2UrgenciaRow}>
        <TouchableOpacity
          style={styles.paso2UrgenciaCol}
          onPress={() => setFormData((prev) => ({ ...prev, urgencia: 'normal' }))}
          activeOpacity={0.85}
        >
          <GlassCard
            style={[
              styles.paso2UrgenciaCard,
              formData.urgencia === 'normal' && styles.paso2UrgenciaCardActiveNormal,
            ]}
          >
            <View style={styles.paso2UrgenciaCardTop}>
              <View style={[styles.paso2UrgenciaIcon, { backgroundColor: COLORS.success[100] }]}>
                <Clock size={20} color={COLORS.success[600]} />
              </View>
              {formData.urgencia === 'normal' ? (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.success[600]} />
              ) : null}
            </View>
            <Text style={styles.opcionTitle}>Normal</Text>
            <Text style={styles.opcionDescripcion}>Puede esperar unos días</Text>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.paso2UrgenciaCol}
          onPress={() => setFormData((prev) => ({ ...prev, urgencia: 'urgente' }))}
          activeOpacity={0.85}
        >
          <GlassCard
            style={[
              styles.paso2UrgenciaCard,
              formData.urgencia === 'urgente' && styles.paso2UrgenciaCardActiveUrgent,
            ]}
          >
            <View style={styles.paso2UrgenciaCardTop}>
              <View style={[styles.paso2UrgenciaIcon, { backgroundColor: COLORS.warning.light }]}>
                <Zap size={20} color={COLORS.warning[600]} />
              </View>
              {formData.urgencia === 'urgente' ? (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.warning[600]} />
              ) : null}
            </View>
            <Text style={styles.opcionTitle}>Urgente</Text>
            <Text style={styles.opcionDescripcion}>Lo antes posible</Text>
          </GlassCard>
        </TouchableOpacity>
      </View>
    </>
  );
}
