# Sistema de Diseño - MecaniMóvil

## 📚 Librerías y Dependencias

### React Native Core
```javascript
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image,
  Dimensions
} from 'react-native';
```

### Navegación
```javascript
import { useNavigation, useRoute } from '@react-navigation/native';
```

### Iconos
```javascript
import { Ionicons } from '@expo/vector-icons';
```

### Componentes Personalizados
```javascript
import AddressSelector from '../components/AddressSelector';
```

### Servicios
```javascript
import * as providerService from '../services/providers';
import * as locationService from '../services/location';
```

### Constantes
```javascript
// Constantes generales (mantiene compatibilidad)
import { COLORS, SPACING, BORDERS, SHADOWS } from '../utils/constants';

// Tokens del design-system (recomendado para nuevos componentes)
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '../design-system/tokens';
```

## 🎨 Paleta de Colores

### Nueva Paleta de Colores (2025)

El sistema de diseño ahora utiliza una paleta de colores que proyecta **transparencia, calma, confianza, profesionalismo y claridad**.

#### Colores Base
- **White**: `#FFFFFF` - Brillante y absoluto
- **Ink Black**: `#00171F` - Ultra-oscuro con toque de azul
- **Deep Space Blue**: `#003459` - Azul oscuro infinito, cosmos
- **Cerulean**: `#007EA7` - Vibrante y acuático, vida y libertad
- **Fresh Sky**: `#00A8E8` - Cian brillante, optimismo y frescura

#### Colores Principales
```javascript
import { COLORS } from '../design-system/tokens';

// Primary - Deep Space Blue
COLORS.primary[500]  // #003459 - Color principal
COLORS.primary[300]  // Versión clara
COLORS.primary[700]  // Versión oscura

// Secondary - Cerulean
COLORS.secondary[500]  // #007EA7 - Color secundario

// Accent - Fresh Sky
COLORS.accent[500]  // #00A8E8 - Color de acento
```

#### Colores Semánticos
```javascript
// Success - Verde turquesa
COLORS.success[500]  // #00C9A7

// Warning - Amarillo dorado
COLORS.warning[500]  // #FFB84D

// Error - Rojo coral
COLORS.error[500]  // #FF6B6B

// Info - Cerulean
COLORS.info[500]  // #007EA7
```

#### Uso de Colores
```javascript
// Importar tokens
import { COLORS } from '../design-system/tokens';

// Colores de texto
COLORS.text.primary      // Ink Black - máximo contraste
COLORS.text.secondary    // Gris oscuro
COLORS.text.inverse      // Blanco para fondos oscuros

// Colores de fondo
COLORS.background.default  // Fondo principal
COLORS.background.paper    // Blanco para cards
COLORS.background.glass   // Glassmorphism

// Colores de borde
COLORS.border.light   // Bordes sutiles
COLORS.border.main    // Bordes estándar
COLORS.border.focus   // Fresh Sky - borde de foco
```

### Sistema de Tokens

El sistema de diseño incluye tokens completos para:

- **Colores**: Paleta completa con variaciones (50-900)
- **Tipografía**: Escalas de tamaño, pesos, line heights
- **Espaciado**: Sistema responsivo (xs, sm, md, lg, xl, 2xl, 3xl)
- **Sombras**: Niveles de elevación (none, sm, md, lg, xl)
- **Bordes**: Radios y widths predefinidos
- **Animaciones**: Duraciones y easing functions

Ver documentación completa en: `app/design-system/README.md`

## 📱 Estructura de Pantalla Estándar

### Layout Base
```javascript
<View style={styles.container}>
  <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
    
    {/* Header fijo */}
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#007AFF" />
      </TouchableOpacity>
      <Text style={styles.title}>Título de Pantalla</Text>
    </View>

    {/* Contenido principal */}
    <ScrollView 
      style={styles.content} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Contenido aquí */}
    </ScrollView>
  </SafeAreaView>
</View>
```

## 🏢 Pantalla de Detalles del Proveedor

