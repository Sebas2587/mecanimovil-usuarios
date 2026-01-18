import { get } from './api';

/**
 * Obtiene todas las categorías de servicios
 * @returns {Promise<Array>} Lista de categorías
 */
export const getAllCategories = async () => {
  try {
    // Usar el endpoint genérico sin autenticación
    const data = await get('/servicios/categorias/', {}, { requiresAuth: false });
    return data;
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    // Si falla, devolver array vacío para evitar errores en la UI
    return [];
  }
};

/**
 * Obtiene solo las categorías principales (sin categoría padre)
 * @returns {Promise<Array>} Lista de categorías principales
 */
export const getMainCategories = async () => {
  try {
    // Filtrar las categorías que no tienen padre directamente
    const allCategories = await getAllCategories();
    // Filtramos las categorías principales (sin categoria_padre)
    return allCategories.filter(cat => !cat.categoria_padre);
  } catch (error) {
    console.error('Error obteniendo categorías principales:', error);
    return [];
  }
};

/**
 * Obtiene las subcategorías de una categoría específica
 * @param {number} categoryId - ID de la categoría padre
 * @returns {Promise<Array>} Lista de subcategorías
 */
export const getSubcategories = async (categoryId) => {
  try {
    // Obtenemos todas las categorías y filtramos
    const allCategories = await getAllCategories();
    return allCategories.filter(cat => cat.categoria_padre === categoryId);
  } catch (error) {
    console.error(`Error obteniendo subcategorías de ${categoryId}:`, error);
    return [];
  }
};

/**
 * Obtiene el árbol completo de categorías organizadas jerárquicamente
 * @returns {Promise<Array>} Árbol de categorías
 */
export const getCategoryTree = async () => {
  try {
    // Obtenemos todas las categorías
    const allCategories = await getAllCategories();
    
    // Filtrar sólo las categorías principales
    const mainCategories = allCategories.filter(cat => !cat.categoria_padre);
    
    // Para cada categoría principal, añadir sus subcategorías
    const categoriesWithSubs = mainCategories.map(mainCat => {
      const subs = allCategories.filter(cat => cat.categoria_padre === mainCat.id);
      return {
        ...mainCat,
        subcategorias: subs
      };
    });
    
    return categoriesWithSubs;
  } catch (error) {
    console.error('Error obteniendo árbol de categorías:', error);
    return [];
  }
};

/**
 * Busca categorías por nombre o descripción
 * @param {string} query - Término de búsqueda
 * @returns {Promise<Array>} Lista de categorías coincidentes
 */
export const searchCategories = async (query) => {
  try {
    if (!query || query.trim() === '') {
      return [];
    }
    
    // Obtenemos todas las categorías y filtramos por nombre o descripción
    const allCategories = await getAllCategories();
    const lowerQuery = query.toLowerCase();
    
    return allCategories.filter(cat => 
      (cat.nombre && cat.nombre.toLowerCase().includes(lowerQuery)) || 
      (cat.descripcion && cat.descripcion.toLowerCase().includes(lowerQuery))
    );
  } catch (error) {
    console.error(`Error buscando categorías con "${query}":`, error);
    return [];
  }
};

/**
 * Obtiene una categoría específica por su ID
 * @param {number} categoryId - ID de la categoría
 * @returns {Promise<Object>} Datos de la categoría
 */
export const getCategoryById = async (categoryId) => {
  try {
    const allCategories = await getAllCategories();
    return allCategories.find(cat => cat.id === categoryId) || null;
  } catch (error) {
    console.error(`Error obteniendo categoría ${categoryId}:`, error);
    return null;
  }
};

/**
 * Obtiene los servicios de una categoría específica
 * @param {number} categoryId - ID de la categoría
 * @returns {Promise<Array>} Lista de servicios de la categoría
 */
export const getServicesByCategory = async (categoryId) => {
  try {
    const data = await get('/servicios/servicios/por_categoria/', { categoria: categoryId }, { requiresAuth: false });
    return data;
  } catch (error) {
    console.error(`Error obteniendo servicios de la categoría ${categoryId}:`, error);
    return [];
  }
};

/**
 * Obtiene categorías que tienen al menos un servicio disponible para las marcas de vehículos especificadas
 * Esta función filtra categorías basándose en servicios que tienen ofertas de proveedores
 * que atienden las marcas del usuario. Solo muestra categorías relevantes para las marcas del usuario.
 * @param {Array<number>} marcasIds - IDs de las marcas de vehículos del usuario
 * @returns {Promise<Array>} Lista de categorías filtradas con servicios disponibles para las marcas del usuario
 */
