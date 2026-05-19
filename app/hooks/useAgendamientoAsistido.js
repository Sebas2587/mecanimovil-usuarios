import { useCallback, useRef, useState } from 'react';
import {
  analizarNecesidad,
  obtenerCandidatosProveedor,
  isAsistidoHabilitado,
} from '../services/agendamientoAsistidoService';

const DEBOUNCE_MS = 450;

/**
 * Hook para consultas efímeras al asistente (sin persistencia en servidor).
 */
export function useAgendamientoAsistido() {
  const [analisis, setAnalisis] = useState(null);
  const [candidatos, setCandidatos] = useState([]);
  const [loadingAnalisis, setLoadingAnalisis] = useState(false);
  const [loadingCandidatos, setLoadingCandidatos] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const habilitado = isAsistidoHabilitado();

  const cancelarPendiente = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const analizar = useCallback(
    async ({ texto, vehiculoId, componentesSalud, origen = 'texto', inmediato = false }) => {
      if (!habilitado) return null;
      cancelarPendiente();

      const trimmed = (texto || '').trim();
      if (trimmed.length > 0 && trimmed.length < 4) {
        setAnalisis(null);
        setError(null);
        return null;
      }

      const ejecutar = async () => {
        setLoadingAnalisis(true);
        setError(null);
        try {
          const data = await analizarNecesidad({
            texto: trimmed,
            vehiculo_id: vehiculoId,
            componentes_salud: componentesSalud,
            origen,
          });
          setAnalisis(data);
          return data;
        } catch (e) {
          const msg =
            e?.code === 'agendamiento_ia_deshabilitado'
              ? 'Asistente IA no disponible en esta versión.'
              : e?.response?.data?.detail ||
                e?.message ||
                'No se pudo analizar la necesidad';
          setError(typeof msg === 'string' ? msg : 'No se pudo analizar la necesidad');
          setAnalisis(null);
          return null;
        } finally {
          setLoadingAnalisis(false);
        }
      };

      if (inmediato) {
        return ejecutar();
      }

      return new Promise((resolve) => {
        debounceRef.current = setTimeout(async () => {
          const r = await ejecutar();
          resolve(r);
        }, DEBOUNCE_MS);
      });
    },
    [habilitado, cancelarPendiente]
  );

  const cargarCandidatos = useCallback(
    async ({
      vehiculoId,
      servicioIds,
      lat,
      lng,
      comunasExtraidas,
      requiereRepuestos = true,
    }) => {
      if (!habilitado || !vehiculoId || !Array.isArray(servicioIds) || servicioIds.length === 0) {
        setCandidatos([]);
        return [];
      }
      setLoadingCandidatos(true);
      setError(null);
      try {
        const data = await obtenerCandidatosProveedor({
          vehiculo_id: vehiculoId,
          servicio_ids: servicioIds,
          lat,
          lng,
          comunas_extraidas: comunasExtraidas,
          requiere_repuestos: requiereRepuestos,
        });
        const list = Array.isArray(data?.candidatos) ? data.candidatos : [];
        setCandidatos(list);
        return list;
      } catch (e) {
        setError(e?.message || 'No se pudieron cargar proveedores');
        setCandidatos([]);
        return [];
      } finally {
        setLoadingCandidatos(false);
      }
    },
    [habilitado]
  );

  const reset = useCallback(() => {
    cancelarPendiente();
    setAnalisis(null);
    setCandidatos([]);
    setError(null);
    setLoadingAnalisis(false);
    setLoadingCandidatos(false);
  }, [cancelarPendiente]);

  return {
    habilitado,
    analisis,
    candidatos,
    loadingAnalisis,
    loadingCandidatos,
    error,
    analizar,
    cargarCandidatos,
    reset,
  };
}