### Estructura de Header con Imagen
```javascript
<View style={styles.headerContainer}>
  <View style={styles.headerImageContainer}>
    <Image
      source={{ uri: provider.foto || defaultImage }}
      style={styles.headerImage}
    />
    
    {/* Overlay del header */}
    <View style={styles.headerOverlay}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.favoriteButton}>
          <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  </View>
  
  {/* Información principal */}
  <View style={styles.mainInfoContainer}>
    <Text style={styles.providerName}>{provider.nombre}</Text>
    <Text style={styles.providerType}>
      {type === 'taller' ? 'Taller Automotriz' : 'Mecánico a Domicilio'}
    </Text>
  </View>
</View>
```

### Información Horizontal
```javascript
<View style={styles.infoRow}>
  {/* Ubicación (solo talleres) */}
  {type === 'taller' && (
    <View style={styles.infoItem}>
      <View style={styles.infoIconContainer}>
        <Ionicons name="location" size={20} color={COLORS.primary} />
      </View>
      <Text style={styles.infoLabel}>Ubicación</Text>
      <Text style={styles.infoValue}>{provider.direccion}</Text>
    </View>
  )}
  
  {/* Horarios */}
  <View style={styles.infoItem}>
    <View style={styles.infoIconContainer}>
      <Ionicons name="time" size={20} color={COLORS.primary} />
    </View>
    <Text style={styles.infoLabel}>Horario</Text>
    <Text style={styles.infoValue}>{formatHorario()}</Text>
  </View>
  
  {/* Calificación */}
  <View style={styles.infoItem}>
    <View style={styles.infoIconContainer}>
      <Ionicons name="star" size={20} color="#FFD700" />
    </View>
    <Text style={styles.infoLabel}>Calificación</Text>
    <Text style={styles.infoValue}>
      {provider.calificacion_promedio?.toFixed(1)} ({provider.total_resenas})
    </Text>
  </View>
</View>
```

### Categorías de Servicios
```javascript
<View style={styles.categoriesContainer}>
  {getUniqueCategories().map((categoria, index) => (
    <View key={index} style={styles.categoryItem}>
      <View style={styles.categoryIcon}>
        <Ionicons 
          name={getCategoryIcon(categoria)} 
          size={24} 
          color={COLORS.primary} 
        />
      </View>
      <Text style={styles.categoryText}>{categoria}</Text>
    </View>
  ))}
</View>
```

### Cards de Servicios
```javascript
<TouchableOpacity
  style={styles.serviceCard}
  onPress={() => handleServicePress(servicio)}
  activeOpacity={0.8}
>
  <View style={styles.serviceHeader}>
    <View style={styles.serviceIcon}>
      <Ionicons 
        name={getCategoryIcon(servicio.categoria)} 
        size={20} 
        color={COLORS.secondary} 
      />
    </View>
    <View style={styles.serviceInfo}>
      <Text style={styles.serviceName}>{servicio.nombre}</Text>
      <Text style={styles.serviceCategory}>{servicio.categoria}</Text>
    </View>
    <View style={styles.servicePriceContainer}>
      <Text style={styles.servicePrice}>
        ${servicio.precio?.toLocaleString()}
      </Text>
      {servicio.duracion && (
        <Text style={styles.serviceDuration}>{servicio.duracion}</Text>
      )}
    </View>
  </View>
  
  {servicio.descripcion && (
    <Text style={styles.serviceDescription} numberOfLines={2}>
      {servicio.descripcion}
    </Text>
  )}
  
  <View style={styles.serviceFooter}>
    <View style={styles.serviceFeatures}>
      {servicio.incluye && (
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={styles.featureText}>Incluye materiales</Text>
        </View>
      )}
      {servicio.garantia && (
        <View style={styles.featureItem}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
          <Text style={styles.featureText}>Garantía</Text>
        </View>
      )}
    </View>
    <TouchableOpacity style={styles.agendarButton}>
      <Text style={styles.agendarButtonText}>Agendar</Text>
    </TouchableOpacity>
  </View>
</TouchableOpacity>
```

