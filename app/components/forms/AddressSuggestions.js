import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

/**
 * Componente para mostrar sugerencias de direcciones en tiempo real
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.suggestions - Lista de sugerencias de direcciones
 * @param {Function} props.onSelectSuggestion - Función a ejecutar cuando se selecciona una sugerencia
 * @param {boolean} props.loading - Indica si se están cargando las sugerencias
 * @returns {JSX.Element} Componente de sugerencias
 */
const AddressSuggestions = ({ suggestions, onSelectSuggestion, loading }) => {
  // Si no hay sugerencias y no está cargando, no mostrar nada
  if (!loading && (!suggestions || suggestions.length === 0)) {
    return null;
  }

  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity
      key={`suggestion-${item.id}`}
      style={styles.suggestionItem}
      onPress={() => onSelectSuggestion(item)}
    >
      <View style={styles.suggestionIcon}>
        <Ionicons name="location" size={18} color={COLORS.primary} />
      </View>
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionText} numberOfLines={1}>
          {item.mainText}
        </Text>
        {item.secondaryText ? (
          <Text style={styles.secondaryText} numberOfLines={1}>
            {item.secondaryText}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Buscando direcciones...</Text>
        </View>
      ) : (
        <FlatList
          data={suggestions}
          renderItem={renderSuggestionItem}
          keyExtractor={(item) => `suggestion-${item.id}`}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    maxHeight: 300,
    width: '100%',
  },
  list: {
    maxHeight: 300,
  },
  listContent: {
    paddingVertical: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  secondaryText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default AddressSuggestions; 