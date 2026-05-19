import { EXPLORE_MODE_CERCA, EXPLORE_MODE_PARA_TI } from '../components/providers/explore/exploreProvidersConstants';
import { useExploreProvidersNearby } from './useExploreProvidersNearby';
import { useParaTiProviders } from './useParaTiProviders';

const EXPLORE_PROVIDER_LIMIT = 60;

/**
 * Datos de ExploreProviders según modo (cerca vs para_ti).
 */
export function useExploreProviders({ mode, vehicle, address, enabled = true }) {
  const isParaTi = mode === EXPLORE_MODE_PARA_TI;

  const nearby = useExploreProvidersNearby({
    vehicle,
    address,
    enabled: enabled && !isParaTi && !!address,
  });

  const paraTi = useParaTiProviders({
    vehicle,
    address,
    enabled: enabled && isParaTi,
  });

  const active = isParaTi ? paraTi : nearby;

  const providers =
    isParaTi && active.data
      ? active.data.slice(0, EXPLORE_PROVIDER_LIMIT)
      : active.data ?? [];

  return {
    mode,
    isParaTi,
    providers,
    isLoading: active.isLoading,
    isRefetching: active.isRefetching,
    refetch: active.refetch,
  };
}

export { EXPLORE_PROVIDER_LIMIT };
