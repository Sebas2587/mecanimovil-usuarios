import React from 'react';
import { FlatList, StyleSheet } from 'react-native';

/**
 * Componente que maneja listas horizontales con comportamiento de swipe
 * que permite que las cards se extiendan hasta los bordes de la pantalla durante el scroll
 * Implementación simple y efectiva
 */
const SwipeableHorizontalList = ({
  data,
  renderItem,
  keyExtractor,
  contentContainerStyle,
  style,
  showsHorizontalScrollIndicator = false,
  snapToAlignment = "start",
  decelerationRate = "normal",
  snapToInterval,
  ListFooterComponent,
  normalPadding = 16, // Padding izquierdo inicial
  parentPadding = 5, // Padding del contenedor padre
  ...otherProps
}) => {
  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      horizontal
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      decelerationRate={decelerationRate}
      snapToAlignment={snapToAlignment}
      snapToInterval={snapToInterval}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={[
        {
          paddingLeft: normalPadding,
          paddingRight: parentPadding,
        },
        contentContainerStyle,
      ]}
      style={[
        styles.flatList,
        {
          marginHorizontal: -parentPadding,
        },
        style,
      ]}
      {...otherProps}
    />
  );
};

const styles = StyleSheet.create({
  flatList: {
    // Sin overflow hidden para permitir extensión
  },
});

export default SwipeableHorizontalList; 