### Botones Fijos Inferiores
```javascript
<View style={styles.bottomActions}>
  <TouchableOpacity style={styles.contactButton}>
    <Ionicons name="call" size={20} color={COLORS.primary} />
    <Text style={styles.contactButtonText}>Contactar</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.bookButton}>
    <Ionicons name="calendar" size={20} color="#FFFFFF" />
    <Text style={styles.bookButtonText}>Agendar Servicio</Text>
  </TouchableOpacity>
</View>
```

## 🔍 Componente de Búsqueda

### Estructura
```javascript
<View style={styles.searchCard}>
  <View style={styles.searchInputContainer}>
    <Ionicons name="search-outline" size={20} color="#666666" style={styles.searchIcon} />
    <TextInput
      style={styles.searchInput}
      placeholder="Buscar..."
      placeholderTextColor="#666666"
      value={searchQuery}
      onChangeText={setSearchQuery}
    />
    {searchQuery.length > 0 && (
      <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
        <Ionicons name="close-circle" size={20} color="#666666" />
      </TouchableOpacity>
    )}
  </View>
</View>
```

### Estilos
```javascript
searchCard: {
  backgroundColor: 'white',
  marginHorizontal: 15,
  borderRadius: 10,
  padding: 15,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
searchInputContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F8F9FA',
  borderRadius: 8,
  paddingHorizontal: 12,
  height: 44,
},
searchInput: {
  flex: 1,
  fontSize: 16,
  color: '#333333',
  paddingVertical: 0,
}
```

## 🏷️ Sistema de Filtros

### Opciones de Filtro
```javascript
const filterOptions = [
  { id: 'todos', name: 'Mostrar Todos', icon: 'grid-outline', type: 'reset' },
  { id: 'distancia', name: 'Distancia', icon: 'location-outline', type: 'sort' },
  { id: 'calificacion', name: 'Calificación', icon: 'star-outline', type: 'sort' },
  { id: 'precio', name: 'Precio', icon: 'cash-outline', type: 'sort' }
];
```

### Componente de Filtros
```javascript
<ScrollView 
  horizontal 
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.filtersContainer}
>
  {filterOptions.map((item) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.filterChip,
        isActive && styles.filterChipActive,
        item.type === 'reset' && styles.resetChip
      ]}
      onPress={() => handleFilterPress(item)}
    >
      <Ionicons
        name={item.icon}
        size={16}
        color={isActive ? '#FFFFFF' : COLORS.primary}
        style={styles.filterIcon}
      />
      <Text style={[
        styles.filterText,
        isActive && styles.filterTextActive
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>
```

## 🃏 Tarjetas de Proveedor

### Estructura Base
```javascript
const renderProviderCard = (provider) => (
  <TouchableOpacity
    key={provider.id}
    style={styles.providerCard}
    onPress={() => navigation.navigate('ProviderDetail', {
      provider: provider,
      type: type // 'taller' o 'mecanico'
    })}
    activeOpacity={0.8}
  >
    {/* Header con nombre y calificación */}
    <View style={styles.providerHeader}>
      <View style={styles.providerInfo}>
        <Text style={styles.providerName} numberOfLines={1}>
          {provider.nombre}
        </Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.rating}>
            {provider.calificacion_promedio?.toFixed(1) || 'N/A'}
          </Text>
          <Text style={styles.reviewCount}>
            ({provider.total_resenas || 0})
          </Text>
        </View>
      </View>
      <View style={styles.distanceContainer}>
        <Ionicons name="location-outline" size={14} color="#666666" />
        <Text style={styles.distance}>
          {provider.distancia ? `${provider.distancia.toFixed(1)} km` : 'N/A'}
        </Text>
      </View>
    </View>
    
    {/* Descripción */}
    <Text style={styles.providerDescription} numberOfLines={2}>
      {provider.descripcion}
    </Text>
    
    {/* Servicios */}
    <View style={styles.serviciosContainer}>
      <Text style={styles.serviciosTitle}>Servicios:</Text>
      <View style={styles.serviciosTags}>
        {provider.servicios?.slice(0, 3).map((servicio, index) => (
          <View key={index} style={styles.servicioTag}>
            <Text style={styles.servicioTagText}>{servicio.nombre}</Text>
          </View>
        ))}
      </View>
    </View>
    
    {/* Precios */}
    <View style={styles.priceContainer}>
      <Text style={styles.priceLabel}>Desde:</Text>
      <Text style={styles.price}>
        ${provider.precio_minimo?.toLocaleString() || 'Consultar'}
      </Text>
    </View>
  </TouchableOpacity>
);
```

