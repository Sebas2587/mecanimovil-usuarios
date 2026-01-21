import { useQuery } from '@tanstack/react-query';
import * as categoryService from '../services/categories';

export const useCategories = (vehicles) => {
    const brands = vehicles ? [...new Set(vehicles.map(v => v.marca).filter(Boolean))] : [];
    const brandsKey = brands.sort().join(',');

    return useQuery({
        queryKey: ['categories', brandsKey],
        queryFn: async () => {
            // If user has vehicles with brands, show filtered categories
            if (brands.length > 0) {
                return await categoryService.getCategoriesByVehicleBrands(brands);
            }
            // Otherwise, show all main categories (fallback for users without vehicles)
            return await categoryService.getMainCategories();
        },
        enabled: true, // Always enable - show categories even without vehicles
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
    });
};
