import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash';
import * as locationService from '../services/location';

/** Formato unificado con GPS (reverseGeocode) para guardar en el modal. */
export function suggestionToDetectedAddress(suggestion) {
  const details = suggestion?.details || {};
  const district = suggestion.district || details.district || '';
  const city = details.city || '';
  let name = suggestion.mainText || suggestion.fullAddress || '';
  if (name.endsWith(', Chile')) name = name.replace(/, Chile$/, '');

  return {
    street: details.street || '',
    streetNumber: details.streetNumber || '',
    district,
    city,
    region: details.region || '',
    name,
    latitude: suggestion.coordinates?.latitude,
    longitude: suggestion.coordinates?.longitude,
    source: 'manual',
  };
}

export function validationToDetectedAddress(validation, displayText) {
  const d = validation.details || {};
  let name = (displayText || d.fullAddress || '').trim();
  if (name.endsWith(', Chile')) name = name.replace(/, Chile$/, '');

  return {
    street: d.street || '',
    streetNumber: d.streetNumber || '',
    district: d.district || '',
    city: d.city || '',
    region: d.region || '',
    name: name || d.fullAddress,
    latitude: d.coordinates?.latitude,
    longitude: d.coordinates?.longitude,
    source: 'manual',
  };
}

/**
 * Autocompletado + validación en tiempo real (reutiliza locationService).
 */
export function useManualAddressEntry() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvedMeta, setResolvedMeta] = useState(null);

  const fetchSuggestionsRef = useRef(
    debounce(async (text, setSuggestionsState, setLoadingState) => {
      if (!text || text.trim().length < 3) {
        setSuggestionsState([]);
        setLoadingState(false);
        return;
      }
      try {
        setLoadingState(true);
        const results = await locationService.getAddressSuggestions(text);
        setSuggestionsState(results || []);
      } catch {
        setSuggestionsState([]);
      } finally {
        setLoadingState(false);
      }
    }, 500),
  );

  const resolveQueryRef = useRef(
    debounce(async (text, setMetaState, setResolvingState) => {
      const trimmed = (text || '').trim();
      if (trimmed.length < 5) {
        setMetaState(null);
        setResolvingState(false);
        return;
      }
      setResolvingState(true);
      try {
        const validation = await locationService.validateAddress(trimmed);
        if (validation.details) {
          setMetaState({
            district: validation.details.district || '',
            city: validation.details.city || '',
            isValid: validation.isValid,
            error: validation.isValid ? null : validation.error,
          });
        } else {
          setMetaState({
            district: '',
            city: '',
            isValid: false,
            error: validation.error || 'No reconocimos esta dirección',
          });
        }
      } catch {
        setMetaState({
          district: '',
          city: '',
          isValid: false,
          error: 'Error al validar la dirección',
        });
      } finally {
        setResolvingState(false);
      }
    }, 700),
  );

  useEffect(() => {
    const fetchFn = fetchSuggestionsRef.current;
    const resolveFn = resolveQueryRef.current;
    return () => {
      fetchFn.cancel();
      resolveFn.cancel();
    };
  }, []);

  const onChangeQuery = useCallback((text) => {
    setQuery(text);
    if (text.trim().length >= 3) {
      setLoadingSuggestions(true);
      fetchSuggestionsRef.current(text, setSuggestions, setLoadingSuggestions);
    } else {
      setSuggestions([]);
      setLoadingSuggestions(false);
      fetchSuggestionsRef.current.cancel();
    }
    if (text.trim().length >= 5) {
      setResolving(true);
      resolveQueryRef.current(text, setResolvedMeta, setResolving);
    } else {
      setResolvedMeta(null);
      resolveQueryRef.current.cancel();
      setResolving(false);
    }
  }, []);

  const selectSuggestion = useCallback((suggestion) => {
    const detected = suggestionToDetectedAddress(suggestion);
    setQuery(detected.name || '');
    setSuggestions([]);
    setResolvedMeta({
      district: detected.district,
      city: detected.city,
      isValid: true,
      error: null,
    });
    return detected;
  }, []);

  const confirmFromQuery = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 5) {
      throw new Error('Escribe al menos 5 caracteres de la dirección.');
    }
    const validation = await locationService.validateAddress(trimmed);
    if (!validation.isValid) {
      throw new Error(validation.error || 'No pudimos validar esta dirección en Chile.');
    }
    return validationToDetectedAddress(validation, trimmed);
  }, [query]);

  const reset = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setLoadingSuggestions(false);
    setResolving(false);
    setResolvedMeta(null);
    fetchSuggestionsRef.current.cancel();
    resolveQueryRef.current.cancel();
  }, []);

  return {
    query,
    onChangeQuery,
    suggestions,
    loadingSuggestions,
    resolving,
    resolvedMeta,
    selectSuggestion,
    confirmFromQuery,
    reset,
  };
}
