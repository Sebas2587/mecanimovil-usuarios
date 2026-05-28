import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import CandidatosProveedorCard from './CandidatosProveedorCard';
import ComparadorCandidatosCatalogoModal from './ComparadorCandidatosCatalogoModal';
import { resolveDistanciaKmCandidato } from '../../services/agendamientoAsistidoService';
import { PROVIDER_RECOMMENDATION_MAX_KM } from '../../utils/exploreProviderUtils';
import {
  computeMatchDisplayPct,
  getCandidatoCatalogoKey,
} from '../../utils/catalogoComparadorScoring';
import {
  getCoberturaMarcaBadge,
  partitionOfertasPorCoberturaMarca,
  tituloGrupoEspecialistas,
  subtituloGrupoEspecialistas,
  tituloGrupoMultimarca,
  subtituloGrupoMultimarca,
} from '../../utils/catalogoComparadorCobertura';
import ComparadorCatalogoCoberturaGrupo from './ComparadorCatalogoCoberturaGrupo';
import ProveedorCoberturaMarcaChip from './ProveedorCoberturaMarcaChip';

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
    tipo_cobertura_marca: p.tipo_cobertura_marca ?? oferta.tipo_cobertura_marca,
    foto_perfil_url: fotoUrl,
    foto_perfil: p.foto_perfil || oferta.foto_perfil || fotoUrl,
  };
  const distancia_km = resolveDistanciaKmCandidato(oferta, userCoords);
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
    distancia_km,
    es_recomendado: oferta.es_recomendado,
    es_coincidencia_exacta: oferta.es_coincidencia_exacta,
    nivel_coincidencia: oferta.nivel_coincidencia,
    tipo_cobertura_marca: oferta.tipo_cobertura_marca ?? proveedor.tipo_cobertura_marca,
  };
}

/**
 * Comparación de candidatos de catálogo: selección múltiple + modal de análisis.
 */
