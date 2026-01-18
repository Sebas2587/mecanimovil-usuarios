import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  FlatList 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as categoryService from '../../services/categories';
import { COLORS } from '../../utils/constants';
import SwipeableHorizontalList from '../utils/SwipeableHorizontalList';

/**
 * Componente para mostrar categorías y subcategorías en forma de tarjetas horizontales
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Function} props.onSelectCategory - Función al seleccionar una categoría
 * @param {Function} props.onSelectSubcategory - Función al seleccionar una subcategoría
 */
const CategoryCards = ({ onSelectCategory, onSelectSubcategory }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Cargar categorías principales al iniciar
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const data = await categoryService.getMainCategories();
        setCategories(data);
        
        // Seleccionar la primera categoría por defecto si existe
        if (data.length > 0) {
          setSelectedCategory(data[0]);
        }
      } catch (error) {
        console.error('Error al cargar categorías:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Cargar subcategorías cuando cambia la categoría seleccionada
  useEffect(() => {
    if (!selectedCategory) {
      setSubcategories([]);
      return;
    }
    
    const fetchSubcategories = async () => {
      try {
        const data = await categoryService.getSubcategories(selectedCategory.id);
        setSubcategories(data);
      } catch (error) {
        console.error(`Error al cargar subcategorías de ${selectedCategory.id}:`, error);
        setSubcategories([]);
      }
    };
    
    fetchSubcategories();
  }, [selectedCategory]);
  
  // Manejar selección de categoría
  const handleCategoryPress = (category) => {
    setSelectedCategory(category);
    
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
  
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Título de sección */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categorías</Text>
        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.viewAllText}>Ver todas</Text>
        </TouchableOpacity>
      </View>
      
      {/* Categorías principales */}
      <SwipeableHorizontalList
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item: category }) => (
          <TouchableOpacity
            style={[
              styles.categoryCard,
              selectedCategory && selectedCategory.id === category.id && styles.selectedCategoryCard
            ]}
            onPress={() => handleCategoryPress(category)}
          >
            {category.icono ? (
              <View style={styles.iconContainer}>
                <Ionicons 
                  name={category.icono} 
                  size={24} 
                  color={selectedCategory && selectedCategory.id === category.id ? COLORS.white : COLORS.primary} 
                />
              </View>
            ) : (
              <View style={styles.iconPlaceholder} />
            )}
            
            <Text 
              style={[
                styles.categoryName,
                selectedCategory && selectedCategory.id === category.id && styles.selectedCategoryName
              ]}
              numberOfLines={1}
            >
              {category.nombre}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.categoriesContent}
        normalPadding={16}
        parentPadding={5}
      />
      
      {/* Subcategorías de la categoría seleccionada */}
      {selectedCategory && (
        <View style={styles.subcategoriesSection}>
          <Text style={styles.subcategoriesTitle}>
            Subcategorías de {selectedCategory.nombre}
          </Text>
          
          {subcategories.length > 0 ? (
            <SwipeableHorizontalList
              data={subcategories}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.subcategoryCard}
                  onPress={() => handleSubcategoryPress(item)}
                >
                  {item.icono ? (
                    <View style={styles.subcategoryIconContainer}>
                      <Ionicons name={item.icono} size={18} color={COLORS.secondary} />
                    </View>
                  ) : (
                    <View style={styles.subcategoryIconPlaceholder} />
                  )}
                  
                  <Text style={styles.subcategoryName} numberOfLines={2}>
                    {item.nombre}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.subcategoriesContent}
              normalPadding={16}
              parentPadding={5}
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
    marginVertical: 10,
  },
  loaderContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },

  categoriesContent: {
    paddingVertical: 4,
  },
  categoryCard: {
    width: 80,
    height: 90,
    marginHorizontal: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedCategoryCard: {
    backgroundColor: COLORS.primary,
  },
  iconContainer: {
    marginBottom: 8,
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  selectedCategoryName: {
    color: COLORS.white,
  },
  subcategoriesSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  subcategoriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: 10,
  },

    subcategoriesContent: {
    paddingVertical: 4,
  },
  subcategoryCard: {
    width: 110,
    height: 70,
    marginRight: 8,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subcategoryIconContainer: {
    marginBottom: 6,
  },
  subcategoryIconPlaceholder: {
    width: 18,
    height: 18,
    marginBottom: 6,
  },
  subcategoryName: {
    fontSize: 11,
    color: COLORS.textDark,
    textAlign: 'center',
  },
  noSubcategoriesText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
});

export default CategoryCards; 