## 🏷️ Sistema de Tags

### Tags de Servicios
```javascript
const ServiceTag = ({ text, variant = 'primary' }) => (
  <View style={[
    styles.serviceTag,
    variant === 'secondary' && styles.serviceTagSecondary
  ]}>
    <Text style={[
      styles.serviceTagText,
      variant === 'secondary' && styles.serviceTagTextSecondary
    ]}>
      {text}
    </Text>
  </View>
);
```

### Estilos de Tags
```javascript
serviceTag: {
  backgroundColor: COLORS.primary,
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 12,
},
serviceTagSecondary: {
  backgroundColor: '#E3F2FD',
  borderWidth: 1,
  borderColor: COLORS.secondary,
},
serviceTagText: {
  fontSize: 12,
  color: '#FFFFFF',
  fontWeight: '500',
}
```

## 🔄 Estados de Carga

### Loading Component
```javascript
const LoadingState = ({ message = 'Cargando...' }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);
```

### Error Component
```javascript
const ErrorState = ({ title, message, onRetry }) => (
  <View style={styles.errorContainer}>
    <Ionicons name="warning-outline" size={60} color={COLORS.warning} />
    <Text style={styles.errorTitle}>{title}</Text>
    <Text style={styles.errorText}>{message}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryButtonText}>Reintentar</Text>
    </TouchableOpacity>
  </View>
);
```

### Empty State
```javascript
const EmptyState = ({ icon, title, message }) => (
  <View style={styles.emptyCard}>
    <Ionicons name={icon} size={60} color="#666666" />
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);
```

## 🎯 Navegación entre Pantallas

### Navegación a Detalles
```javascript
// En TalleresScreen.js
const handleTallerPress = (taller) => {
  navigation.navigate('ProviderDetail', {
    provider: taller,
    type: 'taller'
  });
};

// En MecanicosScreen.js  
const handleMecanicoPress = (mecanico) => {
  navigation.navigate('ProviderDetail', {
    provider: mecanico,
    type: 'mecanico'
  });
};
```

### Obtener Parámetros en Pantalla de Destino
```javascript
const ProviderDetailScreen = () => {
  const route = useRoute();
  const { provider, type } = route.params; // type: 'taller' o 'mecanico'
  
  // Usar provider y type para mostrar información específica
};
```

## 📊 Hooks Personalizados

### useProviderFilters
```javascript
const useProviderFilters = (providers, selectedCategory, searchQuery, sortBy) => {
  return useCallback(() => {
    let filtered = [...providers];
    
    // Filtrar por categoría
    if (selectedCategory) {
      filtered = filtered.filter(provider =>
        provider.servicios?.some(servicio => servicio.categoria === selectedCategory)
      );
    }
    
    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(provider =>
        provider.nombre?.toLowerCase().includes(query) ||
        provider.descripcion?.toLowerCase().includes(query)
      );
    }
    
    // Ordenar
    if (sortBy !== 'todos') {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'distancia':
            return (a.distancia || 0) - (b.distancia || 0);
          case 'calificacion':
            return (b.calificacion_promedio || 0) - (a.calificacion_promedio || 0);
          case 'precio':
            return (a.precio_minimo || 0) - (b.precio_minimo || 0);
          default:
            return 0;
        }
      });
    }
    
    return filtered;
  }, [providers, selectedCategory, searchQuery, sortBy]);
};
```

