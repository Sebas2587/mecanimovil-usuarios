import { useQuery } from '@tanstack/react-query';
import * as categoryService from '../services/categories';

export const useCategories = (vehicles) => {
    const vehicleIdsKey = (Array.isArray(vehicles) ? vehicles : [])
        .map((v) => v?.id)
        .filter(Boolean)
        .sort((a, b) => a - b)
        .join(',');

    return useQuery({
        queryKey: ['categories', vehicleIdsKey],
        queryFn: async () => {
            if (vehicleIdsKey) {
                return categoryService.getMainCategoriesForUserVehicles(vehicles);
            }
            return categoryService.getMainCategories();
        },
        enabled: true,
        staleTime: 1000 * 60 * 60 * 24,
    });
};
