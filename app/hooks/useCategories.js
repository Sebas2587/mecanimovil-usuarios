import { useQuery } from '@tanstack/react-query';
import * as categoryService from '../services/categories';

export const useCategories = (vehicles) => {
    const brands = vehicles ? [...new Set(vehicles.map(v => v.marca).filter(Boolean))] : [];
    const brandsKey = brands.sort().join(',');

    return useQuery({
        queryKey: ['categories', brandsKey],
        queryFn: () => categoryService.getCategoriesByVehicleBrands(brands),
        enabled: brands.length > 0,
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
        initialData: [],
    });
};
