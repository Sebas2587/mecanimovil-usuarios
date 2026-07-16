import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TextInput
} from 'react-native';
import Icon from '../base/Icon/Icon';
import Button from '../base/Button/Button';
import PrimaryGradientPill from '../base/PrimaryGradientPill/PrimaryGradientPill';
import { COLORS, withOpacity } from '../../design-system/tokens';
import * as vehicleService from '../../services/vehicle';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FiltersModal = ({
  visible,
  onClose,
  onApplyFilters,
  currentFilters,
  type = 'mecanico' // 'mecanico' o 'taller'
}) => {
  // Estados locales para los filtros
  const [localSortBy, setLocalSortBy] = useState('');
  const [localSelectedMarca, setLocalSelectedMarca] = useState(null);
  const [localSelectedModelo, setLocalSelectedModelo] = useState(null);
  const [localSelectedComuna, setLocalSelectedComuna] = useState(null);
  const [comunaSearchQuery, setComunaSearchQuery] = useState('');
  
  // Estados para vehículos del usuario
  const [userVehicles, setUserVehicles] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  
  // Estados para comunas
  const [availableCommunes, setAvailableCommunes] = useState([]);
  const [filteredCommunes, setFilteredCommunes] = useState([]);
  const [showCommuneSelector, setShowCommuneSelector] = useState(false);
  
  // Ref para controlar la inicialización
  const isInitializedRef = useRef(false);

  // Opciones de ordenamiento según el tipo
  const getSortOptions = useCallback(() => {
    const baseOptions = [
      { id: 'distancia', name: 'Distancia', icon: 'location-outline' },
      { id: 'calificacion', name: 'Calificación', icon: 'star-outline' }
    ];

    if (type === 'mecanico') {
      baseOptions.push({ id: 'costo_domicilio', name: 'Costo a Domicilio', icon: 'home-outline' });
    } else {
      baseOptions.push({ id: 'precio', name: 'Precio', icon: 'cash-outline' });
    }

    return baseOptions;
  }, [type]);

  // Cargar vehículos del usuario
  const loadUserVehicles = useCallback(async () => {
    try {
      const vehicles = await vehicleService.getUserVehicles();
      console.log('Vehículos cargados:', vehicles);
      setUserVehicles(vehicles || []);
    } catch (error) {
      console.warn('Error cargando vehículos del usuario:', error);
      setUserVehicles([]);
    }
  }, []);

  // Cargar comunas disponibles
  const loadAvailableCommunes = useCallback(async () => {
    try {
      // Lista de comunas comunes en Chile (puedes expandir esta lista)
      const communes = [
        'Providencia', 'Las Condes', 'Ñuñoa', 'Santiago Centro', 'Maipú',
        'Puente Alto', 'La Florida', 'San Miguel', 'La Granja', 'La Pintana',
        'El Bosque', 'Pedro Aguirre Cerda', 'Lo Espejo', 'Estación Central',
        'Cerrillos', 'Independencia', 'Recoleta', 'Conchalí', 'Huechuraba',
        'Quilicura', 'Colina', 'Lampa', 'Tiltil', 'Pudahuel', 'Cerro Navia',
        'Lo Prado', 'Quinta Normal', 'Renca', 'Peñalolén', 'Macul', 'San Joaquín'
      ];
      
      setAvailableCommunes(communes);
      setFilteredCommunes(communes);
    } catch (error) {
      console.warn('Error cargando comunas:', error);
      setAvailableCommunes([]);
      setFilteredCommunes([]);
    }
  }, []);

  // Efecto para inicializar cuando se abre el modal
  useEffect(() => {
    if (visible && !isInitializedRef.current) {
      setLocalSortBy(currentFilters.sortBy || '');
      setLocalSelectedMarca(currentFilters.selectedMarca || null);
      setLocalSelectedModelo(currentFilters.selectedModelo || null);
      setLocalSelectedComuna(currentFilters.selectedComuna || null);
      isInitializedRef.current = true;
      
      // Cargar vehículos y comunas
      loadUserVehicles();
      loadAvailableCommunes();
    }
  }, [visible, currentFilters, loadUserVehicles, loadAvailableCommunes]);

  // Efecto para resetear cuando se cierra el modal
  useEffect(() => {
    if (!visible) {
      isInitializedRef.current = false;
    }
  }, [visible]);

  // Filtrar comunas por búsqueda
  useEffect(() => {
    if (comunaSearchQuery.trim()) {
      const filtered = availableCommunes.filter(commune =>
        commune.toLowerCase().includes(comunaSearchQuery.toLowerCase())
      );
      setFilteredCommunes(filtered);
    } else {
      setFilteredCommunes(availableCommunes);
    }
  }, [comunaSearchQuery, availableCommunes]);

  // Extraer modelos únicos de los vehículos del usuario
  useEffect(() => {
    if (userVehicles.length > 0) {
      const models = userVehicles.map(vehicle => ({
        id: vehicle.modelo,
        nombre: vehicle.modelo_nombre,
        marca: vehicle.marca_nombre,
        vehicleId: vehicle.id
      }));
      
      // Eliminar duplicados basados en marca + modelo
      const uniqueModels = models.filter((model, index, self) => 
        index === self.findIndex(m => m.marca === model.marca && m.nombre === model.nombre)
      );
      
      setAvailableModels(uniqueModels);
    } else {
      setAvailableModels([]);
    }
  }, [userVehicles]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleClearFilters = useCallback(() => {
    setLocalSortBy('');
    setLocalSelectedMarca(null);
    setLocalSelectedModelo(null);
    setLocalSelectedComuna(null);
    
    // Aplicar filtros limpios inmediatamente
    onApplyFilters({
      sortBy: '',
      selectedMarca: null,
      selectedModelo: null,
      selectedComuna: null
    });
    handleClose();
  }, [onApplyFilters, handleClose]);

  const handleApplyFilters = useCallback(() => {
    console.log('Aplicando filtros:', {
      sortBy: localSortBy,
      selectedMarca: localSelectedMarca,
      selectedModelo: localSelectedModelo,
      selectedComuna: localSelectedComuna
    });
    
    onApplyFilters({
      sortBy: localSortBy,
      selectedMarca: localSelectedMarca,
      selectedModelo: localSelectedModelo,
      selectedComuna: localSelectedComuna
    });
    handleClose();
  }, [localSortBy, localSelectedMarca, localSelectedModelo, localSelectedComuna, onApplyFilters, handleClose]);

  const handleSortOptionPress = useCallback((sortId) => {
    setLocalSortBy(prevSortBy => prevSortBy === sortId ? '' : sortId);
  }, []);

  const handleVehicleModelPress = useCallback((model) => {
    console.log('Seleccionando modelo:', model);
    
    // Verificar si el modelo ya está seleccionado
    const isCurrentlySelected = localSelectedMarca === model.marca && localSelectedModelo === model.nombre;
    
    if (isCurrentlySelected) {
      // Deseleccionar si ya está seleccionado
      setLocalSelectedMarca(null);
      setLocalSelectedModelo(null);
    } else {
      // Seleccionar nuevo modelo
      setLocalSelectedMarca(model.marca);
      setLocalSelectedModelo(model.nombre);
    }
  }, [localSelectedMarca, localSelectedModelo]);

  const handleCommunePress = useCallback((commune) => {
    if (localSelectedComuna === commune) {
      setLocalSelectedComuna(null);
    } else {
      setLocalSelectedComuna(commune);
    }
    setShowCommuneSelector(false);
    setComunaSearchQuery('');
  }, [localSelectedComuna]);

  const hasActiveFilters = localSortBy || localSelectedMarca || localSelectedModelo || localSelectedComuna;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.paper} />
        
        <View style={styles.modalContainer}>
          {/* Header del modal */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Filtros</Text>
            
            <Button
              title="Limpiar"
              onPress={handleClearFilters}
              disabled={!hasActiveFilters}
              type="primary"
              variant={hasActiveFilters ? 'solid' : 'outline'}
              size="sm"
              style={styles.clearButton}
            />
          </View>

          <ScrollView 
            style={styles.modalScrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Sección de Ordenamiento */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ordenar por</Text>
              <View style={styles.optionsContainer}>
                {getSortOptions().map((option) => {
                  const isSelected = localSortBy === option.id;
                  return (
                    <PrimaryGradientPill
                      key={option.id}
                      selected={isSelected}
                      onPress={() => handleSortOptionPress(option.id)}
                      style={styles.optionButtonShell}
                      fillStyle={styles.optionButtonFill}
                      inactiveStyle={styles.optionButtonInactive}
                    >
                      <Icon
                        name={option.icon}
                        size={16}
                        color={isSelected ? COLORS.tab.selectedText : COLORS.text.primary}
                      />
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {option.name}
                      </Text>
                    </PrimaryGradientPill>
                  );
                })}
              </View>
            </View>

            {/* Sección de Comuna */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Comuna</Text>
              <TouchableOpacity
                style={styles.communeSelector}
                onPress={() => setShowCommuneSelector(true)}
              >
                <Text style={[
                  styles.communeSelectorText,
                  localSelectedComuna ? styles.communeSelectorTextSelected : styles.communeSelectorTextPlaceholder
                ]}>
                  {localSelectedComuna || 'Seleccionar comuna'}
                </Text>
                <Icon name="chevron-down" size={20} color={COLORS.text.tertiary} />
              </TouchableOpacity>
              
              {localSelectedComuna && (
                <PrimaryGradientPill
                  selected
                  onPress={() => setLocalSelectedComuna(null)}
                  style={styles.selectedCommuneChipShell}
                  fillStyle={styles.selectedCommuneChipFill}
                >
                  <Text style={styles.selectedCommuneChipText}>{localSelectedComuna}</Text>
                  <Icon name="close" size={16} color={COLORS.tab.selectedText} />
                </PrimaryGradientPill>
              )}
            </View>

            {/* Sección de Vehículos */}
            {availableModels.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vehículos</Text>
                <View style={styles.vehicleModelsContainer}>
                  {availableModels.map((model) => {
                    const isSelected = localSelectedMarca === model.marca && localSelectedModelo === model.nombre;
                    return (
                      <PrimaryGradientPill
                        key={`${model.marca}-${model.nombre}`}
                        selected={isSelected}
                        onPress={() => handleVehicleModelPress(model)}
                        style={styles.vehicleModelShell}
                        fillStyle={styles.vehicleModelFill}
                        inactiveStyle={styles.vehicleModelInactive}
                      >
                        <Text style={[styles.vehicleModelText, isSelected && styles.vehicleModelTextSelected]}>
                          {model.marca} {model.nombre}
                        </Text>
                      </PrimaryGradientPill>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Botón de aplicar filtros */}
          <View style={styles.bottomContainer}>
            <Button
              title="Aplicar Filtros"
              onPress={handleApplyFilters}
              fullWidth
            />
          </View>
        </View>

        {/* Modal de selección de comuna */}
        {showCommuneSelector && (
          <Modal
            visible={showCommuneSelector}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowCommuneSelector(false)}
          >
            <View style={styles.communeModalOverlay}>
              <View style={styles.communeModalContainer}>
                <View style={styles.communeModalHeader}>
                  <Text style={styles.communeModalTitle}>Seleccionar Comuna</Text>
                  <TouchableOpacity
                    onPress={() => setShowCommuneSelector(false)}
                    style={styles.communeModalCloseButton}
                  >
                    <Icon name="close" size={24} color={COLORS.text.primary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.communeSearchContainer}>
                    <Icon name="search-outline" size={20} color={COLORS.text.tertiary} />
                  <TextInput
                    style={styles.communeSearchInput}
                    placeholder="Buscar comuna..."
                    value={comunaSearchQuery}
                    onChangeText={setComunaSearchQuery}
                  />
                </View>
                
                <ScrollView style={styles.communeListContainer}>
                  {filteredCommunes.map((commune) => (
                    <TouchableOpacity
                      key={commune}
                      style={styles.communeItem}
                      onPress={() => handleCommunePress(commune)}
                    >
                      <Text style={styles.communeItemText}>{commune}</Text>
                      {localSelectedComuna === commune && (
                        <Icon name="checkmark" size={20} color={COLORS.primary[500]} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.paper,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  closeButton: {
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  clearButton: {
    borderRadius: 20,
  },
  modalScrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 15,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButtonShell: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  optionButtonFill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  optionButtonInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  optionText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  optionTextSelected: {
    color: COLORS.tab.selectedText,
  },
  communeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  communeSelectorText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  communeSelectorTextPlaceholder: {
    color: COLORS.text.tertiary,
  },
  communeSelectorTextSelected: {
    color: COLORS.primary[500],
    fontWeight: '500',
  },
  selectedCommuneChipShell: {
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  selectedCommuneChipFill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedCommuneChipText: {
    color: COLORS.tab.selectedText,
    fontSize: 14,
    marginRight: 8,
  },
  vehicleModelsContainer: {
    gap: 10,
  },
  vehicleModelShell: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  vehicleModelFill: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  vehicleModelInactive: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  vehicleModelText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  vehicleModelTextSelected: {
    color: COLORS.tab.selectedText,
  },
  bottomContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  communeModalOverlay: {
    flex: 1,
    backgroundColor: withOpacity(COLORS.base.inkBlack, 0.5),
    justifyContent: 'center',
    alignItems: 'center',
  },
  communeModalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    overflow: 'hidden',
  },
  communeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  communeModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  communeModalCloseButton: {
    padding: 5,
  },
  communeSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  communeSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  communeListContainer: {
    maxHeight: 300,
  },
  communeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.gray[100],
  },
  communeItemText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
});

export default FiltersModal; 