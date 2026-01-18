# 📦 Componentes - MecaniMóvil

## ✅ Estructura Final Organizada

Todos los componentes están organizados en carpetas por categoría funcional. **Solo quedan 6 wrappers en la raíz** para compatibilidad hacia atrás.

## 📂 Estructura Completa

```
app/components/
├── base/              # 9 componentes base del design-system
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
├── layout/            # 3 componentes de layout
│   ├── Container/
│   ├── Grid/
│   └── List/
│
├── feedback/          # 4 componentes de feedback
│   ├── Modal/
│   ├── Skeleton/
│   ├── Toast/
│   └── Tooltip/
│
├── navigation/         # 3 componentes de navegación
│   ├── Header/
│   ├── Menu/
│   └── Tabs/
│
├── forms/             # 5 componentes de formularios
│   ├── AddressSelector.js
│   ├── AddressSuggestions.js
│   ├── SearchBar.js
│   ├── Slider/
│   └── Switch/
│
├── cards/             # 9 componentes de tarjetas
│   ├── CategoryCards.js
│   ├── CategoryGridCard.js
│   ├── CategoriesHierarchy.js
│   ├── MaintenanceAlertCard.js
│   ├── NearbyMecanicoCard.js
│   ├── NearbyTallerCard.js
│   ├── ProviderCard.js
│   ├── ServiceCard.js
│   ├── ServiceCategoryCard.js
│   └── SimpleServiceCard.js
│
├── modals/            # 5 componentes modales
│   ├── ChecklistViewerModal.js
│   ├── FiltersModal.js
│   ├── ProviderModal.js
│   ├── ServiceDetailModal.js
│   └── VehicleSelectionModal.js
│
├── providers/         # 1 componente de proveedores
│   └── ProvidersList.js
│
├── vehicles/           # 4 componentes de vehículos
│   ├── VehicleHealthCard.js
│   ├── VehicleHistoryCard.js
│   ├── VehicleSelector.js
│   └── VehicleValidationMessage.js
│
├── utils/             # 6 componentes utilitarios
│   ├── ConnectionStatusIndicator.js
│   ├── GlassmorphicContainer.js
│   ├── ResponsiveContainer.js
│   ├── SplashScreen.js
│   ├── SwipeableHorizontalList.js
│   └── UserPanelSkeleton.js
│
├── solicitudes/       # Componentes de solicitudes (ya existía)
├── ofertas/          # Componentes de ofertas (ya existía)
├── booking/          # Componentes de booking (ya existía)
└── agendamiento/     # Componentes de agendamiento (ya existía)
```

## 📝 Wrappers de Compatibilidad (Raíz)

**Solo 6 archivos en la raíz** - Son wrappers que reexportan componentes organizados:

- `Button.js` → Reexporta `base/Button/Button.js`
- `Card.js` → Reexporta `base/Card/Card.js`
- `Input.js` → Reexporta `base/Input/Input.js`
- `Skeleton.js` → Reexporta `feedback/Skeleton/Skeleton.js`
- `CustomHeader.js` → Reexporta `navigation/Header/Header.js`
- `Header.js` → Reexporta `navigation/Header/Header.js`

**Estos wrappers mantienen compatibilidad hacia atrás** - Todos los imports existentes siguen funcionando.

## 🔄 Imports Actualizados

### ✅ Componentes Base (Recomendado)
```javascript
import Button from '../components/base/Button/Button';
import Card from '../components/base/Card/Card';
import Input from '../components/base/Input/Input';
```

### ✅ Componentes Organizados
```javascript
// Cards
import ProviderCard from '../components/cards/ProviderCard';
import ServiceCard from '../components/cards/ServiceCard';
import NearbyTallerCard from '../components/cards/NearbyTallerCard';

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
import UserPanelSkeleton from '../components/utils/UserPanelSkeleton';
```

### ✅ Compatibilidad (Funciona pero no recomendado)
```javascript
// Estos wrappers siguen funcionando
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import CustomHeader from '../components/CustomHeader';
```

## 📊 Estadísticas

- **Componentes base**: 9
- **Componentes de layout**: 3
- **Componentes de feedback**: 4
- **Componentes de navegación**: 3
- **Componentes de formularios**: 5
- **Cards**: 9
- **Modals**: 5
- **Providers**: 1
- **Vehicles**: 4
- **Utils**: 6
- **Wrappers**: 6

**Total**: ~50+ componentes organizados en estructura clara

## ✅ Beneficios

1. **Organización clara** - Cada componente está en su categoría
2. **Sin duplicación** - Un solo lugar para cada componente
3. **Fácil de encontrar** - Estructura lógica y predecible
4. **Escalable** - Fácil agregar nuevos componentes
5. **Mantenible** - Estructura consistente
6. **Sin breaking changes** - Wrappers mantienen compatibilidad

## 📚 Documentación Relacionada

- **Organización detallada**: Ver `ORGANIZATION.md`
- **Estructura**: Ver `STRUCTURE.md`
- **Estrategia de migración**: Ver `MIGRATION_STRATEGY.md`
- **Tokens del design-system**: Ver `../design-system/tokens/`
- **Theme Provider**: Ver `../design-system/theme/`
