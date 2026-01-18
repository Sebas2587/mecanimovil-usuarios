import * as vehicleService from '../services/vehicle';

/**
 * Validador de servicios por vehículos del cliente
 * Asegura que solo se muestren servicios compatibles con los vehículos registrados
 */
class VehicleServiceValidator {
  constructor() {
    this.userVehicles = [];
    this.userModels = [];
    this.userBrands = [];
    this.userVehicleStrings = []; // Strings completos "Marca Modelo"
    this.initialized = false;
  }

  /**
   * Inicializar el validador con los vehículos del usuario
   */
  async initialize() {
    try {
      console.log('🚗 Inicializando validador de servicios por vehículos...');
      
      // Obtener vehículos del usuario
      this.userVehicles = await vehicleService.getUserVehicles();
      
      if (!this.userVehicles || this.userVehicles.length === 0) {
        console.log('⚠️ Usuario no tiene vehículos registrados');
        this.userModels = [];
        this.userBrands = [];
        this.userVehicleStrings = [];
        this.initialized = true;
        return false;
      }

      // Extraer modelos, marcas y strings completos únicos
      this.userModels = [...new Set(this.userVehicles.map(v => v.modelo).filter(Boolean))];
      this.userBrands = [...new Set(this.userVehicles.map(v => v.marca_nombre).filter(Boolean))];
      
      // Crear strings completos de vehículos para comparación exacta
      this.userVehicleStrings = [...new Set(this.userVehicles.map(v => {
        const marca = v.marca_nombre || '';
        const modelo = v.modelo_nombre || '';
        return `${marca} ${modelo}`.trim();
      }).filter(str => str.length > 0))];

      console.log('✅ Validador inicializado:', {
        vehiculos: this.userVehicles.length,
        modelos: this.userModels.length,
        marcas: this.userBrands.length,
        vehiculosCompletos: this.userVehicleStrings
      });

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Error inicializando validador:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Verificar si el usuario tiene vehículos registrados
   */
  hasVehicles() {
    return this.userVehicles && this.userVehicles.length > 0;
  }

  /**
   * Obtener vehículos del usuario
   */
  getUserVehicles() {
    return this.userVehicles;
  }

  /**
   * Verificar si un servicio es compatible con los vehículos del usuario
   * NUEVA LÓGICA: Un servicio es compatible si:
   * 1. Tiene modelos específicos que coinciden con los vehículos del usuario, O
   * 2. No tiene modelos específicos (servicio general) pero el proveedor es especialista
   */
  isServiceCompatible(service) {
    if (!this.hasVehicles()) {
      console.log('❌ Usuario sin vehículos - servicio no compatible');
      return false;
    }

    // Si el servicio NO tiene modelos específicos, considerarlo compatible
    // (la especialidad se evaluará a nivel del proveedor)
    if (!service.modelos_info || service.modelos_info.length === 0) {
      console.log(`✅ Servicio "${service.nombre}" sin modelos específicos - compatible (evaluación por proveedor)`);
      return true;
    }

    // Si el servicio SÍ tiene modelos específicos, verificar coincidencia exacta
    const isCompatible = service.modelos_info.some(modelo => {
      const marcaNombre = modelo.marca_nombre || '';
      const modeloNombre = modelo.nombre || modelo.modelo_nombre || '';
      const vehiculoCompleto = `${marcaNombre} ${modeloNombre}`.trim();
      
      // Comparación exacta con los vehículos del usuario
      const exactMatch = this.userVehicleStrings.some(userVehicle => 
        userVehicle.toLowerCase() === vehiculoCompleto.toLowerCase()
      );
      
      if (exactMatch) {
        console.log(`✅ Coincidencia exacta encontrada: "${vehiculoCompleto}" para servicio "${service.nombre}"`);
      }
      
      return exactMatch;
    });

    if (!isCompatible) {
      console.log(`❌ Servicio "${service.nombre}" con modelos específicos NO compatible:`, {
        servicioModelos: service.modelos_info.map(m => `${m.marca_nombre} ${m.nombre}`),
        usuarioVehiculos: this.userVehicleStrings
      });
    }

    return isCompatible;
  }

  /**
   * Verificar si un proveedor es compatible con un vehículo específico
   * NUEVA LÓGICA CONTEXTUAL: Evalúa compatibilidad por vehículo individual
   */
  isProviderCompatibleWithVehicle(provider, vehicle) {
    const vehicleString = `${vehicle.marca_nombre} ${vehicle.modelo_nombre}`;
    const vehicleBrand = vehicle.marca_nombre;
    
    console.log(`🔍 Evaluando ${provider.nombre} para vehículo específico: ${vehicleString}`);
    
    let isCompatible = false;
    let isSpecialist = false;
    let reason = '';
    let specialtyLevel = 'none'; // 'brand', 'model', 'service', 'general'
    
    // 1. Verificar si el proveedor es especialista en la marca del vehículo
    if (provider.especialidades_modelos && provider.especialidades_modelos.length > 0) {
      isSpecialist = provider.especialidades_modelos.some(especialidad => {
        const especialidadLower = especialidad.toLowerCase().trim();
        const vehicleBrandLower = vehicleBrand.toLowerCase().trim();
        const vehicleStringLower = vehicleString.toLowerCase().trim();
        
        // Verificar coincidencia exacta completa (modelo específico)
        if (especialidadLower === vehicleStringLower) {
          specialtyLevel = 'model';
          return true;
        }
        
        // Verificar coincidencia de marca
        if (especialidadLower === vehicleBrandLower) {
          specialtyLevel = 'brand';
          return true;
        }
        
        return false;
      });
      
      if (isSpecialist) {
        isCompatible = true;
        if (specialtyLevel === 'model') {
          reason = `Especialista en ${vehicleString}`;
        } else if (specialtyLevel === 'brand') {
          reason = `Especialista en ${vehicleBrand}`;
        }
        console.log(`✅ ${provider.nombre} ES ESPECIALISTA para ${vehicleString} (nivel: ${specialtyLevel})`);
      }
    }
    
    // 2. Si no es especialista, verificar si ofrece servicios compatibles
    if (!isCompatible && provider.servicios && provider.servicios.length > 0) {
      const hasCompatibleService = provider.servicios.some(service => {
        // Si el servicio no tiene modelos específicos, es compatible
        if (!service.modelos_info || service.modelos_info.length === 0) {
          return true;
        }
        
        // Si el servicio tiene modelos específicos, verificar coincidencia
        return service.modelos_info.some(modelo => {
          const serviceMarca = modelo.marca_nombre || '';
          const serviceModelo = modelo.nombre || modelo.modelo_nombre || '';
          const serviceVehicle = `${serviceMarca} ${serviceModelo}`.trim();
          
          return serviceVehicle.toLowerCase() === vehicleString.toLowerCase();
        });
      });
      
      if (hasCompatibleService) {
        isCompatible = true;
        specialtyLevel = 'service';
        reason = 'Servicios disponibles';
        console.log(`✅ ${provider.nombre} OFRECE SERVICIOS COMPATIBLES para ${vehicleString}`);
      }
    }
    
    // 3. NUEVA LÓGICA: Si el proveedor no tiene especialidades específicas, considerarlo compatible
    // (proveedores generales que pueden atender cualquier vehículo)
    if (!isCompatible && (!provider.especialidades_modelos || provider.especialidades_modelos.length === 0)) {
      isCompatible = true;
      specialtyLevel = 'general';
      reason = 'Servicios generales';
      console.log(`✅ ${provider.nombre} OFRECE SERVICIOS GENERALES para ${vehicleString}`);
    }
    
    if (!isCompatible) {
      console.log(`❌ ${provider.nombre} NO ES COMPATIBLE para ${vehicleString}`);
    }
    
    return {
      isCompatible,
      isSpecialist,
      reason,
      specialtyLevel,
      vehicle: vehicleString,
      vehicleBrand: vehicleBrand
    };
  }

  /**
   * Verificar si un proveedor ofrece servicios compatibles con los vehículos del usuario
   * NUEVA LÓGICA: Un proveedor es compatible si es compatible con AL MENOS UN vehículo
   */
  isProviderCompatible(provider) {
    if (!this.hasVehicles()) {
      console.log('❌ Usuario sin vehículos - proveedor no compatible');
      return false;
    }

    console.log(`🔍 Evaluando compatibilidad del proveedor: ${provider.nombre}`);

    // Evaluar compatibilidad con cada vehículo del usuario
    const vehicleCompatibility = this.userVehicles.map(vehicle => 
      this.isProviderCompatibleWithVehicle(provider, vehicle)
    );
    
    // El proveedor es compatible si es compatible con al menos un vehículo
    const isCompatible = vehicleCompatibility.some(compat => compat.isCompatible);
    
    if (isCompatible) {
      // Agregar información de compatibilidad al proveedor
      provider.vehicle_compatibility = vehicleCompatibility;
      
      // Determinar si es especialista para algún vehículo
      const isSpecialistForAny = vehicleCompatibility.some(compat => compat.isSpecialist);
      provider.es_especialista_usuario = isSpecialistForAny;
      
      // Crear badges específicos y detallados
      const specialistVehicles = vehicleCompatibility
        .filter(compat => compat.isSpecialist)
        .map(compat => ({
          vehicle: compat.vehicle,
          brand: compat.vehicleBrand,
          level: compat.specialtyLevel
        }));
      
      const serviceOnlyVehicles = vehicleCompatibility
        .filter(compat => compat.isCompatible && !compat.isSpecialist)
        .map(compat => compat.vehicle);
      
      const generalVehicles = vehicleCompatibility
        .filter(compat => compat.specialtyLevel === 'general')
        .map(compat => compat.vehicle);
      
      // Crear badge principal
      if (specialistVehicles.length > 0) {
        // Agrupar por marca para badges más limpios
        const brandGroups = {};
        specialistVehicles.forEach(sv => {
          if (!brandGroups[sv.brand]) {
            brandGroups[sv.brand] = [];
          }
          brandGroups[sv.brand].push(sv);
        });
        
        const brandNames = Object.keys(brandGroups);
        if (brandNames.length === 1) {
          // Una sola marca
          const brand = brandNames[0];
          const vehiclesInBrand = brandGroups[brand];
          
          if (vehiclesInBrand.length === 1 && vehiclesInBrand[0].level === 'model') {
            provider.badge_especialidad = `Especialista en ${vehiclesInBrand[0].vehicle}`;
          } else {
            provider.badge_especialidad = `Especialista en ${brand}`;
          }
        } else {
          // Múltiples marcas
          provider.badge_especialidad = `Especialista en ${brandNames.join(', ')}`;
        }
        
        provider.specialty_type = 'specialist';
      } else if (generalVehicles.length > 0) {
        // Proveedor general (sin especialidades específicas)
        provider.badge_especialidad = 'Servicios generales';
        provider.specialty_type = 'general';
      } else {
        provider.badge_especialidad = 'Servicios disponibles';
        provider.specialty_type = 'available';
      }
      
      // Información adicional para UI
      provider.specialist_vehicles = specialistVehicles;
      provider.service_only_vehicles = serviceOnlyVehicles;
      
      console.log(`✅ Proveedor ${provider.nombre} ES COMPATIBLE`);
      console.log(`   Especialista: ${isSpecialistForAny ? 'SÍ' : 'NO'}`);
      console.log(`   Badge: ${provider.badge_especialidad}`);
      console.log(`   Tipo: ${provider.specialty_type}`);
      
      return true;
    }

    console.log(`❌ Proveedor ${provider.nombre} NO ES COMPATIBLE con ningún vehículo`);
    return false;
  }

  /**
   * Filtrar lista de servicios para mostrar solo los compatibles
   */
  filterServices(services) {
    if (!this.hasVehicles()) {
      console.log('❌ Usuario sin vehículos - no se muestran servicios');
      return [];
    }

    const filteredServices = services.filter(service => this.isServiceCompatible(service));
    
    console.log(`🔍 Servicios filtrados: ${filteredServices.length}/${services.length}`);
    return filteredServices;
  }

  /**
   * Filtrar lista de proveedores para mostrar solo los compatibles
   */
  filterProviders(providers) {
    if (!this.hasVehicles()) {
      console.log('❌ Usuario sin vehículos - no se muestran proveedores');
      return [];
    }

    console.log('=== INICIANDO FILTRADO ESTRICTO DE PROVEEDORES ===');
    console.log(`Total proveedores a evaluar: ${providers.length}`);
    console.log(`Vehículos del usuario: ${this.userVehicleStrings.join(', ')}`);

    const filteredProviders = providers.filter(provider => {
      const isCompatible = this.isProviderCompatible(provider);
      
      if (isCompatible) {
        console.log(`✅ PROVEEDOR APROBADO: ${provider.nombre}`);
      } else {
        console.log(`❌ PROVEEDOR RECHAZADO: ${provider.nombre}`);
      }
      
      return isCompatible;
    });
    
    console.log(`🔍 Proveedores filtrados: ${filteredProviders.length}/${providers.length}`);
    console.log('=== FIN FILTRADO ESTRICTO ===');
    
    return filteredProviders;
  }

  /**
   * Obtener mensaje de error cuando no hay vehículos
   */
  getNoVehiclesMessage() {
    return {
      title: 'No tienes vehículos registrados',
      message: 'Para ver servicios disponibles, primero debes registrar al menos un vehículo.',
      actionText: 'Agregar Vehículo',
      actionRoute: 'MyVehicles'
    };
  }

  /**
   * Obtener mensaje cuando no hay servicios compatibles
   */
  getNoCompatibleServicesMessage() {
    const vehiclesList = this.userVehicleStrings.join(', ');
    return {
      title: 'No hay servicios disponibles',
      message: `No encontramos servicios especializados para tus vehículos (${vehiclesList}). Solo mostramos proveedores que sean especialistas en tu modelo específico.`,
      actionText: 'Ver Mis Vehículos',
      actionRoute: 'MyVehicles'
    };
  }

  /**
   * Validar parámetros de navegación para asegurar compatibilidad
   */
  validateNavigationParams(params) {
    if (!this.hasVehicles()) {
      return {
        isValid: false,
        error: this.getNoVehiclesMessage()
      };
    }

    // Si se especifica un vehículo, verificar que pertenezca al usuario
    if (params.vehicleId) {
      const vehicleExists = this.userVehicles.some(v => v.id === params.vehicleId);
      if (!vehicleExists) {
        return {
          isValid: false,
          error: {
            title: 'Vehículo no válido',
            message: 'El vehículo especificado no está registrado en tu cuenta.',
            actionText: 'Ver Mis Vehículos',
            actionRoute: 'MyVehicles'
          }
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Obtener el primer vehículo del usuario (para usar como predeterminado)
   */
  getDefaultVehicle() {
    return this.userVehicles && this.userVehicles.length > 0 ? this.userVehicles[0] : null;
  }

  /**
   * Verificar si necesita reinicialización (por ejemplo, si se agregaron/eliminaron vehículos)
   */
  needsReinitialization() {
    return !this.initialized;
  }

  /**
   * Limpiar datos del validador
   */
  reset() {
    this.userVehicles = [];
    this.userModels = [];
    this.userBrands = [];
    this.userVehicleStrings = [];
    this.initialized = false;
  }
}

// Instancia singleton del validador
const vehicleServiceValidator = new VehicleServiceValidator();

export default vehicleServiceValidator; 