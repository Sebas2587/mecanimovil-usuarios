import { useQuery } from '@tanstack/react-query';
import { get } from '../services/api';

export const PENDING_REVIEWS_QUERY_KEY = ['pendingReviews'];

async function fetchPendingReviews() {
  const response = await get('/usuarios/servicios-completados-sin-resena/');
  return response?.services_without_review || [];
}

export function usePendingReviews(options = {}) {
  return useQuery({
    queryKey: PENDING_REVIEWS_QUERY_KEY,
    queryFn: fetchPendingReviews,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    ...options,
  });
}
