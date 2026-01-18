# 📁 Componentes - MecaniMóvil

## ✅ Estructura Consolidada

Todos los componentes están organizados en **una sola carpeta** `app/components/` siguiendo el patrón del sistema de diseño. **Sin duplicaciones ni wrappers innecesarios**.

## 📂 Estructura de Carpetas

```
app/components/
├── base/              # Componentes base del design-system
│   ├── Avatar/
│   ├── Badge/
│   ├── Button/
│   ├── Card/
│   ├── Divider/
│   ├── Icon/
│   ├── Input/
│   ├── Progress/
│   └── Tags/
│
├── layout/            # Componentes de layout
│   ├── Container/
│   ├── Grid/
│   └── List/
│
├── feedback/          # Componentes de feedback
│   ├── Modal/
│   ├── Skeleton/
│   ├── Toast/
│   └── Tooltip/
│
├── navigation/         # Componentes de navegación
│   ├── Header/
│   ├── Menu/
│   └── Tabs/
│
├── forms/             # Componentes de formularios
│   ├── AddressSelector.js
│   ├── AddressSuggestions.js
│   ├── SearchBar.js
│   ├── Slider/
│   └── Switch/
│
├── cards/             # Componentes de tarjetas
│   ├── CategoriesHierarchy.js
│   ├── CategoryCards.js
│   ├── CategoryGridCard.js
│   ├── MaintenanceAlertCard.js
│   ├── NearbyMecanicoCard.js
│   ├── NearbyTallerCard.js
│   ├── ProviderCard.js
│   ├── ServiceCard.js
│   ├── ServiceCategoryCard.js
│   └── SimpleServiceCard.js
│
├── modals/            # Componentes modales
│   ├── ChecklistViewerModal.js
│   ├── FiltersModal.js
│   ├── ProviderModal.js
│   ├── ServiceDetailModal.js
│   └── VehicleSelectionModal.js
│
├── providers/         # Componentes relacionados con proveedores
│   └── ProvidersList.js
│
├── vehicles/           # Componentes relacionados con vehículos
│   ├── VehicleHealthCard.js
│   ├── VehicleHistoryCard.js
│   ├── VehicleSelector.js
│   └── VehicleValidationMessage.js
│
├── utils/             # Componentes utilitarios
│   ├── ConnectionStatusIndicator.js
│   ├── GlassmorphicContainer.js
│   ├── ResponsiveContainer.js
│   ├── SplashScreen.js
│   ├── SwipeableHorizontalList.js
│   └── UserPanelSkeleton.js
│
├── solicitudes/       # Componentes de solicitudes
│   ├── EstadoSolicitudBadge.js
│   ├── FormularioSolicitud.js
│   ├── RechazoCard.js
│   └── SolicitudCard.js
│
├── ofertas/          # Componentes de ofertas
│   ├── ChatBubble.js
│   ├── ComparadorOfertas.js
│   ├── OfertaCard.js
│   └── RepuestosExpandible.js
│
├── booking/          # Componentes de booking
│   ├── CartItemCard.js
│   └── VehicleCartAccordion.js
│
└── agendamiento/     # Componentes de agendamiento
```

## 🔄 Imports Recomendados

### Componentes Base (Design System)
```javascript
// ✅ Ruta completa y única
import Button from '../components/base/Button/Button';
import Card from '../components/base/Card/Card';
import Input from '../components/base/Input/Input';
import Skeleton from '../components/feedback/Skeleton/Skeleton';
import Header from '../components/navigation/Header/Header';
```

### Componentes Organizados
```javascript
// Cards
import ProviderCard from '../components/cards/ProviderCard';
import ServiceCard from '../components/cards/ServiceCard';
import NearbyTallerCard from '../components/cards/NearbyTallerCard';
import NearbyMecanicoCard from '../components/cards/NearbyMecanicoCard';

// Modals
import ProviderModal from '../components/modals/ProviderModal';
import FiltersModal from '../components/modals/FiltersModal';
import VehicleSelectionModal from '../components/modals/VehicleSelectionModal';

// Forms
import AddressSelector from '../components/forms/AddressSelector';
import SearchBar from '../components/forms/SearchBar';

// Vehicles
import VehicleSelector from '../components/vehicles/VehicleSelector';
import VehicleHealthCard from '../components/vehicles/VehicleHealthCard';

// Utils
import ResponsiveContainer from '../components/utils/ResponsiveContainer';
import SplashScreen from '../components/utils/SplashScreen';
import ConnectionStatusIndicator from '../components/utils/ConnectionStatusIndicator';
```

## 🎨 Uso de Tokens del Design System

Todos los componentes usan tokens del design-system:

```javascript
// Opción 1: Importar tokens directamente
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../design-system/tokens';

// Opción 2: Usar el hook useTheme (recomendado)
import { useTheme } from '../../design-system/theme/useTheme';

const MyComponent = () => {
  const { colors, typography, spacing, borders, shadows } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.background.default, padding: spacing.md }}>
      <Text style={{ fontSize: typography.fontSize.md, color: colors.text.primary }}>
        Contenido
      </Text>
    </View>
  );
};
```

## ✅ Principios de Organización

1. **Una sola carpeta** - No hay duplicación, todo está en `app/components/`
2. **Organización clara** - Cada componente está en su categoría funcional
3. **Sin duplicados** - Cada componente existe solo una vez
4. **Estructura armoniosa** - Sigue el patrón del sistema de diseño
5. **Fácil de encontrar** - Estructura lógica y predecible
6. **Escalable** - Fácil agregar nuevos componentes

## 📊 Estadísticas

- **Componentes base**: 9
- **Componentes de layout**: 3
- **Componentes de feedback**: 4
- **Componentes de navegación**: 3
- **Componentes de formularios**: 5
- **Cards**: 10
- **Modals**: 5
- **Providers**: 1
- **Vehicles**: 4
- **Utils**: 6
- **Solicitudes**: 4
- **Ofertas**: 4
- **Booking**: 2
- **Agendamiento**: (variados)

**Total**: ~60+ componentes organizados

## 🚫 Eliminado

- ❌ `app/design-system/components/` - **Eliminado** (duplicado)
- ❌ Componentes sueltos en la raíz - **Eliminados** (duplicados)
- ❌ Wrappers de compatibilidad - **Eliminados** (no se estaban usando)
- ✅ **Estructura limpia sin duplicaciones**

## 📚 Documentación Relacionada

- **Tokens**: `app/design-system/tokens/`
- **Theme Provider**: `app/design-system/theme/`
- **Componentes**: `app/components/` (esta carpeta)