## 🎯 Patrones de Estado

### Estado Principal
```javascript
const [data, setData] = useState([]);
const [filteredData, setFilteredData] = useState([]);
const [categorias, setCategorias] = useState([]);
const [selectedCategoria, setSelectedCategoria] = useState(null);
const [searchQuery, setSearchQuery] = useState('');
const [sortBy, setSortBy] = useState('distancia');
const [currentAddress, setCurrentAddress] = useState(null);

// Estados de carga
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [error, setError] = useState(null);
```

### Carga de Datos
```javascript
const loadInitialData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const address = await locationService.getMainAddress();
    setCurrentAddress(address);
    
    const data = await providerService.getData();
    setData(data || []);
    
    // Extraer categorías
    const categoriasSet = new Set();
    data?.forEach(item => {
      item.servicios?.forEach(servicio => {
        if (servicio.categoria) {
          categoriasSet.add(servicio.categoria);
        }
      });
    });
    
    setCategorias(Array.from(categoriasSet).map(cat => ({ 
      id: cat, 
      name: cat, 
      type: 'categoria' 
    })));
    
  } catch (error) {
    console.error('Error al cargar datos:', error);
    setError('No se pudieron cargar los datos. Intenta de nuevo.');
  } finally {
    setLoading(false);
  }
};
```

## 📐 Estilos Base

### Container Styles
```javascript
const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginHorizontal: 15,
    marginBottom: 15,
  }
});
```

### Card Styles
```javascript
const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  }
});
```

### Provider Detail Styles
```javascript
const detailStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: 'white',
  },
  headerImageContainer: {
    position: 'relative',
    height: 250,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E5E5',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  infoRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  serviceCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  }
});
```

## 🔧 Utilidades

### Formatters
```javascript
const formatPrice = (price) => {
  return price ? `$${price.toLocaleString()}` : 'Consultar';
};

const formatDistance = (distance) => {
  return distance ? `${distance.toFixed(1)} km` : 'N/A';
};

const formatRating = (rating) => {
  return rating ? rating.toFixed(1) : 'N/A';
};

const formatHorario = (type, provider) => {
  if (type === 'mecanico') {
    return provider.disponible ? 'Disponible 24/7' : 'No disponible';
  }
  
  const hoy = new Date().getDay();
  const horarios = provider.horarios || {
    lunes_viernes: '09:00 - 18:00',
    sabado: '09:00 - 14:00',
    domingo: 'Cerrado'
  };
  
  if (hoy === 0) return `Hoy: ${horarios.domingo}`;
  if (hoy === 6) return `Hoy: ${horarios.sabado}`;
  return `Hoy: ${horarios.lunes_viernes}`;
};
```

### Icon Mappings
```javascript
const getCategoryIcon = (categoria) => {
  switch (categoria?.toLowerCase()) {
    case 'cambio de aceite':
    case 'mantenimiento':
      return 'water-outline';
    case 'frenos':
      return 'disc-outline';
    case 'motor':
      return 'cog-outline';
    case 'transmisión':
      return 'settings-outline';
    case 'suspensión':
      return 'car-outline';
    case 'eléctrico':
      return 'flash-outline';
    case 'aire acondicionado':
      return 'snow-outline';
    case 'neumáticos':
      return 'ellipse-outline';
    default:
      return 'build-outline';
  }
};
```

### Constants
```javascript
const SCREEN_CONSTANTS = {
  PADDING_HORIZONTAL: 15,
  BORDER_RADIUS: 10,
  SHADOW_CONFIG: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  HEADER_HEIGHT: 250,
  INFO_ICON_SIZE: 40,
  CATEGORY_ICON_SIZE: 50
};
```

## 📝 Notas de Implementación

