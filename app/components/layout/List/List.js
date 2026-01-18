/**
 * List Component - MecaniMóvil
 * Componente de lista con estilos consistentes
 */

import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDERS, SHADOWS } from '../../../design-system/tokens';
import Divider from '../../base/Divider/Divider';

/**
 * List Component
 * 
 * @param {array} data - Datos para la lista
 * @param {function} renderItem - Función para renderizar cada item
 * @param {function} keyExtractor - Función para extraer keys
 * @param {boolean} showDivider - Mostrar divisores entre items
 * @param {boolean} bordered - Mostrar borde alrededor de la lista
 * @param {object} style - Estilos adicionales
 * @param {object} contentContainerStyle - Estilos para el contenedor de contenido
 */
const List = ({ 
  data = [],
  renderItem,
  keyExtractor,
  showDivider = true,
  bordered = false,
  style,
  contentContainerStyle,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  refreshing,
  onRefresh,
  ...props 
}) => {
  const renderItemWithDivider = ({ item, index }) => {
    const element = renderItem({ item, index });
    
    if (!showDivider || index === data.length - 1) {
      return element;
    }
    
    return (
      <>
        {element}
        <Divider variant="light" />
      </>
    );
  };

  return (
    <View
      style={[
        styles.container,
        bordered && {
          borderWidth: BORDERS.width.thin,
          borderColor: COLORS.border.light,
          borderRadius: BORDERS.radius.md,
          ...SHADOWS.sm,
        },
        style,
      ]}
    >
      <FlatList
        data={data}
        renderItem={renderItemWithDivider}
        keyExtractor={keyExtractor || ((item, index) => `list-item-${index}`)}
        contentContainerStyle={[
          styles.contentContainer,
          contentContainerStyle,
        ]}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.paper,
  },
  contentContainer: {
    paddingVertical: SPACING.xs,
  },
});

export default List;