export const getCategoriesByVehicleBrands = async (marcasIds) => {
  try {
    if (!marcasIds || marcasIds.length === 0) {
      console.log('No hay marcas de vehículos para filtrar categorías');
      return [];
    }

    // OPTIMIZACIÓN: Cargar modelos en paralelo para todas las marcas
    const modeloPromises = marcasIds.map(marcaId =>
      get('/vehiculos/modelos/', { marca: marcaId })
        .catch(error => {
          console.error(`Error obteniendo modelos para marca ${marcaId}:`, error);
          return [];
        })
    );

    const modelosResults = await Promise.allSettled(modeloPromises);

    // Paso 1: Consolidar todos los modelos únicos
    const allModelos = [];
    const modeloIds = new Set();

    modelosResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        result.value.forEach(modelo => {
          if (!modeloIds.has(modelo.id)) {
            modeloIds.add(modelo.id);
            allModelos.push(modelo);
          }
        });
      }
    });

    if (allModelos.length === 0) {
      console.log('⚠️ No se encontraron modelos para las marcas del usuario');
      return [];
    }

    // OPTIMIZACIÓN: Cargar servicios en paralelo para todos los modelos
    const serviciosPromises = allModelos.map(modelo =>
      get('/servicios/servicios/por_modelo/', { modelo: modelo.id })
        .catch(error => {
          console.error(`Error obteniendo servicios para modelo ${modelo.id}:`, error);
          return [];
        })
    );

    const serviciosResults = await Promise.allSettled(serviciosPromises);

    // Paso 2: Consolidar todos los servicios únicos
    const allServices = [];
    const serviceIds = new Set();

    serviciosResults.forEach((result) => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        result.value.forEach(servicio => {
          if (!serviceIds.has(servicio.id)) {
            serviceIds.add(servicio.id);
            allServices.push(servicio);
          }
        });
      }
    });

    if (allServices.length === 0) {
      console.log('⚠️ No se encontraron servicios compatibles para las marcas del usuario');
      return [];
    }

    // OPTIMIZACIÓN: Cargar categorías en paralelo con el procesamiento de servicios
    const [allCategories] = await Promise.allSettled([
      getAllCategories() // Cache automático desde api.js
    ]);

    // Paso 3: Extraer IDs de categorías únicas de los servicios compatibles
    const categoryIds = new Set();

    for (const servicio of allServices) {
      // ServicioListSerializer devuelve categorias_ids como array de IDs
      if (servicio.categorias_ids && Array.isArray(servicio.categorias_ids)) {
        servicio.categorias_ids.forEach(categoriaId => {
          if (categoriaId) {
            categoryIds.add(categoriaId);
          }
        });
      }
      // Fallback: si viene como objeto o array de objetos
      else if (servicio.categorias && Array.isArray(servicio.categorias)) {
        servicio.categorias.forEach(categoria => {
          const catId = typeof categoria === 'object' ? categoria.id : categoria;
          if (catId) {
            categoryIds.add(catId);
          }
        });
      } else if (servicio.categoria) {
        const catId = typeof servicio.categoria === 'object' ? servicio.categoria.id : servicio.categoria;
        if (catId) {
          categoryIds.add(catId);
        }
      }
    }

    if (categoryIds.size === 0) {
      console.log('⚠️ No se encontraron categorías en los servicios compatibles');
      return [];
    }

    if (categoryIds.size === 0) {
      console.log('⚠️ No se encontraron categorías en los servicios compatibles');
      return [];
    }

    // Paso 4: Procesar categorías (ya cargadas en paralelo)
    const categoriesData = allCategories.status === 'fulfilled' ? allCategories.value : [];
    const categoriesById = new Map();
    categoriesData.forEach(categoria => {
      categoriesById.set(categoria.id, categoria);
    });

    // Filtrar categorías que están en los servicios compatibles y son principales (sin categoría padre)
    const mainCategories = [];
    for (const categoriaId of categoryIds) {
      const categoria = categoriesById.get(categoriaId);
      if (categoria && !categoria.categoria_padre) {
        // Es categoría principal, incluirla
        mainCategories.push(categoria);
      }
    }

    // Paso 5: Contar servicios por categoría para ordenar
    const categoriesWithCount = mainCategories.map(categoria => {
      const serviciosCategoria = allServices.filter(servicio => {
        // Verificar si el servicio pertenece a esta categoría
        if (servicio.categorias_ids && Array.isArray(servicio.categorias_ids)) {
          return servicio.categorias_ids.includes(categoria.id);
        }
        // Fallback: si viene como objeto
        if (servicio.categorias && Array.isArray(servicio.categorias)) {
          return servicio.categorias.some(cat => {
            const catId = typeof cat === 'object' ? cat.id : cat;
            return catId === categoria.id;
          });
        }
        const servicioCatId = typeof servicio.categoria === 'object' ? servicio.categoria?.id : servicio.categoria;
        return servicioCatId === categoria.id;
      });

      return {
        ...categoria,
        servicios_count: serviciosCategoria.length
      };
    });

    // Ordenar por cantidad de servicios (más servicios primero)
    categoriesWithCount.sort((a, b) => b.servicios_count - a.servicios_count);

    console.log(`✅ ${categoriesWithCount.length} categorías con servicios disponibles para las marcas del usuario`);
    return categoriesWithCount;
    
  } catch (error) {
    console.error('❌ Error obteniendo categorías por marcas:', error);
    return [];
  }
};

