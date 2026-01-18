/**
 * Icon Component - MecaniMóvil
 * Wrapper para iconos con estilos consistentes
 */

import React from 'react';
import { Ionicons, MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../../design-system/tokens';

/**
 * Icon Component
 * Wrapper para diferentes librerías de iconos con estilos consistentes
 * 
 * @param {string} name - Nombre del icono
 * @param {string} library - Librería: 'ionicons' (default), 'material', 'fontawesome', 'materialcommunity'
 * @param {number} size - Tamaño del icono
 * @param {string} color - Color del icono (default: text.primary)
 * @param {string} variant - Variante de color: 'primary', 'secondary', 'accent', 'success', 'warning', 'error', 'info'
 * @param {object} style - Estilos adicionales
 */
const Icon = ({ 
  name,
  library = 'ionicons',
  size = 24,
  color = null,
  variant = null,
  style,
  ...props 
}) => {
  // Obtener color según la variante
  const getColor = () => {
    if (color) return color;
    
    if (variant) {
      switch (variant) {
        case 'primary':
          return COLORS.primary[500];
        case 'secondary':
          return COLORS.secondary[500];
        case 'accent':
          return COLORS.accent[500];
        case 'success':
          return COLORS.success[500];
        case 'warning':
          return COLORS.warning[500];
        case 'error':
          return COLORS.error[500];
        case 'info':
          return COLORS.info[500];
        default:
          return COLORS.text.primary;
      }
    }
    
    return COLORS.text.primary;
  };

  const iconColor = getColor();

  // Renderizar según la librería
  switch (library) {
    case 'material':
      return (
        <MaterialIcons
          name={name}
          size={size}
          color={iconColor}
          style={style}
          {...props}
        />
      );
    case 'fontawesome':
      return (
        <FontAwesome
          name={name}
          size={size}
          color={iconColor}
          style={style}
          {...props}
        />
      );
    case 'materialcommunity':
      return (
        <MaterialCommunityIcons
          name={name}
          size={size}
          color={iconColor}
          style={style}
          {...props}
        />
      );
    default: // 'ionicons'
      return (
        <Ionicons
          name={name}
          size={size}
          color={iconColor}
          style={style}
          {...props}
        />
      );
  }
};

export default Icon;