1. **Consistencia de Colores**: Usar siempre las constantes de COLORS para mantener consistencia
2. **Sombras**: Aplicar el mismo config de sombras en todas las tarjetas
3. **Iconos**: Usar Ionicons de forma consistente con mapping por categoría
4. **Estados de Carga**: Implementar loading, error y empty states en todas las pantallas
5. **Navegación**: Mantener el patrón de header con botón de regreso
6. **RefreshControl**: Implementar en todas las listas scrolleables
7. **Búsqueda**: Usar el mismo componente de búsqueda en todas las pantallas
8. **Filtros**: Mantener la estructura horizontal de chips de filtros
9. **Detalles del Proveedor**: Diferenciar entre talleres y mecánicos (ubicación vs domicilio)
10. **Responsive**: Usar Dimensions para elementos que requieren cálculos de anchura

## 🎨 Componentes del Sistema de Diseño

### Componentes Base

El sistema incluye componentes reutilizables en `app/design-system/components/`:

#### Badge
```javascript
import Badge from '../design-system/components/base/Badge/Badge';

<Badge variant="primary" size="md">Nuevo</Badge>
```

#### Avatar
```javascript
import Avatar from '../design-system/components/base/Avatar/Avatar';

<Avatar source={imageUrl} size="md" variant="circular" />
```

#### Button
```javascript
import Button from '../design-system/components/base/Button/Button';

<Button 
  title="Continuar" 
  type="primary" 
  onPress={handlePress}
  useGradient={true}
/>
```

#### Card
```javascript
import Card from '../design-system/components/base/Card/Card';

<Card variant="default" onPress={handlePress}>
  <Text>Contenido</Text>
</Card>
```

#### Input
```javascript
import Input from '../design-system/components/base/Input/Input';

<Input
  label="Email"
  placeholder="tu@email.com"
  value={email}
  onChangeText={setEmail}
/>
```

### Componentes de Layout

#### Container
```javascript
import Container from '../design-system/components/layout/Container/Container';

<Container variant="default" safeArea>
  <Text>Contenido</Text>
</Container>
```

#### Grid
```javascript
import Grid from '../design-system/components/layout/Grid/Grid';

<Grid columns={3} spacing={16}>
  <View>Item 1</View>
  <View>Item 2</View>
</Grid>
```

### Componentes de Feedback

#### Toast
```javascript
import Toast from '../design-system/components/feedback/Toast/Toast';

<Toast
  message="Operación exitosa"
  variant="success"
  position="top"
  visible={showToast}
/>
```

#### Skeleton
```javascript
import Skeleton from '../design-system/components/feedback/Skeleton/Skeleton';

<Skeleton width="100%" height={20} />
```

### Componentes de Navegación

#### Header
```javascript
import Header from '../design-system/components/navigation/Header/Header';

<Header
  title="Mi Pantalla"
  showBack={true}
  showProfile={true}
/>
```

#### Tabs
```javascript
import Tabs from '../design-system/components/navigation/Tabs/Tabs';

<Tabs
  tabs={[
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2' }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

## 🔄 Guía de Migración

### Migrar Componentes Existentes

1. **Importar tokens**:
```javascript
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '../design-system/tokens';
```

2. **Reemplazar colores hardcodeados**:
```javascript
// Antes
backgroundColor: '#007AFF'

// Después
backgroundColor: COLORS.primary[500]
```

3. **Usar componentes del sistema**:
```javascript
// Antes
<TouchableOpacity style={styles.button}>
  <Text>Continuar</Text>
</TouchableOpacity>

// Después
<Button title="Continuar" type="primary" onPress={handlePress} />
```

Ver guía completa en: `app/design-system/README.md`

## 🚀 Próximos Pasos

- ✅ Sistema de tokens completo implementado
- ✅ Componentes base creados
- ✅ Theme Provider implementado
- 🔄 Migrar componentes existentes gradualmente
- 🔄 Actualizar pantallas para usar nueva paleta
- 🔄 Documentar patrones de animaciones y transiciones
- 🔄 Agregar navegación a pantalla de agendamiento desde detalles del proveedor
- 🔄 Implementar funcionalidad de favoritos y compartir 