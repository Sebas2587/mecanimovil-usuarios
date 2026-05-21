import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Package } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import CandidatosProveedorCard from './CandidatosProveedorCard';

function sortPorDistancia(ofertas) {
  return [...ofertas].sort((a, b) => {
    const da = a.distancia_km;
    const db = b.distancia_km;
    if (da == null && db == null) return 0;
    if (da == null) return 1;
    if (db == null) return -1;
    return da - db;
  });
}

function toCandidato(oferta, requiereRepuestos) {
  const conRepuestos = requiereRepuestos !== false;
  const precioRep = oferta.precio_con_repuestos ?? oferta.precio_total_ofrecido;
  const precioSin = oferta.precio_sin_repuestos ?? oferta.precio_total_ofrecido;
  return {
    ...oferta,
    proveedor: oferta.proveedor || {
      nombre: oferta.nombre_proveedor || oferta.proveedor_nombre || 'Proveedor',
      tipo: oferta.tipo_proveedor,
      rating: oferta.rating_proveedor,
      proveedor_id: oferta.proveedor_id,
      foto_perfil_url: oferta.foto_perfil_url || oferta.proveedor_foto_url,
      foto_perfil: oferta.foto_perfil || oferta.proveedor_foto,
    },
    servicio: oferta.servicio || (oferta.servicios?.[0]
      ? { nombre: oferta.servicios[0].nombre }
      : null),
    desglose: oferta.desglose || {
      mano_obra: oferta.costo_mano_obra,
      repuestos: oferta.costo_repuestos,
      gestion: oferta.costo_gestion_compra,
      precio_publicado_cliente: conRepuestos ? precioRep : precioSin,
    },
    precio_con_repuestos: precioRep,
    precio_sin_repuestos: precioSin,
    incluye_repuestos_sugerido: conRepuestos,
    score_match: oferta.score_match,
    explicacion: oferta.explicacion,
    distancia_km: oferta.distancia_km,
    es_recomendado: oferta.es_recomendado,
    es_coincidencia_exacta: oferta.es_coincidencia_exacta,
    nivel_coincidencia: oferta.nivel_coincidencia,
  };
}

/**
 * Comparación de candidatos de catálogo: recomendados + otros en zona.
 */
export default function ComparadorCatalogoIaPanel({
  ofertas = [],
  ofertasRecomendadas,
  ofertasOtros = [],
  radioKm = 80,
  onAceptar,
  procesando = false,
  requiereRepuestos = true,
}) {
  const [confirmandoId, setConfirmandoId] = useState(null);

  const recomendadas = sortPorDistancia(
    Array.isArray(ofertasRecomendadas) && ofertasRecomendadas.length > 0
      ? ofertasRecomendadas
      : ofertas,
  );
  const otros = sortPorDistancia(Array.isArray(ofertasOtros) ? ofertasOtros : []);
  const radioLabel = radioKm != null ? Math.round(Number(radioKm)) : 80;

  const handleConfirmar = (oferta) => {
    const id = oferta.oferta_servicio_id || oferta.id;
    setConfirmandoId(id);
    onAceptar?.(oferta);
  };

  const renderOferta = (oferta, variant) => {
    const candidato = toCandidato(oferta, requiereRepuestos);
    const id = oferta.oferta_servicio_id || oferta.id;
    return (
      <CandidatosProveedorCard
        key={id}
        candidato={candidato}
        variant={variant}
        requiereRepuestos={requiereRepuestos !== false}
        onConfirmar={() => handleConfirmar(oferta)}
        procesando={procesando}
        confirmandoEsta={confirmandoId === id}
      />
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.contextPill}>
        <Package size={14} color={COLORS.primary[500]} />
        <Text style={styles.contextPillText}>
          {requiereRepuestos !== false
            ? 'Búsqueda y precios con repuestos (paso 2)'
            : 'Búsqueda y precios solo mano de obra (paso 2)'}
        </Text>
      </View>
      <Text style={styles.lead}>
        El proveedor confirma el servicio antes de pagar. Los candidatos coinciden con tu
        vehículo, servicio y ubicación.
      </Text>

      {recomendadas.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coincidencia exacta</Text>
          <Text style={styles.sectionSub}>
            Mejor ajuste a tu servicio, vehículo y dirección.
          </Text>
          <View style={styles.cardList}>
            {recomendadas.map((oferta) => renderOferta(oferta, 'recomendado'))}
          </View>
        </View>
      ) : null}

      {otros.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Otros proveedores</Text>
          <Text style={styles.sectionSub}>
            Mismo servicio con coincidencia parcial, dentro de {radioLabel} km cuando aplica.
          </Text>
          <View style={styles.cardList}>
            {otros.map((oferta) => renderOferta(oferta, 'otro'))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 0,
  },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    marginBottom: 12,
  },
  contextPillText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[800],
    lineHeight: 18,
  },
  lead: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: 12,
    lineHeight: 19,
  },
  cardList: {
    gap: 14,
  },
});
