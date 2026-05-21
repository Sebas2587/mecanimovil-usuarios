import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import CandidatosProveedorCard from './CandidatosProveedorCard';
import { resolveDistanciaKmCandidato } from '../../services/agendamientoAsistidoService';

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

function toCandidato(oferta, requiereRepuestos, userCoords) {
  const conRepuestos = requiereRepuestos !== false;
  const precioRep = oferta.precio_con_repuestos ?? oferta.precio_total_ofrecido;
  const precioSin = oferta.precio_sin_repuestos ?? oferta.precio_total_ofrecido;
  const p = oferta.proveedor || {};
  const fotoUrl =
    p.foto_perfil_url || p.foto_perfil
    || oferta.foto_perfil_url || oferta.proveedor_foto_url;
  const proveedor = {
    ...p,
    nombre: p.nombre || oferta.nombre_proveedor || oferta.proveedor_nombre || 'Proveedor',
    tipo: p.tipo || oferta.tipo_proveedor,
    rating: p.rating ?? oferta.rating_proveedor,
    proveedor_id: p.proveedor_id ?? oferta.proveedor_id,
    foto_perfil_url: fotoUrl,
    foto_perfil: p.foto_perfil || oferta.foto_perfil || fotoUrl,
  };
  return {
    ...oferta,
    proveedor,
    servicio: oferta.servicio || (oferta.servicios?.[0]
      ? { nombre: oferta.servicios[0].nombre }
      : null),
    servicios_ofrecidos: oferta.servicios_ofrecidos
      || (oferta.servicios?.length
        ? oferta.servicios.map((s) => ({
            id: s.id,
            nombre: s.nombre,
            precio: s.precio,
            oferta_servicio_id: s.oferta_servicio_id,
          }))
        : null),
    servicios_cubiertos: oferta.servicios_cubiertos,
    servicios_pedidos: oferta.servicios_pedidos,
    cobertura_pct: oferta.cobertura_pct,
    precio_total: oferta.precio_total ?? oferta.precio_total_ofrecido,
    oferta_servicio_ids: oferta.oferta_servicio_ids,
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
    distancia_km: resolveDistanciaKmCandidato(oferta, userCoords),
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
  userCoords = null,
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
    const candidato = toCandidato(oferta, requiereRepuestos, userCoords);
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