export default function ComparadorCatalogoIaPanel({
  ofertas = [],
  ofertasRecomendadas,
  ofertasOtros = [],
  radioKm = PROVIDER_RECOMMENDATION_MAX_KM,
  onAceptar,
  procesando = false,
  requiereRepuestos = true,
  userCoords = null,
  onCompareFooterChange,
  marcaVehiculoNombre = null,
}) {
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [modalVisible, setModalVisible] = useState(false);

  const recomendadas = sortPorDistancia(
    Array.isArray(ofertasRecomendadas) && ofertasRecomendadas.length > 0
      ? ofertasRecomendadas
      : ofertas,
  );
  const otros = sortPorDistancia(Array.isArray(ofertasOtros) ? ofertasOtros : []);
  const todasOfertas = useMemo(() => [...recomendadas, ...otros], [recomendadas, otros]);

  const recomendadasPorCobertura = useMemo(
    () => partitionOfertasPorCoberturaMarca(recomendadas),
    [recomendadas],
  );
  const otrosPorCobertura = useMemo(
    () => partitionOfertasPorCoberturaMarca(otros),
    [otros],
  );

  const candidatosByKey = useMemo(() => {
    const map = new Map();
    for (const oferta of todasOfertas) {
      const c = toCandidato(oferta, requiereRepuestos, userCoords);
      const key = getCandidatoCatalogoKey(c);
      if (key) map.set(key, c);
    }
    return map;
  }, [todasOfertas, requiereRepuestos, userCoords]);

  const grupoCandidatos = useMemo(
    () => Array.from(candidatosByKey.values()),
    [candidatosByKey],
  );

  const matchPctByKey = useMemo(() => {
    const out = new Map();
    for (const c of grupoCandidatos) {
      const key = getCandidatoCatalogoKey(c);
      out.set(key, computeMatchDisplayPct(c, userCoords, grupoCandidatos));
    }
    return out;
  }, [grupoCandidatos, userCoords]);

  const puedeComparar = todasOfertas.length >= 2;
  const seleccionados = useMemo(
    () => Array.from(selectedKeys)
      .map((k) => candidatosByKey.get(k))
      .filter(Boolean),
    [selectedKeys, candidatosByKey],
  );
  const countSel = seleccionados.length;
  const compareEnabled = countSel >= 2;

  const openModal = useCallback(() => {
    if (countSel >= 2) setModalVisible(true);
  }, [countSel]);

  React.useEffect(() => {
    onCompareFooterChange?.({
      visible: puedeComparar,
      countSel,
      compareEnabled,
      onPress: openModal,
    });
  }, [puedeComparar, countSel, compareEnabled, openModal, onCompareFooterChange]);

  const toggleSeleccion = useCallback((key) => {
    if (!key) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const radioLabel = radioKm != null
    ? Math.round(Number(radioKm))
    : PROVIDER_RECOMMENDATION_MAX_KM;

  const handleConfirmar = (oferta) => {
    const id = oferta.oferta_servicio_id || oferta.id;
    setConfirmandoId(id);
    onAceptar?.(oferta);
  };

  const renderOferta = (oferta, variant) => {
    const candidato = toCandidato(oferta, requiereRepuestos, userCoords);
    const key = getCandidatoCatalogoKey(candidato);
    const id = oferta.oferta_servicio_id || oferta.id;
    const selected = selectedKeys.has(key);
    const matchDisplayPct = matchPctByKey.get(key) ?? computeMatchDisplayPct(
      candidato,
      userCoords,
      grupoCandidatos,
    );

    const coberturaMarcaBadge = getCoberturaMarcaBadge(candidato, marcaVehiculoNombre);

    return (
      <CandidatosProveedorCard
        key={id}
        candidato={candidato}
        variant={variant}
        requiereRepuestos={requiereRepuestos !== false}
        onConfirmar={() => handleConfirmar(oferta)}
        procesando={procesando}
        confirmandoEsta={confirmandoId === id}
        selectable={puedeComparar}
        selected={selected}
        onToggleSelect={() => toggleSeleccion(key)}
        matchDisplayPct={matchDisplayPct}
        coberturaMarcaBadge={coberturaMarcaBadge}
      />
    );
  };

  const renderGruposCobertura = (particion, variant) => {
    const { especialistas, multimarca } = particion;
    const grupos = [];

    if (especialistas.length > 0) {
      grupos.push(
        <ComparadorCatalogoCoberturaGrupo
          key={`${variant}-esp`}
          accent="especialista"
          title={tituloGrupoEspecialistas(marcaVehiculoNombre)}
          subtitle={subtituloGrupoEspecialistas(marcaVehiculoNombre, radioLabel)}
        >
          {especialistas.map((oferta) => renderOferta(oferta, variant))}
        </ComparadorCatalogoCoberturaGrupo>,
      );
    }
    if (multimarca.length > 0) {
      grupos.push(
        <ComparadorCatalogoCoberturaGrupo
          key={`${variant}-mm`}
          accent="multimarca"
          title={tituloGrupoMultimarca()}
          subtitle={subtituloGrupoMultimarca(marcaVehiculoNombre, radioLabel)}
        >
          {multimarca.map((oferta) => renderOferta(oferta, variant))}
        </ComparadorCatalogoCoberturaGrupo>,
      );
    }
    return grupos;
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.lead}>
        El proveedor confirma el servicio antes de pagar. Los candidatos coinciden con tu
        vehículo, servicio y ubicación.
      </Text>

      <View style={styles.legendRow}>
        <ProveedorCoberturaMarcaChip
          badge={getCoberturaMarcaBadge({ tipo_cobertura_marca: 'especialista' }, marcaVehiculoNombre)}
          compact
        />
        <ProveedorCoberturaMarcaChip
          badge={getCoberturaMarcaBadge({ tipo_cobertura_marca: 'multimarca' }, marcaVehiculoNombre)}
          compact
        />
      </View>

      {puedeComparar ? (
        <Text style={styles.selectHint}>
          Marca 2 o más proveedores y pulsa Comparar para ver quién encaja mejor contigo.
        </Text>
      ) : null}

      {recomendadas.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coincidencia exacta</Text>
          <Text style={styles.sectionSub}>
            Mejor ajuste a tu servicio y vehículo, a hasta {radioLabel} km de tu dirección.
            {recomendadasPorCobertura.especialistas.length > 0
              && recomendadasPorCobertura.multimarca.length > 0
              ? ' Especialistas en tu marca y proveedores multimarca.'
              : null}
          </Text>
          {renderGruposCobertura(recomendadasPorCobertura, 'recomendado')}
        </View>
      ) : null}

      {otros.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fuera de tu zona</Text>
          <Text style={styles.sectionSub}>
            Compatibles con tu servicio y vehículo, más allá de {radioLabel} km desde tu
            dirección o con coincidencia parcial cerca de ti.
          </Text>
          {renderGruposCobertura(otrosPorCobertura, 'otro')}
        </View>
      ) : null}

      <ComparadorCandidatosCatalogoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        candidatos={seleccionados}
        userCoords={userCoords}
        marcaVehiculoNombre={marcaVehiculoNombre}
        requiereRepuestos={requiereRepuestos !== false}
        onConfirmar={(candidato) => {
          setModalVisible(false);
          const raw = todasOfertas.find(
            (o) => getCandidatoCatalogoKey(toCandidato(o, requiereRepuestos, userCoords))
              === getCandidatoCatalogoKey(candidato),
          );
          if (raw) handleConfirmar(raw);
        }}
      />
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
    marginBottom: 12,
    lineHeight: 20,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  selectHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary[700],
    marginBottom: 16,
    lineHeight: 19,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
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
