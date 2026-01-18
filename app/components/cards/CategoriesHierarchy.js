import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as categoryService from '../../services/categories';
import { COLORS } from '../../utils/constants';

/**
 * Componente para mostrar categorías de servicios de forma jerárquica
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Function} props.onSelectCategory - Función al seleccionar una categoría
 * @param {Function} props.onSelectSubcategory - Función al seleccionar una subcategoría
 */
const CategoriesHierarchy = ({ onSelectCategory, onSelectSubcategory }) => {
  const [mainCategories, setMainCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  
  // Cargar categorías principales al iniciar
  useEffect(() => {
    const fetchMainCategories = async () => {
      try {
        setLoading(true);
        const data = await categoryService.getMainCategories();
        setMainCategories(data);
      } catch (error) {
        console.error('Error al cargar categorías principales:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMainCategories();
  }, []);
  
  // Cargar subcategorías cuando se selecciona una categoría
  useEffect(() => {
    if (!selectedCategory) {
      setSubcategories([]);
      return;
    }
    
    const fetchSubcategories = async () => {
      try {
        setLoadingSubcategories(true);
        const data = await categoryService.getSubcategories(selectedCategory.id);
        setSubcategories(data);
      } catch (error) {
        console.error(`Error al cargar subcategorías de ${selectedCategory.id}:`, error);
      } finally {
        setLoadingSubcategories(false);
      }
    };
    
    fetchSubcategories();
  }, [selectedCategory]);
  
  // Manejar selección de categoría principal
  const handleCategoryPress = (category) => {
    if (selectedCategory && selectedCategory.id === category.id) {
      // Si ya está seleccionada, la deseleccionamos
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
    
    // Ejecutar callback si existe
    if (onSelectCategory) {
      onSelectCategory(category);
    }
  };
  
  // Manejar selección de subcategoría
  const handleSubcategoryPress = (subcategory) => {
    if (onSelectSubcategory) {
      onSelectSubcategory(subcategory);
    }
  };
  
  // Renderizar categoría principal
  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory && selectedCategory.id === item.id && styles.selectedCategory
      ]}
      onPress={() => handleCategoryPress(item)}
    >
      <View style={styles.categoryContent}>
        {item.icono && (
          <Ionicons 
            name={item.icono} 
            size={24} 
            color={selectedCategory && selectedCategory.id === item.id ? COLORS.white : COLORS.primary} 
            style={styles.categoryIcon}
          />
        )}
        <Text 
          style={[
            styles.categoryName,
            selectedCategory && selectedCategory.id === item.id && styles.selectedCategoryText
          ]}
        >
          {item.nombre}
        </Text>
      </View>
      
      {/* Indicador de subcategorías */}
      {item.tiene_subcategorias && (
        <Ionicons 
          name={selectedCategory && selectedCategory.id === item.id ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={selectedCategory && selectedCategory.id === item.id ? COLORS.white : COLORS.textDark} 
        />
      )}
    </TouchableOpacity>
  );
  
  // Renderizar subcategoría
  const renderSubcategoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.subcategoryItem}
      onPress={() => handleSubcategoryPress(item)}
    >
      {item.icono && (
        <Ionicons 
          name={item.icono} 
          size={18} 
          color={COLORS.secondary} 
          style={styles.subcategoryIcon}
        />
      )}
      <Text style={styles.subcategoryName}>{item.nombre}</Text>
    </TouchableOpacity>
  );
  
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando categorías...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Categorías de Servicios</Text>
      
      {/* Lista de categorías principales */}
      <FlatList
        data={mainCategories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.categoryList}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Lista de subcategorías si hay una categoría seleccionada */}
      {selectedCategory && (
        <View style={styles.subcategoriesContainer}>
          <Text style={styles.subcategoriesTitle}>
            Subcategorías de {selectedCategory.nombre}
          </Text>
          
          {loadingSubcategories ? (
            <ActivityIndicator size="small" color={COLORS.secondary} />
          ) : subcategories.length > 0 ? (
            <FlatList
              data={subcategories}
              renderItem={renderSubcategoryItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.subcategoryList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text style={styles.noSubcategoriesText}>
              No hay subcategorías disponibles
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textDark,
    fontSize: 16,
  },
  categoryList: {
    flex: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  selectedCategory: {
    backgroundColor: COLORS.primary,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  selectedCategoryText: {
    color: COLORS.white,
  },
  subcategoriesContainer: {
    marginTop: 16,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
  },
  subcategoriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  subcategoryList: {
    maxHeight: 200,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  subcategoryIcon: {
    marginRight: 10,
  },
  subcategoryName: {
    fontSize: 14,
    color: COLORS.textDark,
  },
  noSubcategoriesText: {
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 12,
  },
});

export default CategoriesHierarchy; 