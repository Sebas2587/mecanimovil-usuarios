import React, { useCallback, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
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
  tituloGrupoMultimarca,
  subtituloSeccionComparador,
} from '../../utils/catalogoComparadorCobertura';
import ComparadorCatalogoCoberturaGrupo from './ComparadorCatalogoCoberturaGrupo';
import ComparadorRepuestosAviso from './ComparadorRepuestosAviso';
import { comparadorCatalogoStyles as cs } from './comparadorCatalogoStyles';
import {
  avisoRepuestosCatalogo,
  partitionPorRepuestosCatalogo,
  solicitudRequiereRepuestos,
  subtituloSubgrupoRepuestos,
  tituloSubgrupoRepuestos,
} from '../../utils/catalogoComparadorRepuestos';

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
    ofrece_repuestos: oferta.ofrece_repuestos,
    ofrece_solo_mano_obra: oferta.ofrece_solo_mano_obra,
    tipo_servicio_catalogo: oferta.tipo_servicio_catalogo,
    coincidencia_repuestos: oferta.coincidencia_repuestos,
    solicitud_requiere_repuestos: conRepuestos,
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
  mensajeRepuestos = null,
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

  const solicitudConRepuestos = solicitudRequiereRepuestos(requiereRepuestos);

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

  const renderGruposCoberturaMarca = (ofertas, variant, keyPrefix) => {
    const { especialistas, multimarca } = partitionOfertasPorCoberturaMarca(ofertas);
    const grupos = [];

    if (especialistas.length > 0) {
      grupos.push(
        <ComparadorCatalogoCoberturaGrupo
          key={`${keyPrefix}-esp`}
          title={tituloGrupoEspecialistas(marcaVehiculoNombre)}
        >
          {especialistas.map((oferta) => renderOferta(oferta, variant))}
        </ComparadorCatalogoCoberturaGrupo>,
      );
    }
    if (multimarca.length > 0) {
      grupos.push(
        <ComparadorCatalogoCoberturaGrupo
          key={`${keyPrefix}-mm`}
          title={tituloGrupoMultimarca()}
        >
          {multimarca.map((oferta) => renderOferta(oferta, variant))}
        </ComparadorCatalogoCoberturaGrupo>,
      );
    }
    return grupos;
  };

  const renderBloqueRepuestos = (ofertas, variant, keyPrefix) => {
    if (!ofertas.length) return null;
    if (!solicitudConRepuestos) {
      return renderGruposCoberturaMarca(ofertas, variant, keyPrefix);
    }
    const { conRepuestos, soloManoObra } = partitionPorRepuestosCatalogo(ofertas);
    if (conRepuestos.length > 0 && soloManoObra.length === 0) {
      return renderGruposCoberturaMarca(conRepuestos, variant, keyPrefix);
    }
    const bloques = [];
    if (conRepuestos.length > 0) {
      bloques.push(
        <View key={`${keyPrefix}-rep-con`}>
          <Text style={cs.subgroupTitle}>{tituloSubgrupoRepuestos('con_repuestos')}</Text>
          {renderGruposCoberturaMarca(conRepuestos, variant, `${keyPrefix}-con`)}
        </View>,
      );
    }
    if (soloManoObra.length > 0) {
      const sub = subtituloSubgrupoRepuestos('solo_mano_obra');
      bloques.push(
        <View key={`${keyPrefix}-rep-solo`}>
          <Text style={cs.subgroupTitle}>{tituloSubgrupoRepuestos('solo_mano_obra')}</Text>
          {sub ? <Text style={cs.subgroupSub}>{sub}</Text> : null}
          {renderGruposCoberturaMarca(soloManoObra, variant, `${keyPrefix}-solo`)}
        </View>,
      );
    }
    return bloques;
  };

  const subExacta = subtituloSeccionComparador('exacta', radioLabel);
  const subFuera = subtituloSeccionComparador('fuera', radioLabel);
  const avisoGlobalRepuestos = avisoRepuestosCatalogo(
    todasOfertas,
    solicitudConRepuestos,
    mensajeRepuestos,
  );

  return (
    <View>
      {solicitudConRepuestos && avisoGlobalRepuestos ? (
        <ComparadorRepuestosAviso mensaje={avisoGlobalRepuestos} />
      ) : null}

      {puedeComparar ? (
        <Text style={cs.selectHint}>Marca 2 o más y pulsa Comparar</Text>
      ) : null}

      {recomendadas.length > 0 ? (
        <View style={cs.section}>
          <Text style={[cs.sectionTitle, !subExacta && cs.sectionTitleSpaced]}>
            Coincidencia exacta
          </Text>
          {subExacta ? <Text style={cs.sectionSub}>{subExacta}</Text> : null}
          {renderBloqueRepuestos(recomendadas, 'recomendado', 'rec')}
        </View>
      ) : null}

      {otros.length > 0 ? (
        <View style={cs.section}>
          <Text style={[cs.sectionTitle, !subFuera && cs.sectionTitleSpaced]}>
            Fuera de tu zona
          </Text>
          {subFuera ? <Text style={cs.sectionSub}>{subFuera}</Text> : null}
          {renderBloqueRepuestos(otros, 'otro', 'otros')}
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