/**
 * Obtiene servicios de una categoría con información de proveedores, agrupados por tipo
 * @param {number} categoryId - ID de la categoría
 * @param {Array<number>} marcasIds - IDs de las marcas de vehículos del usuario
 * @returns {Promise<Object>} Objeto con servicios agrupados: { talleres: [], mecanicos: [] }
 */
export const getServicesByCategoryWithProviders = async (categoryId, marcasIds = []) => {
  try {
    console.log(`🔍 Obteniendo servicios de categoría ${categoryId} para marcas:`, marcasIds);

    // Obtener servicios de la categoría
    const servicios = await getServicesByCategory(categoryId);
    
    if (!servicios || servicios.length === 0) {
      console.log('No hay servicios disponibles para esta categoría');
      return { talleres: [], mecanicos: [] };
    }

    console.log(`📦 ${servicios.length} servicios encontrados`);

    // Agrupar servicios por tipo de proveedor
    const serviciosPorTipo = {
      talleres: [],
      mecanicos: []
    };

    // Procesar cada servicio y obtener información del proveedor
    for (const servicio of servicios) {
      try {
        // El backend devuelve taller_principal y mecanico_principal
        // Si un servicio tiene taller_principal, agregarlo a talleres
        if (servicio.taller_principal) {
          serviciosPorTipo.talleres.push({
            ...servicio,
            provider: servicio.taller_principal,
            providerType: 'taller',
            precio_sin_repuestos: servicio.taller_principal.precio_sin_repuestos,
            precio_con_repuestos: servicio.taller_principal.precio_con_repuestos
          });
        }
        
        // Si un servicio tiene mecanico_principal, agregarlo a mecánicos
        if (servicio.mecanico_principal) {
          serviciosPorTipo.mecanicos.push({
            ...servicio,
            provider: servicio.mecanico_principal,
            providerType: 'mecanico',
            precio_sin_repuestos: servicio.mecanico_principal.precio_sin_repuestos,
            precio_con_repuestos: servicio.mecanico_principal.precio_con_repuestos
          });
        }
        
        // Si no tiene ninguno, verificar si hay ofertas disponibles
        if (!servicio.taller_principal && !servicio.mecanico_principal) {
          console.log('⚠️ Servicio sin proveedor principal:', servicio.nombre);
          // Verificar si hay ofertas disponibles
          if (servicio.ofertas_disponibles && servicio.ofertas_disponibles.total > 0) {
            console.log(`   → Tiene ${servicio.ofertas_disponibles.total} ofertas, pero sin proveedor principal asignado`);
          }
        }
      } catch (error) {
        console.error(`Error procesando servicio ${servicio.id}:`, error);
      }
    }

    console.log(`✅ Servicios agrupados: ${serviciosPorTipo.talleres.length} talleres, ${serviciosPorTipo.mecanicos.length} mecánicos`);
    
    return serviciosPorTipo;
    
  } catch (error) {
    console.error('Error obteniendo servicios por categoría con proveedores:', error);
    return { talleres: [], mecanicos: [] };
  }
}; 