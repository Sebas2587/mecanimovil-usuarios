import React, { useState, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDERS } from '../../utils/constants';
import { useTheme } from '../../design-system/theme/useTheme';
import Card from '../base/Card/Card';
import Button from '../base/Button/Button';
import VehicleSelector from '../vehicles/VehicleSelector';
import AddressSelector from '../forms/AddressSelector';
import ServiceCard from '../cards/ServiceCard';
import CategoryGridCard from '../cards/CategoryGridCard';
import * as serviceService from '../../services/service';
import * as providerService from '../../services/providers';
import * as categoriesService from '../../services/categories';
import { getMediaURL } from '../../services/api';

/**
 * Formulario multi-paso para crear una solicitud de servicio
 */
const FormularioSolicitud = ({
  onSubmit,
  initialData = {},
  vehiculos = [],
  direcciones = [],
  contentPaddingBottom = 0,
  onExit = null
}) => {
  const [pasoActual, setPasoActual] = useState(1);
  const [formData, setFormData] = useState({
    vehiculo: initialData?.vehiculo || null,
    servicios_seleccionados: Array.isArray(initialData?.servicios_seleccionados) ? initialData.servicios_seleccionados : [],
    descripcion_problema: (initialData?.descripcion_problema && typeof initialData.descripcion_problema === 'string') ? initialData.descripcion_problema : '',
    urgencia: initialData?.urgencia || 'normal',
    requiere_repuestos: initialData?.requiere_repuestos !== undefined ? initialData.requiere_repuestos : true,
    tipo_solicitud: initialData?.tipo_solicitud || 'global',
    proveedores_dirigidos: Array.isArray(initialData?.proveedores_dirigidos) ? initialData.proveedores_dirigidos : [],
    direccion_usuario: initialData?.direccion_usuario || null,
    direccion_servicio_texto: (initialData?.direccion_servicio_texto && typeof initialData.direccion_servicio_texto === 'string') ? initialData.direccion_servicio_texto : '',
    detalles_ubicacion: (initialData?.detalles_ubicacion && typeof initialData.detalles_ubicacion === 'string') ? initialData.detalles_ubicacion : '',
    fecha_preferida: (initialData?.fecha_preferida && typeof initialData.fecha_preferida === 'string') ? initialData.fecha_preferida : '',
    hora_preferida: (initialData?.hora_preferida && typeof initialData.hora_preferida === 'string') ? initialData.hora_preferida : '',
    ubicacion_servicio: initialData?.ubicacion_servicio || null
  });


  // Estados para servicios y proveedores
  const [serviciosDisponibles, setServiciosDisponibles] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [cargandoServicios, setCargandoServicios] = useState(false);
  const [vistaServicios, setVistaServicios] = useState('categorias'); // 'categorias' o 'lista'

  const [proveedoresDisponibles, setProveedoresDisponibles] = useState({ talleres: [], mecanicos: [] });
  const [cargandoProveedores, setCargandoProveedores] = useState(false);

  // Estados para selector de fecha y hora
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mostrarSelectorHora, setMostrarSelectorHora] = useState(false);
  const [mesCalendario, setMesCalendario] = useState(new Date());

  // Detectar si hay servicio preseleccionado ANTES de los effects
  const tieneServicioPreseleccionado = initialData?.servicios_seleccionados &&
    initialData.servicios_seleccionados.length > 0;

  // Detectar si hay proveedor preseleccionado (desde ProviderDetailScreen)
  const tieneProveedorPreseleccionado = initialData?.fromProviderDetail &&
    initialData?.proveedores_dirigidos &&
    initialData.proveedores_dirigidos.length > 0 &&
    initialData?.tipo_solicitud === 'dirigida';

  // Ref para trackear si es la primera vez que se monta el componente
  // Esto evita limpiar servicios seleccionados manualmente cuando useFocusEffect
  // resetea initialData a {}
  const isInitialMount = React.useRef(true);
  const previousInitialDataRef = React.useRef(initialData);

  // Ref para hacer scroll a la sección de descripción del problema en el paso 2
  const descripcionProblemaRef = useRef(null);
  const paso2ScrollViewRef = useRef(null);
  const descripcionYPosition = useRef(0);

  // Sincronizar formData con initialData cuando cambia
  // IMPORTANTE: Solo sincronizar cuando hay datos reales en initialData (servicios preseleccionados)
  // NO limpiar servicios que el usuario seleccionó manualmente en el paso 2
  useEffect(() => {
    // Verificar si initialData está vacío o tiene servicios
    const initialDataVacio = !initialData || Object.keys(initialData).length === 0;
    const tieneServiciosEnInitialData = !initialDataVacio &&
      initialData?.servicios_seleccionados &&
      Array.isArray(initialData.servicios_seleccionados) &&
      initialData.servicios_seleccionados.length > 0;

    // Verificar si el initialData anterior tenía servicios preseleccionados
    const previousHadPreselection = previousInitialDataRef.current?.servicios_seleccionados &&
      Array.isArray(previousInitialDataRef.current.servicios_seleccionados) &&
      previousInitialDataRef.current.servicios_seleccionados.length > 0;

    console.log('🔄 FormularioSolicitud: Sincronizando con initialData', {
      initialDataVacio,
      tieneServiciosEnInitialData,
      serviciosEnInitialData: initialData?.servicios_seleccionados?.length || 0,
      isInitialMount: isInitialMount.current,
      previousHadPreselection
    });

    // Sincronizar formData con initialData
    setFormData(prev => {
      const cambios = {};
      let hayCambios = false;

      // CRÍTICO: Solo limpiar servicios si:
      // 1. Es el mount inicial Y initialData está vacío (usuario navega sin preselección)
      // 2. O si el initialData anterior TENÍA servicios preseleccionados y ahora no (cambio real de navegación)
      // NO limpiar si el usuario está seleccionando servicios manualmente (initialData siempre vacío)
      if (initialDataVacio || !tieneServiciosEnInitialData) {
        // Solo limpiar en el mount inicial si es realmente necesario
        // O si antes había preselección y ahora no (navegación diferente)
        const shouldClear = isInitialMount.current || previousHadPreselection;

        if (shouldClear && prev.servicios_seleccionados.length > 0) {
          // Verificar si los servicios actuales vienen de preselección o selección manual
          // Si el usuario los seleccionó manualmente (no hay previousHadPreselection), NO limpiar
          if (previousHadPreselection) {
            console.log('🧹 FormularioSolicitud: Limpiando servicios porque hubo cambio de preselección');
            cambios.servicios_seleccionados = [];
            hayCambios = true;
          } else {
            console.log('⏭️ FormularioSolicitud: NO limpiando servicios - fueron seleccionados manualmente');
          }
        }
      }
      // Si SÍ hay servicios en initialData, sincronizarlos (preselección desde navegación)
      else if (tieneServiciosEnInitialData) {
        const serviciosActuales = JSON.stringify(prev.servicios_seleccionados);
        const serviciosNuevos = JSON.stringify(initialData.servicios_seleccionados);
        if (serviciosActuales !== serviciosNuevos) {
          console.log('✅ FormularioSolicitud: Sincronizando servicios desde initialData (preselección)');
          cambios.servicios_seleccionados = initialData.servicios_seleccionados;
          hayCambios = true;
        }
      }

      // Sincronizar tipo_solicitud (solo si initialData no está vacío)
      if (!initialDataVacio && initialData?.tipo_solicitud !== undefined && prev.tipo_solicitud !== initialData.tipo_solicitud) {
        cambios.tipo_solicitud = initialData.tipo_solicitud;
        hayCambios = true;
      }

      // Sincronizar proveedores_dirigidos (solo si initialData no está vacío)
      if (!initialDataVacio && initialData?.proveedores_dirigidos !== undefined) {
        const proveedoresActuales = JSON.stringify(prev.proveedores_dirigidos);
        const proveedoresNuevos = JSON.stringify(initialData.proveedores_dirigidos);
        if (proveedoresActuales !== proveedoresNuevos) {
          cambios.proveedores_dirigidos = initialData.proveedores_dirigidos;
          hayCambios = true;
        }
      }

      // Sincronizar vehiculo solo si initialData tiene un valor explícito
      if (!initialDataVacio && initialData?.vehiculo !== undefined) {
        const vehiculoActual = prev.vehiculo?.id;
        const vehiculoNuevo = initialData.vehiculo?.id;
        if (vehiculoActual !== vehiculoNuevo) {
          cambios.vehiculo = initialData.vehiculo;
          hayCambios = true;
        }
      }

      return hayCambios ? { ...prev, ...cambios } : prev;
    });

    // Después del primer mount, marcar como no inicial
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    // Guardar referencia al initialData actual para comparación futura
    previousInitialDataRef.current = initialData;
  }, [initialData]);

  // Cargar servicios cuando se selecciona un vehículo
  useEffect(() => {
    if (formData.vehiculo && formData.vehiculo.id) {
      // Limpiar servicios anteriores al cambiar de vehículo
      setServiciosDisponibles([]);

      // IMPORTANTE: NO limpiar servicios si hay un servicio preseleccionado
      if (!tieneServicioPreseleccionado) {
        setFormData(prev => ({
          ...prev,
          servicios_seleccionados: [] // Limpiar servicios seleccionados al cambiar vehículo
        }));
      }

      // Solo cargar servicios si NO hay servicio preseleccionado
      if (!tieneServicioPreseleccionado) {
        cargarServiciosPorVehiculo();
        cargarCategorias();
      }
    } else {
      // Si no hay vehículo seleccionado, limpiar servicios solo si no hay preselección
      if (!tieneServicioPreseleccionado) {
        setServiciosDisponibles([]);
      }
    }
  }, [formData.vehiculo]);

  // Cargar proveedores cuando se selecciona "solo proveedores específicos"
  useEffect(() => {
    if (formData.tipo_solicitud === 'dirigida' && formData.vehiculo && formData.vehiculo.id) {
      cargarProveedoresPorVehiculo();
    } else {
      // Si no es solicitud dirigida, limpiar proveedores
      setProveedoresDisponibles({ talleres: [], mecanicos: [] });
    }
  }, [formData.tipo_solicitud, formData.vehiculo]);

  // Recargar proveedores cuando cambien los servicios seleccionados (solo para solicitudes dirigidas)
  useEffect(() => {
    if (formData.tipo_solicitud === 'dirigida' &&
      formData.vehiculo &&
      formData.vehiculo.id &&
      Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.length > 0) {
      cargarProveedoresPorVehiculo();
    }
  }, [formData.servicios_seleccionados]);

  const cargarServiciosPorVehiculo = async () => {
    if (!formData.vehiculo || !formData.vehiculo.id) {
      setServiciosDisponibles([]);
      return;
    }

    setCargandoServicios(true);
    try {
      const servicios = await serviceService.getServicesByVehiculo(formData.vehiculo.id);
      const serviciosArray = Array.isArray(servicios) ? servicios : [];
      setServiciosDisponibles(serviciosArray);
      console.log(`✅ Servicios cargados para vehículo ${formData.vehiculo.id}:`, serviciosArray.length);
      if (serviciosArray.length > 0) {
        console.log('📋 Estructura del primer servicio:', serviciosArray[0]);
      }

      // Si no hay servicios disponibles, mostrar mensaje informativo
      if (serviciosArray.length === 0) {
        console.warn(`⚠️ No se encontraron servicios disponibles para el vehículo ${formData.vehiculo.id}`);
      }
    } catch (error) {
      console.error('❌ Error cargando servicios:', error);
      setServiciosDisponibles([]);
    } finally {
      setCargandoServicios(false);
    }
  };

  const cargarCategorias = async () => {
    try {
      console.log('📂 Cargando categorías principales...');
      const categoriasData = await categoriesService.getMainCategories();
      const categoriasArray = Array.isArray(categoriasData) ? categoriasData : [];
      setCategorias(categoriasArray);
      console.log(`✅ Categorías cargadas:`, categoriasArray.length, categoriasArray);
    } catch (error) {
      console.error('❌ Error cargando categorías:', error);
      setCategorias([]);
    }
  };

  const cargarProveedoresPorVehiculo = async () => {
    if (!formData.vehiculo || !formData.vehiculo.id) {
      setProveedoresDisponibles({ talleres: [], mecanicos: [] });
      return;
    }

    setCargandoProveedores(true);
    try {
      // Extraer IDs de servicios seleccionados
      const servicioIds = formData.servicios_seleccionados?.map(s =>
        typeof s === 'object' ? s.id : s
      ).filter(id => id != null) || [];

      // Usar el nuevo endpoint que filtra por marca y servicios
      const proveedores = await providerService.getProvidersByVehiculoAndService(
        formData.vehiculo.id,
        servicioIds
      );

      setProveedoresDisponibles({
        talleres: Array.isArray(proveedores.talleres) ? proveedores.talleres : [],
        mecanicos: Array.isArray(proveedores.mecanicos) ? proveedores.mecanicos : []
      });

      console.log('✅ Proveedores filtrados cargados:', {
        vehiculo_id: formData.vehiculo.id,
        servicio_ids: servicioIds,
        talleres: proveedores.talleres?.length || 0,
        mecanicos: proveedores.mecanicos?.length || 0,
        filtros: proveedores.filtros_aplicados
      });

      // Si no hay proveedores disponibles, mostrar mensaje informativo
      const totalProveedores = (proveedores.talleres?.length || 0) + (proveedores.mecanicos?.length || 0);
      if (totalProveedores === 0) {
        console.warn(`⚠️ No se encontraron proveedores que atiendan la marca del vehículo${servicioIds.length > 0 ? ' y ofrezcan los servicios seleccionados' : ''}`);
      }
    } catch (error) {
      console.error('❌ Error cargando proveedores:', error);
      setProveedoresDisponibles({ talleres: [], mecanicos: [] });
    } finally {
      setCargandoProveedores(false);
    }
  };

  const toggleServicioSeleccionado = (servicio) => {
    const servicios = Array.isArray(formData.servicios_seleccionados) ? formData.servicios_seleccionados : [];
    const existe = servicios.find(s => s && s.id === servicio.id);

    if (existe) {
      // Deseleccionar servicio: solo actualizar el estado
      setFormData({
        ...formData,
        servicios_seleccionados: servicios.filter(s => s.id !== servicio.id)
      });
    } else {
      // Seleccionar servicio: asegurar que tenga información de categoría
      // Si hay categoría seleccionada actualmente, agregarla al servicio
      let servicioConCategoria = { ...servicio };

      // Si el servicio no tiene categoria_nombre pero hay categoriaSeleccionada, agregarla
      if (!servicioConCategoria.categoria_nombre && categoriaSeleccionada) {
        servicioConCategoria.categoria_nombre = categoriaSeleccionada.nombre;
        servicioConCategoria.categoria_id = categoriaSeleccionada.id;
      }

      // Si el servicio tiene categorias_ids pero no categoria_nombre, buscar en categorías
      if (!servicioConCategoria.categoria_nombre && servicioConCategoria.categorias_ids && servicioConCategoria.categorias_ids.length > 0) {
        const primeraCategoriaId = servicioConCategoria.categorias_ids[0];
        const categoriaEncontrada = categorias.find(c => c.id === primeraCategoriaId);
        if (categoriaEncontrada) {
          servicioConCategoria.categoria_nombre = categoriaEncontrada.nombre;
        }
      }

      // Seleccionar servicio: actualizar el estado con el servicio que incluye categoría
      setFormData({
        ...formData,
        servicios_seleccionados: [...servicios, servicioConCategoria]
      });

      // Si estamos en el paso 2, hacer scroll automático a la sección de descripción del problema
      if (pasoActual === 2) {
        // Esperar a que todas las interacciones y animaciones terminen
        InteractionManager.runAfterInteractions(() => {
          setTimeout(() => {
            if (paso2ScrollViewRef.current) {
              // Hacer scroll al final del ScrollView donde está la sección de descripción
              paso2ScrollViewRef.current.scrollToEnd({ animated: true });
            }
          }, 200);
        });
      }
    }
  };

  const toggleProveedorSeleccionado = (proveedor, tipo) => {
    // Prevenir cambios si hay proveedor preseleccionado (desde ProviderDetailScreen)
    if (tieneProveedorPreseleccionado) {
      Alert.alert(
        'Proveedor preseleccionado',
        'El proveedor ya está preseleccionado desde el perfil del proveedor. No puedes modificarlo.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    const proveedores = formData.proveedores_dirigidos || [];
    // Obtener ID de usuario del proveedor (necesario para el backend)
    const usuarioId = proveedor.usuario?.id || proveedor.usuario || proveedor.id;

    const existe = proveedores.find(p => {
      const pUsuarioId = p.usuario?.id || p.usuario || p.id;
      return pUsuarioId === usuarioId && p.tipo === tipo;
    });

    if (existe) {
      setFormData({
        ...formData,
        proveedores_dirigidos: proveedores.filter(p => {
          const pUsuarioId = p.usuario?.id || p.usuario || p.id;
          return !(pUsuarioId === usuarioId && p.tipo === tipo);
        })
      });
    } else {
      // Limitar a 3 proveedores
      if (proveedores.length >= 3) {
        Alert.alert('Límite alcanzado', 'Solo puedes seleccionar hasta 3 proveedores');
        return;
      }
      // Guardar proveedor con usuario.id para facilitar el envío al backend
      setFormData({
        ...formData,
        proveedores_dirigidos: [...proveedores, { ...proveedor, tipo, usuario_id: usuarioId }]
      });
    }
  };

  // Ajustar total de pasos según el flujo
  // Si hay servicio + proveedor preseleccionados: 4 pasos (saltamos pasos 2 y 4)
  // Si hay solo servicio preseleccionado: 5 pasos (saltamos el paso 2)
  // Si NO hay preselecciones: 6 pasos (flujo normal)
  const totalPasos = tieneProveedorPreseleccionado && tieneServicioPreseleccionado
    ? 4
    : tieneServicioPreseleccionado
      ? 5
      : 6;

  // Sincronizar initialData cuando llegue (se ejecuta una sola vez al montar o cuando initialData cambia)
  useEffect(() => {
    try {
      if (initialData && typeof initialData === 'object' && initialData !== null && !Array.isArray(initialData)) {
        const keys = Object.keys(initialData);
        if (keys.length > 0) {
          // Si hay initialData, actualizar formData (esto cubre el caso donde initialData llega después del mount)
          setFormData(prev => ({
            vehiculo: initialData.vehiculo || prev.vehiculo,
            servicios_seleccionados: initialData.servicios_seleccionados || prev.servicios_seleccionados,
            descripcion_problema: initialData.descripcion_problema || prev.descripcion_problema,
            urgencia: initialData.urgencia || prev.urgencia,
            tipo_solicitud: initialData.tipo_solicitud || prev.tipo_solicitud,
            proveedores_dirigidos: initialData.proveedores_dirigidos || prev.proveedores_dirigidos,
            direccion_usuario: initialData.direccion_usuario || prev.direccion_usuario,
            direccion_servicio_texto: initialData.direccion_servicio_texto || prev.direccion_servicio_texto,
            detalles_ubicacion: initialData.detalles_ubicacion || prev.detalles_ubicacion,
            fecha_preferida: initialData.fecha_preferida || prev.fecha_preferida,
            hora_preferida: initialData.hora_preferida || prev.hora_preferida,
            ubicacion_servicio: initialData.ubicacion_servicio || prev.ubicacion_servicio
          }));
          console.log('✅ FormularioSolicitud: InitialData sincronizado con formData');
        }
      }
    } catch (error) {
      console.error('❌ Error sincronizando initialData:', error);
    }
  }, [initialData]);

  // Asegurar que cuando hay proveedor preseleccionado, tipo_solicitud permanezca como 'dirigida'
  // y los proveedores no cambien
  useEffect(() => {
    if (tieneProveedorPreseleccionado) {
      // Forzar tipo_solicitud a 'dirigida' si está preseleccionado
      if (formData.tipo_solicitud !== 'dirigida') {
        console.log('🔒 Asegurando tipo_solicitud como "dirigida" (proveedor preseleccionado)');
        setFormData(prev => ({
          ...prev,
          tipo_solicitud: 'dirigida'
        }));
      }

      // Asegurar que los proveedores preseleccionados no cambien
      const proveedoresPreseleccionados = initialData?.proveedores_dirigidos || [];
      const proveedoresActuales = formData.proveedores_dirigidos || [];

      // Comparar si los proveedores han cambiado (comparando por usuario_id)
      const proveedoresCambiaron = proveedoresPreseleccionados.length !== proveedoresActuales.length ||
        proveedoresPreseleccionados.some((pPreseleccionado, index) => {
          const pActual = proveedoresActuales[index];
          if (!pActual) return true;

          const idPreseleccionado = pPreseleccionado.usuario?.id || pPreseleccionado.usuario || pPreseleccionado.usuario_id || pPreseleccionado.id;
          const idActual = pActual.usuario?.id || pActual.usuario || pActual.usuario_id || pActual.id;

          return idPreseleccionado !== idActual || pPreseleccionado.tipo !== pActual.tipo;
        });

      if (proveedoresCambiaron && proveedoresPreseleccionados.length > 0) {
        console.log('🔒 Restaurando proveedores preseleccionados (proveedor preseleccionado)');
        setFormData(prev => ({
          ...prev,
          proveedores_dirigidos: [...proveedoresPreseleccionados]
        }));
      }
    }
  }, [tieneProveedorPreseleccionado, formData.tipo_solicitud, formData.proveedores_dirigidos]);

  // Log informativo sobre el flujo detectado
  useEffect(() => {
    if (tieneProveedorPreseleccionado && tieneServicioPreseleccionado) {
      console.log('✅ FormularioSolicitud: Servicio y proveedor preseleccionados detectados');
      console.log('📊 Flujo optimizado: 4 pasos (saltando pasos 2 y 4 - selección de servicios y proveedores)');
      console.log('🎯 Servicio:', initialData.servicios_seleccionados[0]?.nombre);
      console.log('👤 Proveedor:', initialData.proveedores_dirigidos[0]?.nombre || 'Proveedor preseleccionado');
      console.log('📍 Origen: ProviderDetailScreen');
    } else if (tieneServicioPreseleccionado) {
      console.log('✅ FormularioSolicitud: Servicio preseleccionado detectado');
      console.log('📊 Flujo optimizado: 5 pasos (saltando paso 2 - selección de servicios)');
      console.log('🎯 Servicio:', initialData.servicios_seleccionados[0]?.nombre);
      console.log('📋 Servicios en formData:', Array.isArray(formData.servicios_seleccionados) ? formData.servicios_seleccionados.length : 0, 'servicio(s)');
    } else {
      console.log('📋 FormularioSolicitud: Flujo normal de 6 pasos');
    }
  }, [tieneServicioPreseleccionado, tieneProveedorPreseleccionado]);

  const handleNext = () => {
    // Validar paso actual antes de avanzar
    if (!validarPaso(pasoActual)) {
      return;
    }

    // Si hay proveedor + servicio preseleccionados (flujo de 4 pasos: 1→3→5→6)
    if (tieneProveedorPreseleccionado && tieneServicioPreseleccionado) {
      // Del paso 1 saltar al paso 3 (salta paso 2)
      if (pasoActual === 1) {
        console.log('🚀 Saltando del paso 1 al paso 3 (servicio y proveedor preseleccionados)');
        setPasoActual(3);
      }
      // Del paso 3 saltar al paso 5 (salta paso 4)
      else if (pasoActual === 3) {
        console.log('🚀 Saltando del paso 3 al paso 5 (proveedor preseleccionado, saltando paso 4)');
        setPasoActual(5);
      }
      // De paso 5 a paso 6 (el último paso)
      else if (pasoActual === 5) {
        console.log('🚀 Avanzando del paso 5 al paso 6 (fecha/hora)');
        setPasoActual(6);
      }
      // En el paso 6, hacer submit
      else if (pasoActual === 6) {
        console.log('✅ Paso 6 completado, enviando solicitud');
        handleSubmit();
      }
      // Cualquier otro caso, avanzar normalmente
      else {
        setPasoActual(pasoActual + 1);
      }
    }
    // Si solo hay servicio preseleccionado (flujo de 5 pasos: 1→3→4→5→6)
    // Cuando se navega desde CategoryServicesListScreen, el usuario selecciona un servicio
    // El flujo debe ser: Paso 1 (vehículo) → Paso 3 (urgencia/descripción) → Paso 4 (proveedores) → Paso 5 (dirección) → Paso 6 (fecha/hora)
    else if (tieneServicioPreseleccionado) {
      if (pasoActual === 1) {
        // Validar que haya vehículo seleccionado antes de saltar
        if (!formData.vehiculo) {
          console.warn('⚠️ No se puede avanzar: falta seleccionar vehículo');
          Alert.alert('Error', 'Debes seleccionar un vehículo para continuar');
          return;
        }
        console.log('🚀 Saltando del paso 1 al paso 3 (servicio preseleccionado desde categoría)');
        console.log('📋 Servicio preseleccionado:', formData.servicios_seleccionados[0]?.nombre);
        console.log('🚗 Vehículo seleccionado:', formData.vehiculo.marca_nombre, formData.vehiculo.modelo_nombre);
        setPasoActual(3); // Saltar directamente al paso de urgencia (saltando paso 2)
      } else if (pasoActual === 6) {
        // En el paso 6 (último paso), hacer submit
        console.log('✅ Paso 6 completado, enviando solicitud');
        handleSubmit();
      } else if (pasoActual < 6) {
        // Avanzar al siguiente paso (puede ser 3→4, 4→5, o 5→6)
        console.log(`🚀 Avanzando del paso ${pasoActual} al paso ${pasoActual + 1} (servicio preseleccionado)`);
        setPasoActual(pasoActual + 1);
      } else {
        // Fallback: si por alguna razón estamos en un paso inválido, hacer submit
        console.warn(`⚠️ Paso inválido ${pasoActual}, llamando handleSubmit`);
        handleSubmit();
      }
    }
    // Flujo normal (6 pasos: 1→2→3→4→5→6)
    else {
      if (pasoActual < totalPasos) {
        setPasoActual(pasoActual + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (pasoActual > 1) {
      // Si hay proveedor + servicio preseleccionados
      if (tieneProveedorPreseleccionado && tieneServicioPreseleccionado) {
        // Del paso 3 retroceder al paso 1 (si proveedor preseleccionado)
        if (pasoActual === 3) {
          console.log('🔙 Retrocediendo del paso 3 al paso 1 (servicio y proveedor preseleccionados)');
          setPasoActual(1);
        }
        // Del paso 5 retroceder al paso 3 (saltar paso 4 hacia atrás)
        else if (pasoActual === 5) {
          console.log('🔙 Retrocediendo del paso 5 al paso 3 (proveedor preseleccionado, saltando paso 4)');
          setPasoActual(3);
        }
        // De paso 6 a paso 5 (normal)
        else {
          setPasoActual(pasoActual - 1);
        }
      }
      // Si solo hay servicio preseleccionado
      else if (tieneServicioPreseleccionado && pasoActual === 3) {
        console.log('🔙 Retrocediendo del paso 3 al paso 1 (servicio preseleccionado)');
        setPasoActual(1); // Retroceder directamente al paso de vehículo
      } else {
        setPasoActual(pasoActual - 1);
      }
    }
  };

  const validarPaso = (paso) => {
    switch (paso) {
      case 1:
        if (!formData.vehiculo) {
          Alert.alert('Error', 'Debes seleccionar un vehículo');
          return false;
        }
        // Si hay servicio preseleccionado, validar que exista
        if (tieneServicioPreseleccionado && (!Array.isArray(formData.servicios_seleccionados) || formData.servicios_seleccionados.length === 0)) {
          Alert.alert('Error', 'El servicio preseleccionado no se cargó correctamente');
          return false;
        }
        return true;
      case 2:
        // Este paso se salta cuando hay servicio preseleccionado
        // Solo validar si estamos en flujo normal
        if (!tieneServicioPreseleccionado) {
          if (!Array.isArray(formData.servicios_seleccionados) || formData.servicios_seleccionados.length === 0) {
            Alert.alert('Error', 'Debes seleccionar al menos un servicio');
            return false;
          }
          if (!formData.descripcion_problema.trim()) {
            Alert.alert('Error', 'Debes describir el problema');
            return false;
          }
        }
        return true;
      case 3:
        // Si hay servicio y proveedor preseleccionados, validar que haya vehículo seleccionado
        // (porque el paso 1 se saltó)
        if (tieneProveedorPreseleccionado && tieneServicioPreseleccionado) {
          if (!formData.vehiculo) {
            Alert.alert('Error', 'Debes seleccionar un vehículo para continuar');
            return false;
          }
          // Validar que el servicio preseleccionado exista
          if (!Array.isArray(formData.servicios_seleccionados) || formData.servicios_seleccionados.length === 0) {
            Alert.alert('Error', 'El servicio preseleccionado no se cargó correctamente');
            return false;
          }
        }
        return true; // Urgencia siempre tiene valor por defecto
      case 4:
        if (formData.tipo_solicitud === 'dirigida' && formData.proveedores_dirigidos.length === 0) {
          Alert.alert('Error', 'Debes seleccionar al menos un proveedor para solicitud dirigida');
          return false;
        }
        return true;
      case 5:
        if (!formData.direccion_usuario && !formData.direccion_servicio_texto) {
          Alert.alert('Error', 'Debes seleccionar o ingresar una dirección');
          return false;
        }
        return true;
      case 6:
        // Solo validar fecha si estamos intentando hacer submit (no al llegar al paso)
        // La validación se hace en handleSubmit, no aquí
        // Solo validar si hay algo en fecha_preferida (para detectar formato incorrecto)
        if (formData.fecha_preferida && formData.fecha_preferida.trim() !== '') {
          if (!validarFecha(formData.fecha_preferida)) {
            console.error('❌ Error: Fecha no válida:', formData.fecha_preferida);
            Alert.alert('Error', 'La fecha debe tener el formato YYYY-MM-DD y ser una fecha válida futura');
            return false;
          }
          // Validar hora solo si hay fecha válida y hora especificada
          if (formData.hora_preferida && formData.hora_preferida.trim() !== '' && !validarHora(formData.hora_preferida)) {
            Alert.alert('Error', 'La hora debe tener el formato HH:MM (ej: 14:30)');
            return false;
          }
        }
        // Permitir avanzar al paso 6 sin fecha (se validará en submit)
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = () => {
    // Validar el paso actual (que debería ser el paso 6 para fecha/hora)
    if (!validarPaso(pasoActual)) {
      console.error('❌ Error: Validación del paso actual falló:', pasoActual);
      return;
    }

    // Validación específica de fecha antes de enviar
    if (!formData.fecha_preferida || formData.fecha_preferida.trim() === '') {
      Alert.alert('Error', 'Debes seleccionar una fecha preferida para el servicio');
      return;
    }

    if (!validarFecha(formData.fecha_preferida)) {
      console.error('❌ Error: Fecha no válida en submit:', formData.fecha_preferida);
      Alert.alert('Error', 'La fecha seleccionada no es válida. Por favor, selecciona una fecha nuevamente.');
      return;
    }

    // Si hay servicio preseleccionado y no hay descripción, usar descripción por defecto
    const datosFinales = formData && typeof formData === 'object' && !Array.isArray(formData)
      ? { ...formData }
      : {};
    if (tieneServicioPreseleccionado && !datosFinales.descripcion_problema.trim()) {
      const nombreServicio = formData.servicios_seleccionados[0]?.nombre || 'servicio seleccionado';
      datosFinales.descripcion_problema = `Solicitud de ${nombreServicio}`;
      console.log('📝 Descripción generada automáticamente:', datosFinales.descripcion_problema);
    }

    // Asegurar que fecha_preferida esté en formato YYYY-MM-DD
    if (datosFinales.fecha_preferida) {
      // Si ya está en formato correcto, validar
      if (validarFecha(datosFinales.fecha_preferida)) {
        // Ya está en formato YYYY-MM-DD, no hacer nada
        console.log('✅ Fecha en formato correcto:', datosFinales.fecha_preferida);
      } else {
        // Intentar convertir desde Date o otro formato
        try {
          const date = new Date(datosFinales.fecha_preferida);
          if (!isNaN(date.getTime())) {
            datosFinales.fecha_preferida = formatearFechaYYYYMMDD(date);
            console.log('🔧 Fecha convertida a YYYY-MM-DD:', datosFinales.fecha_preferida);
          } else {
            console.error('❌ Error: No se pudo convertir la fecha:', datosFinales.fecha_preferida);
            Alert.alert('Error', 'La fecha tiene un formato inválido. Por favor, selecciona una fecha nuevamente.');
            return;
          }
        } catch (error) {
          console.error('❌ Error al convertir fecha:', error);
          Alert.alert('Error', 'La fecha tiene un formato inválido. Por favor, selecciona una fecha nuevamente.');
          return;
        }
      }
    }

    if (onSubmit) {
      onSubmit(datosFinales);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Seleccionar fecha';

    // Si la fecha está en formato YYYY-MM-DD, parsearla manualmente
    // para evitar problemas de zona horaria
    const regexYYYYMMDD = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dateString.match(regexYYYYMMDD);

    if (match) {
      const [, year, month, day] = match;
      // Crear fecha usando UTC para evitar problemas de zona horaria
      // Luego convertir los componentes directamente sin ajustes de zona horaria
      const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      return date.toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC' // Forzar UTC para mantener la fecha correcta
      });
    }

    // Fallback para otros formatos
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Seleccionar fecha';
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Seleccionar hora';
    return timeString.substring(0, 5);
  };

  const handleVehiculoToggle = (vehiculo) => {
    // Si el vehículo ya está seleccionado, deseleccionarlo y limpiar datos relacionados
    if (formData.vehiculo?.id === vehiculo.id) {
      console.log('🔙 Deseleccionando vehículo y limpiando datos relacionados');
      setFormData(prev => ({
        ...prev,
        vehiculo: null,
        servicios_seleccionados: [], // Limpiar servicios al deseleccionar vehículo
      }));
      // Limpiar servicios disponibles también
      setServiciosDisponibles([]);
      setCategorias([]);
      setCategoriaSeleccionada(null);
    } else {
      // Seleccionar nuevo vehículo
      setFormData(prev => ({ ...prev, vehiculo }));
    }
  };

  const handleDeseleccionarVehiculo = () => {
    console.log('🔙 Deseleccionando vehículo desde botón y limpiando datos relacionados');
    setFormData(prev => ({
      ...prev,
      vehiculo: null,
      servicios_seleccionados: [], // Limpiar servicios al deseleccionar vehículo
    }));
    // Limpiar servicios disponibles también
    setServiciosDisponibles([]);
    setCategorias([]);
    setCategoriaSeleccionada(null);
  };

  const renderPaso1 = () => {
    // Si no hay vehículos pasados como prop, usar VehicleSelector que los carga automáticamente
    const vehiculosDisponibles = vehiculos && vehiculos.length > 0 ? vehiculos : [];

    return (
      <View style={styles.pasoContainer}>
        <Text style={styles.pasoTitle}>Selecciona tu vehículo</Text>
        <Text style={styles.pasoDescripcion}>
          Elige el vehículo para el cual necesitas el servicio
        </Text>

        {vehiculosDisponibles.length > 0 ? (
          <View style={styles.vehiculosList}>
            {vehiculosDisponibles.map((vehiculo) => (
              <TouchableOpacity
                key={vehiculo.id}
                style={[
                  styles.vehiculoCard,
                  formData.vehiculo?.id === vehiculo.id && styles.vehiculoCardSeleccionado
                ]}
                onPress={() => handleVehiculoToggle(vehiculo)}
              >
                <View style={styles.vehiculoCardContent}>
                  <Ionicons
                    name="car"
                    size={24}
                    color={formData.vehiculo?.id === vehiculo.id ? COLORS.primary : COLORS.textLight}
                  />
                  <View style={styles.vehiculoCardInfo}>
                    <Text style={[
                      styles.vehiculoCardNombre,
                      formData.vehiculo?.id === vehiculo.id && styles.vehiculoCardNombreSeleccionado
                    ]}>
                      {vehiculo.marca_nombre} {vehiculo.modelo_nombre}
                    </Text>
                    <Text style={styles.vehiculoCardDetalles}>
                      {vehiculo.year} • {vehiculo.patente || vehiculo.placa} • {vehiculo.kilometraje?.toLocaleString() || 0} km
                    </Text>
                  </View>
                  {formData.vehiculo?.id === vehiculo.id && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <VehicleSelector
            onVehicleChange={(vehiculo) => {
              // Si se pasa null, deseleccionar
              if (!vehiculo) {
                handleDeseleccionarVehiculo();
              } else {
                setFormData(prev => ({ ...prev, vehiculo }));
              }
            }}
            currentVehicle={formData.vehiculo}
          />
        )}

        {formData.vehiculo && (
          <Card style={styles.vehiculoSeleccionado}>
            <View style={styles.vehiculoSeleccionadoContent}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              <Text style={styles.vehiculoText}>
                {formData.vehiculo.marca_nombre} {formData.vehiculo.modelo_nombre} ({formData.vehiculo.year})
              </Text>
              <TouchableOpacity
                onPress={handleDeseleccionarVehiculo}
                style={styles.deseleccionarVehiculoButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color={COLORS.error || COLORS.danger || '#DC3545'} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
      </View>
    );
  };

  const renderPaso2 = () => {
    if (!formData.vehiculo) {
      return (
        <View style={styles.pasoContainer}>
          <Text style={styles.errorText}>
            Primero debes seleccionar un vehículo en el paso anterior
          </Text>
        </View>
      );
    }

    // Verificar si hay servicios preseleccionados desde la navegación
    const tieneServiciosPreseleccionados = initialData?.servicios_seleccionados &&
      Array.isArray(initialData.servicios_seleccionados) &&
      initialData.servicios_seleccionados.length > 0;

    // Si hay servicios preseleccionados, mostrar solo confirmación
    if (tieneServiciosPreseleccionados && Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.length > 0) {
      return (
        <View style={styles.pasoContainer}>
          <Text style={styles.pasoTitle}>Servicio seleccionado</Text>
          <Text style={styles.pasoDescripcion}>
            Has seleccionado el siguiente servicio para tu {formData.vehiculo.marca_nombre} {formData.vehiculo.modelo_nombre}
          </Text>

          {/* Mostrar servicios preseleccionados */}
          <View style={styles.serviciosPreseleccionadosContainer}>
            {(Array.isArray(formData.servicios_seleccionados) ? formData.servicios_seleccionados : []).map((servicio, index) => (
              <View key={index} style={styles.servicioPreseleccionadoCard}>
                <View style={styles.servicioPreseleccionadoHeader}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  <Text style={styles.servicioPreseleccionadoNombre}>
                    {servicio.nombre}
                  </Text>
                </View>
                {servicio.descripcion && (
                  <Text style={styles.servicioPreseleccionadoDescripcion}>
                    {servicio.descripcion}
                  </Text>
                )}
                {servicio.precio_referencia && (
                  <Text style={styles.servicioPreseleccionadoPrecio}>
                    Precio referencia: ${parseFloat(servicio.precio_referencia).toLocaleString('es-CL')}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Descripción del problema */}
          <View style={styles.descripcionContainer}>
            <Text style={styles.descripcionLabel}>Describe el problema o necesidad específica:</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder="Ej: Mi auto hace un ruido extraño, necesito una revisión completa..."
              value={formData.descripcion_problema || ''}
              onChangeText={(text) => setFormData(prev => ({ ...prev, descripcion_problema: text || '' }))}
              textAlignVertical="top"
            />
          </View>

          {/* Botón para cambiar servicio (opcional) */}
          <TouchableOpacity
            style={styles.cambiarServicioButton}
            onPress={() => {
              // Limpiar servicio preseleccionado y permitir selección manual
              setFormData(prev => ({ ...prev, servicios_seleccionados: [] }));
            }}
          >
            <Ionicons name="swap-horizontal" size={20} color={COLORS.primary} />
            <Text style={styles.cambiarServicioButtonText}>
              Elegir otro servicio
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Filtrar servicios por categoría si hay una seleccionada
    const serviciosFiltrados = categoriaSeleccionada
      ? serviciosDisponibles.filter(s => {
        // Verificar si el servicio tiene categorias_ids (array de IDs)
        if (s.categorias_ids && Array.isArray(s.categorias_ids)) {
          return s.categorias_ids.includes(categoriaSeleccionada.id);
        }
        // Fallback: verificar si tiene el campo categoria (ID único)
        return s.categoria === categoriaSeleccionada.id;
      })
      : serviciosDisponibles;

    return (
      <ScrollView
        ref={paso2ScrollViewRef}
        style={styles.pasoContainer}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <Text style={styles.pasoTitle}>Selecciona el servicio necesario</Text>
        <Text style={styles.pasoDescripcion}>
          Elige los servicios que necesitas para tu {formData.vehiculo.marca_nombre} {formData.vehiculo.modelo_nombre}
        </Text>

        {/* Selector de vista: Categorías o Lista */}
        <View style={styles.vistaSelector}>
          <TouchableOpacity
            style={[
              styles.vistaButton,
              vistaServicios === 'categorias' && styles.vistaButtonActiva
            ]}
            onPress={() => {
              setVistaServicios('categorias');
              setCategoriaSeleccionada(null);
            }}
          >
            <Ionicons
              name="grid-outline"
              size={20}
              color={vistaServicios === 'categorias' ? COLORS.primary : COLORS.textLight}
            />
            <Text style={[
              styles.vistaButtonText,
              vistaServicios === 'categorias' && styles.vistaButtonTextActiva
            ]}>
              Por Categoría
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.vistaButton,
              vistaServicios === 'lista' && styles.vistaButtonActiva
            ]}
            onPress={() => {
              setVistaServicios('lista');
              setCategoriaSeleccionada(null);
            }}
          >
            <Ionicons
              name="list-outline"
              size={20}
              color={vistaServicios === 'lista' ? COLORS.primary : COLORS.textLight}
            />
            <Text style={[
              styles.vistaButtonText,
              vistaServicios === 'lista' && styles.vistaButtonTextActiva
            ]}>
              Todos los Servicios
            </Text>
          </TouchableOpacity>
        </View>

        {cargandoServicios ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
            <Text style={styles.loadingText}>Cargando servicios...</Text>
          </View>
        ) : vistaServicios === 'categorias' ? (
          <ScrollView style={styles.categoriasContainer} nestedScrollEnabled={true}>
            {categoriaSeleccionada ? (
              <View>
                <TouchableOpacity
                  style={styles.backToCategories}
                  onPress={() => setCategoriaSeleccionada(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.primary?.[500] || '#003459'} />
                  <Text style={styles.backToCategoriesText}>
                    Volver a categorías
                  </Text>
                </TouchableOpacity>
                <Text style={styles.categoriaTitle}>{categoriaSeleccionada.nombre}</Text>
                {serviciosFiltrados.length > 0 ? (
                  <View style={styles.serviciosGrid}>
                    {serviciosFiltrados.map((servicio) => {
                      const estaSeleccionado = Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.some(s => s && s.id === servicio.id);
                      return (
                        <TouchableOpacity
                          key={servicio.id}
                          style={[
                            styles.servicioCard,
                            estaSeleccionado && styles.servicioCardSeleccionado
                          ]}
                          onPress={() => toggleServicioSeleccionado(servicio)}
                        >
                          <View style={styles.servicioCardHeader}>
                            <Text style={[
                              styles.servicioCardNombre,
                              estaSeleccionado && styles.servicioCardNombreSeleccionado
                            ]}>
                              {servicio.nombre}
                            </Text>
                            {estaSeleccionado && (
                              <Ionicons name="checkmark-circle" size={24} color={colors.primary?.[500] || '#003459'} />
                            )}
                          </View>
                          {servicio.descripcion && (
                            <Text style={styles.servicioCardDescripcion} numberOfLines={2}>
                              {servicio.descripcion}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No hay servicios disponibles en esta categoría</Text>
                )}
              </View>
            ) : (
              (() => {
                // Filtrar categorías que tienen servicios disponibles para la marca del vehículo
                const categoriasConServicios = categorias.filter((categoria) => {
                  const serviciosEnCategoria = serviciosDisponibles.filter(s => {
                    // Verificar si el servicio tiene categorias_ids (array de IDs)
                    if (s.categorias_ids && Array.isArray(s.categorias_ids)) {
                      return s.categorias_ids.includes(categoria.id);
                    }
                    // Fallback: verificar si tiene el campo categoria (ID único)
                    return s.categoria === categoria.id;
                  });
                  // Solo incluir categorías que tienen al menos un servicio
                  return serviciosEnCategoria.length > 0;
                });

                return categoriasConServicios.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriasHorizontal}
                    bounces={false}
                    decelerationRate="fast"
                  >
                    {categoriasConServicios.map((categoria) => (
                      <CategoryGridCard
                        key={categoria.id}
                        category={categoria}
                        onPress={() => setCategoriaSeleccionada(categoria)}
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyCategoriasContainer}>
                    <Ionicons name="albums-outline" size={48} color={colors.text?.secondary || '#5D6F75'} />
                    <Text style={styles.emptyText}>
                      No hay categorías disponibles para este vehículo
                    </Text>
                  </View>
                );
              })()
            )}
          </ScrollView>
        ) : (
          <ScrollView style={styles.serviciosListContainer} nestedScrollEnabled={true}>
            {serviciosDisponibles.length > 0 ? (
              serviciosDisponibles.map((servicio) => {
                const estaSeleccionado = Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.some(s => s && s.id === servicio.id);
                return (
                  <TouchableOpacity
                    key={servicio.id}
                    style={[
                      styles.servicioListItem,
                      estaSeleccionado && styles.servicioListItemSeleccionado
                    ]}
                    onPress={() => toggleServicioSeleccionado(servicio)}
                  >
                    <View style={styles.servicioListItemContent}>
                      <View style={styles.servicioListItemInfo}>
                        <Text style={[
                          styles.servicioListItemNombre,
                          estaSeleccionado && styles.servicioListItemNombreSeleccionado
                        ]}>
                          {servicio.nombre}
                        </Text>
                        {servicio.descripcion && (
                          <Text style={styles.servicioListItemDescripcion} numberOfLines={2}>
                            {servicio.descripcion}
                          </Text>
                        )}
                      </View>
                      {estaSeleccionado ? (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={24} color={COLORS.borderLight} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.emptyText}>No hay servicios disponibles para este vehículo</Text>
            )}
          </ScrollView>
        )}

        {/* Contador de servicios seleccionados */}
        {Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.length > 0 && (
          <View style={styles.serviciosSeleccionadosBadge}>
            <Text style={styles.serviciosSeleccionadosText}>
              {formData.servicios_seleccionados.length} servicio{formData.servicios_seleccionados.length !== 1 ? 's' : ''} seleccionado{formData.servicios_seleccionados.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Descripción del problema */}
        <View
          ref={descripcionProblemaRef}
          style={styles.descripcionContainer}
          onLayout={(event) => {
            // Guardar la posición Y de la descripción para hacer scroll
            const { y } = event.nativeEvent.layout;
            descripcionYPosition.current = y;
          }}
        >
          <Text style={styles.descripcionLabel}>Describe el problema o necesidad específica:</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="Ej: Mi auto hace un ruido extraño al frenar, necesito revisar las pastillas de freno..."
            value={formData.descripcion_problema || ''}
            onChangeText={(text) => setFormData(prev => ({ ...prev, descripcion_problema: text || '' }))}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    );
  };

  const renderPaso3 = () => {
    // Si hay servicio y proveedor preseleccionados pero no hay vehículo, mostrar selector de vehículo primero
    const necesitaSeleccionarVehiculo = tieneProveedorPreseleccionado &&
      tieneServicioPreseleccionado &&
      !formData.vehiculo;

    if (necesitaSeleccionarVehiculo) {
      return (
        <View style={styles.pasoContainer}>
          <Text style={styles.pasoTitle}>Selecciona tu vehículo</Text>
          <Text style={styles.pasoDescripcion}>
            Elige el vehículo para el cual necesitas el servicio
          </Text>

          {/* Mensaje informativo cuando hay proveedor preseleccionado */}
          {formData.proveedores_dirigidos.length > 0 && (
            <View style={[styles.infoBox, { backgroundColor: COLORS.info + '15', borderLeftColor: COLORS.info, marginBottom: SPACING.md }]}>
              <Ionicons name="information-circle" size={20} color={COLORS.info} style={{ marginRight: SPACING.xs }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoBoxText, { color: COLORS.info }]}>
                  Solicitud dirigida a {formData.proveedores_dirigidos[0]?.nombre || 'proveedor seleccionado'}
                </Text>
                <Text style={[styles.infoBoxSubtext, { color: COLORS.info + 'CC' }]}>
                  Esta solicitud se enviará directamente al proveedor desde cuyo perfil iniciaste el proceso
                </Text>
              </View>
            </View>
          )}

          {/* Mostrar servicio preseleccionado */}
          {Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.length > 0 && (
            <View style={[styles.infoBox, { backgroundColor: COLORS.success + '15', borderLeftColor: COLORS.success, marginBottom: SPACING.md }]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={{ marginRight: SPACING.xs }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoBoxText, { color: COLORS.success }]}>
                  Servicio: {formData.servicios_seleccionados[0]?.nombre || 'Servicio seleccionado'}
                </Text>
              </View>
            </View>
          )}

          {/* Selector de vehículos */}
          {vehiculos.length > 0 ? (
            <View style={styles.vehiculosList}>
              {vehiculos.map((vehiculo) => (
                <TouchableOpacity
                  key={vehiculo.id}
                  style={[
                    styles.vehiculoCard,
                    formData.vehiculo?.id === vehiculo.id && styles.vehiculoCardSeleccionado
                  ]}
                  onPress={() => handleVehiculoToggle(vehiculo)}
                >
                  <View style={styles.vehiculoCardContent}>
                    <Ionicons
                      name="car"
                      size={24}
                      color={formData.vehiculo?.id === vehiculo.id ? COLORS.primary : COLORS.textLight}
                    />
                    <View style={styles.vehiculoCardInfo}>
                      <Text style={[
                        styles.vehiculoCardNombre,
                        formData.vehiculo?.id === vehiculo.id && styles.vehiculoCardNombreSeleccionado
                      ]}>
                        {vehiculo.marca_nombre} {vehiculo.modelo_nombre}
                      </Text>
                      <Text style={styles.vehiculoCardDetalles}>
                        {vehiculo.ano} • {vehiculo.color || 'Sin color'}
                      </Text>
                    </View>
                    {formData.vehiculo?.id === vehiculo.id && (
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No tienes vehículos registrados</Text>
              <Text style={styles.emptySubtext}>
                Necesitas tener al menos un vehículo para crear una solicitud
              </Text>
            </View>
          )}
        </View>
      );
    }

    // Si ya hay vehículo seleccionado, mostrar el paso 3 normal (urgencia y repuestos)
    return (
      <View style={styles.pasoContainer}>
        <Text style={styles.pasoTitle}>¿Qué tan urgente es?</Text>
        <Text style={styles.pasoDescripcion}>
          Selecciona el nivel de urgencia del servicio
        </Text>

        {/* Mensaje informativo cuando hay proveedor preseleccionado */}
        {tieneProveedorPreseleccionado && formData.proveedores_dirigidos.length > 0 && (
          <View style={[styles.infoBox, { backgroundColor: COLORS.info + '15', borderLeftColor: COLORS.info, marginBottom: SPACING.md }]}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} style={{ marginRight: SPACING.xs }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoBoxText, { color: COLORS.info }]}>
                Solicitud dirigida a {formData.proveedores_dirigidos[0]?.nombre || 'proveedor seleccionado'}
              </Text>
              <Text style={[styles.infoBoxSubtext, { color: COLORS.info + 'CC' }]}>
                Esta solicitud se enviará directamente al proveedor desde cuyo perfil iniciaste el proceso
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.opcionCard,
            formData.urgencia === 'normal' && styles.opcionSeleccionada
          ]}
          onPress={() => setFormData(prev => ({ ...prev, urgencia: 'normal' }))}
        >
          <Ionicons
            name={formData.urgencia === 'normal' ? 'radio-button-on' : 'radio-button-off'}
            size={24}
            color={formData.urgencia === 'normal' ? COLORS.primary : COLORS.textLight}
          />
          <View style={styles.opcionContent}>
            <Text style={styles.opcionTitle}>Normal</Text>
            <Text style={styles.opcionDescripcion}>
              Puede esperar unos días
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.opcionCard,
            formData.urgencia === 'urgente' && styles.opcionSeleccionada
          ]}
          onPress={() => setFormData(prev => ({ ...prev, urgencia: 'urgente' }))}
        >
          <Ionicons
            name={formData.urgencia === 'urgente' ? 'radio-button-on' : 'radio-button-off'}
            size={24}
            color={formData.urgencia === 'urgente' ? COLORS.warning : COLORS.textLight}
          />
          <View style={styles.opcionContent}>
            <Text style={styles.opcionTitle}>Urgente</Text>
            <Text style={styles.opcionDescripcion}>
              Necesito el servicio lo antes posible
            </Text>
          </View>
        </TouchableOpacity>

        {/* Separador visual */}
        <View style={{ marginVertical: SPACING.md }} />

        {/* Selección de repuestos - Solo mostrar si NO todos los servicios son de "diagnóstico e inspección" */}
        {(() => {
          // Verificar si todos los servicios seleccionados son SOLO de "diagnóstico e inspección"
          const serviciosSeleccionados = Array.isArray(formData.servicios_seleccionados) ? formData.servicios_seleccionados : [];

          // Si no hay servicios seleccionados, mostrar la sección de repuestos
          if (serviciosSeleccionados.length === 0) {
            // Mostrar siempre si no hay servicios (caso por defecto)
          } else {
            // Buscar información de categoría en cada servicio seleccionado
            // Primero intentar desde el servicio seleccionado, luego buscar en serviciosDisponibles
            const todosSonDiagnosticoInspeccion = serviciosSeleccionados.every(servicioSeleccionado => {
              if (!servicioSeleccionado) return false;

              // Intentar obtener el nombre de la categoría desde diferentes fuentes
              let categoriaNombre = '';

              // 1. Desde el servicio seleccionado directamente
              categoriaNombre = servicioSeleccionado.categoria_nombre || '';

              // 2. Si no está en el servicio seleccionado, buscar en serviciosDisponibles
              if (!categoriaNombre && servicioSeleccionado.id) {
                const servicioCompleto = serviciosDisponibles.find(s => s.id === servicioSeleccionado.id);
                if (servicioCompleto) {
                  categoriaNombre = servicioCompleto.categoria_nombre || '';

                  // También buscar en categorías de las categorías cargadas
                  if (!categoriaNombre && servicioCompleto.categorias_ids && servicioCompleto.categorias_ids.length > 0) {
                    const categoriaId = servicioCompleto.categorias_ids[0];
                    const categoriaEncontrada = categorias.find(c => c.id === categoriaId);
                    if (categoriaEncontrada) {
                      categoriaNombre = categoriaEncontrada.nombre || '';
                    }
                  }
                }
              }

              // Normalizar el nombre de la categoría
              categoriaNombre = (categoriaNombre || '').toLowerCase().trim();

              // Debug log
              console.log('🔍 Verificando categoría de servicio:', {
                servicioId: servicioSeleccionado.id,
                servicioNombre: servicioSeleccionado.nombre,
                categoriaNombre: categoriaNombre,
                esDiagnostico: categoriaNombre.includes('diagnóstico') || categoriaNombre.includes('diagnostico') || categoriaNombre.includes('inspección') || categoriaNombre.includes('inspeccion')
              });

              // Verificar si contiene palabras clave de diagnóstico e inspección
              const esDiagnosticoInspeccion =
                categoriaNombre.includes('diagnóstico') ||
                categoriaNombre.includes('diagnostico') ||
                categoriaNombre.includes('inspección') ||
                categoriaNombre.includes('inspeccion') ||
                categoriaNombre === 'diagnóstico e inspección' ||
                categoriaNombre === 'diagnostico e inspeccion' ||
                categoriaNombre.startsWith('diagnóstico') ||
                categoriaNombre.startsWith('diagnostico');

              return esDiagnosticoInspeccion;
            });

            console.log('✅ Resultado verificación diagnóstico:', {
              totalServicios: serviciosSeleccionados.length,
              todosSonDiagnostico: todosSonDiagnosticoInspeccion
            });

            // Si TODOS los servicios son SOLO de diagnóstico e inspección, NO mostrar la sección
            if (todosSonDiagnosticoInspeccion) {
              return null; // No mostrar la sección de repuestos
            }
          }

          // Mostrar la sección de repuestos
          return (
            <>
              <Text style={styles.pasoTitle}>¿Necesitas repuestos?</Text>
              <Text style={styles.pasoDescripcion}>
                Selecciona si el servicio requiere repuestos o solo mano de obra
              </Text>

              <TouchableOpacity
                style={[
                  styles.opcionCard,
                  formData.requiere_repuestos === true && styles.opcionSeleccionada
                ]}
                onPress={() => setFormData(prev => ({ ...prev, requiere_repuestos: true }))}
              >
                <Ionicons
                  name={formData.requiere_repuestos === true ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={formData.requiere_repuestos === true ? COLORS.primary : COLORS.textLight}
                />
                <View style={styles.opcionContent}>
                  <Text style={styles.opcionTitle}>Con Repuestos</Text>
                  <Text style={styles.opcionDescripcion}>
                    El servicio incluye repuestos y mano de obra
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.opcionCard,
                  formData.requiere_repuestos === false && styles.opcionSeleccionada
                ]}
                onPress={() => setFormData(prev => ({ ...prev, requiere_repuestos: false }))}
              >
                <Ionicons
                  name={formData.requiere_repuestos === false ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={formData.requiere_repuestos === false ? COLORS.primary : COLORS.textLight}
                />
                <View style={styles.opcionContent}>
                  <Text style={styles.opcionTitle}>Sin Repuestos</Text>
                  <Text style={styles.opcionDescripcion}>
                    Solo necesito mano de obra (ya tengo los repuestos)
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          );
        })()}
      </View>
    );
  };

  // Componente Avatar para proveedores
  const ProviderAvatar = ({ proveedor, tipo, estaSeleccionado, size = 40 }) => {
    const [imageError, setImageError] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);

    const iconName = tipo === 'taller' ? 'business' : 'person';
    const iconColor = estaSeleccionado
      ? (tipo === 'taller' ? COLORS.primary : COLORS.secondary)
      : COLORS.textLight;

    // Obtener foto del proveedor
    useEffect(() => {
      const loadImage = async () => {
        const fotoUsuario = proveedor?.usuario?.foto_perfil;
        const fotoProveedor = proveedor?.foto_perfil;
        const url = fotoUsuario || fotoProveedor;

        if (url) {
          try {
            // Si la URL ya es completa, usarla directamente
            if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
              setImageUrl(url);
            } else {
              // Si no es completa, usar getMediaURL
              const fullUrl = await getMediaURL(url);
              setImageUrl(fullUrl);
            }
            setImageError(false);
          } catch (error) {
            console.error('Error cargando foto de proveedor:', error);
            setImageUrl(null);
            setImageError(true);
          }
        } else {
          setImageUrl(null);
          setImageError(true);
        }
      };

      loadImage();
    }, [proveedor?.usuario?.foto_perfil, proveedor?.foto_perfil]);

    const showPlaceholder = !imageUrl || imageError;
    const borderColor = estaSeleccionado
      ? (tipo === 'taller' ? COLORS.primary : COLORS.secondary)
      : COLORS.borderLight;

    return (
      <View style={[styles.avatarContainer, { width: size, height: size }]}>
        {!showPlaceholder ? (
          <Image
            source={{ uri: imageUrl }}
            style={[
              styles.avatarImage,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 2,
                borderColor: borderColor
              }
            ]}
            resizeMode="cover"
            onError={() => {
              setImageError(true);
            }}
          />
        ) : (
          <View style={[
            styles.avatarPlaceholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 2,
              borderColor: borderColor
            }
          ]}>
            <Ionicons name={iconName} size={size * 0.6} color={iconColor} />
          </View>
        )}
      </View>
    );
  };

  const renderPaso4 = () => {
    // Si hay proveedor preseleccionado, no mostrar este paso (se salta)
    if (tieneProveedorPreseleccionado) {
      return null;
    }

    if (!formData.vehiculo) {
      return (
        <View style={styles.pasoContainer}>
          <Text style={styles.errorText}>
            Primero debes seleccionar un vehículo
          </Text>
        </View>
      );
    }

    const todosProveedores = [...proveedoresDisponibles.talleres, ...proveedoresDisponibles.mecanicos];

    return (
      <View style={styles.pasoContainer}>
        <Text style={styles.pasoTitle}>Tipo de solicitud</Text>
        <Text style={styles.pasoDescripcion}>
          ¿Quieres que todos los proveedores vean tu solicitud o solo algunos específicos?
        </Text>

        <TouchableOpacity
          style={[
            styles.opcionCard,
            formData.tipo_solicitud === 'global' && styles.opcionSeleccionada
          ]}
          onPress={() => setFormData(prev => ({ ...prev, tipo_solicitud: 'global', proveedores_dirigidos: [] }))}
          disabled={tieneProveedorPreseleccionado}
        >
          <Ionicons
            name={formData.tipo_solicitud === 'global' ? 'radio-button-on' : 'radio-button-off'}
            size={24}
            color={formData.tipo_solicitud === 'global' ? COLORS.primary : COLORS.textLight}
          />
          <View style={styles.opcionContent}>
            <Text style={styles.opcionTitle}>Abierta a Todos</Text>
            <Text style={styles.opcionDescripcion}>
              Todos los proveedores que atienden tu {formData.vehiculo.marca_nombre} podrán ofertar
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.opcionCard,
            formData.tipo_solicitud === 'dirigida' && styles.opcionSeleccionada
          ]}
          onPress={() => setFormData(prev => ({ ...prev, tipo_solicitud: 'dirigida' }))}
          disabled={tieneProveedorPreseleccionado}
        >
          <Ionicons
            name={formData.tipo_solicitud === 'dirigida' ? 'radio-button-on' : 'radio-button-off'}
            size={24}
            color={formData.tipo_solicitud === 'dirigida' ? COLORS.primary : COLORS.textLight}
          />
          <View style={styles.opcionContent}>
            <Text style={styles.opcionTitle}>Solo Proveedores Específicos</Text>
            <Text style={styles.opcionDescripcion}>
              Selecciona hasta 3 proveedores que recibirán tu solicitud
            </Text>
          </View>
        </TouchableOpacity>

        {formData.tipo_solicitud === 'dirigida' && (
          <View style={styles.proveedoresContainer}>
            <Text style={styles.proveedoresTitle}>
              Selecciona los proveedores (máximo 3)
            </Text>
            <Text style={styles.proveedoresSubtitle}>
              {Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.length > 0
                ? `Proveedores que atienden tu ${formData.vehiculo.marca_nombre} y ofrecen los servicios seleccionados`
                : `Proveedores que atienden tu ${formData.vehiculo.marca_nombre} ${formData.vehiculo.modelo_nombre}`
              }
            </Text>

            {cargandoProveedores ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando proveedores...</Text>
              </View>
            ) : todosProveedores.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyText}>
                  {Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.length > 0
                    ? `No hay proveedores que atiendan tu ${formData.vehiculo.marca_nombre} y ofrezcan los servicios seleccionados`
                    : `No hay proveedores disponibles que atiendan tu ${formData.vehiculo.marca_nombre}`
                  }
                </Text>
                {Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.length > 0 && (
                  <Text style={[styles.emptyText, { marginTop: 8, fontSize: 14, opacity: 0.7 }]}>
                    Intenta seleccionar otros servicios o crear una solicitud abierta a todos
                  </Text>
                )}
              </View>
            ) : (
              <ScrollView
                style={styles.proveedoresList}
                nestedScrollEnabled={true}
                contentContainerStyle={styles.proveedoresListContent}
                showsVerticalScrollIndicator={true}
              >
                {/* Talleres */}
                {proveedoresDisponibles.talleres.length > 0 && (
                  <View>
                    <Text style={styles.proveedoresSectionTitle}>
                      Talleres ({proveedoresDisponibles.talleres.length})
                    </Text>
                    {proveedoresDisponibles.talleres.map((taller) => {
                      const tallerUsuarioId = taller.usuario?.id || taller.usuario || taller.id;
                      const estaSeleccionado = formData.proveedores_dirigidos.some(p => {
                        const pUsuarioId = p.usuario?.id || p.usuario || p.usuario_id || p.id;
                        return pUsuarioId === tallerUsuarioId && p.tipo === 'taller';
                      });
                      return (
                        <TouchableOpacity
                          key={`taller-${taller.id}`}
                          style={[
                            styles.proveedorCard,
                            estaSeleccionado && styles.proveedorCardSeleccionado
                          ]}
                          onPress={() => toggleProveedorSeleccionado(taller, 'taller')}
                        >
                          <View style={styles.proveedorCardContent}>
                            <ProviderAvatar
                              proveedor={taller}
                              tipo="taller"
                              estaSeleccionado={estaSeleccionado}
                              size={40}
                            />
                            <View style={styles.proveedorCardInfo}>
                              <Text style={[
                                styles.proveedorCardNombre,
                                estaSeleccionado && styles.proveedorCardNombreSeleccionado
                              ]}>
                                {taller.nombre || 'Sin nombre'}
                              </Text>
                              {(taller.direccion_fisica?.direccion_completa || taller.direccion) && (
                                <Text style={styles.proveedorCardDireccion} numberOfLines={1}>
                                  {String(taller.direccion_fisica?.direccion_completa || taller.direccion || '')}
                                </Text>
                              )}
                              {taller.calificacion_promedio != null && (
                                <View style={styles.proveedorCardRating}>
                                  <Ionicons name="star" size={14} color={COLORS.warning} />
                                  <Text style={styles.proveedorCardRatingText}>
                                    {Number(taller.calificacion_promedio).toFixed(1)} ({taller.total_resenas || 0} reseñas)
                                  </Text>
                                </View>
                              )}
                            </View>
                            {estaSeleccionado ? (
                              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                            ) : (
                              <Ionicons name="ellipse-outline" size={24} color={COLORS.borderLight} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Mecánicos */}
                {proveedoresDisponibles.mecanicos.length > 0 && (
                  <View style={styles.mecanicosSection}>
                    <Text style={styles.proveedoresSectionTitle}>
                      Mecánicos a Domicilio ({proveedoresDisponibles.mecanicos.length})
                    </Text>
                    {proveedoresDisponibles.mecanicos.map((mecanico) => {
                      const mecanicoUsuarioId = mecanico.usuario?.id || mecanico.usuario || mecanico.id;
                      const estaSeleccionado = formData.proveedores_dirigidos.some(p => {
                        const pUsuarioId = p.usuario?.id || p.usuario || p.usuario_id || p.id;
                        return pUsuarioId === mecanicoUsuarioId && p.tipo === 'mecanico';
                      });
                      return (
                        <TouchableOpacity
                          key={`mecanico-${mecanico.id}`}
                          style={[
                            styles.proveedorCard,
                            estaSeleccionado && styles.proveedorCardSeleccionado
                          ]}
                          onPress={() => toggleProveedorSeleccionado(mecanico, 'mecanico')}
                        >
                          <View style={styles.proveedorCardContent}>
                            <ProviderAvatar
                              proveedor={mecanico}
                              tipo="mecanico"
                              estaSeleccionado={estaSeleccionado}
                              size={40}
                            />
                            <View style={styles.proveedorCardInfo}>
                              <Text style={[
                                styles.proveedorCardNombre,
                                estaSeleccionado && styles.proveedorCardNombreSeleccionado
                              ]}>
                                {mecanico.nombre || 'Sin nombre'}
                              </Text>
                              {(mecanico.direccion_fisica?.direccion_completa || mecanico.direccion) && (
                                <Text style={styles.proveedorCardDireccion} numberOfLines={1}>
                                  {String(mecanico.direccion_fisica?.direccion_completa || mecanico.direccion || '')}
                                </Text>
                              )}
                              {mecanico.calificacion_promedio != null && (
                                <View style={styles.proveedorCardRating}>
                                  <Ionicons name="star" size={14} color={COLORS.warning} />
                                  <Text style={styles.proveedorCardRatingText}>
                                    {Number(mecanico.calificacion_promedio).toFixed(1)} ({mecanico.total_resenas || 0} reseñas)
                                  </Text>
                                </View>
                              )}
                            </View>
                            {estaSeleccionado ? (
                              <Ionicons name="checkmark-circle" size={24} color={COLORS.secondary} />
                            ) : (
                              <Ionicons name="ellipse-outline" size={24} color={COLORS.borderLight} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

              </ScrollView>
            )}

            {/* Contador de proveedores seleccionados - Fuera del ScrollView */}
            {formData.proveedores_dirigidos.length > 0 && (
              <View style={styles.proveedoresSeleccionadosBadge}>
                <Text style={styles.proveedoresSeleccionadosText}>
                  {formData.proveedores_dirigidos.length} de 3 proveedores seleccionados
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderPaso5 = () => (
    <View style={styles.pasoContainer}>
      <Text style={styles.pasoTitle}>Ubicación del servicio</Text>
      <Text style={styles.pasoDescripcion}>
        Selecciona una dirección registrada o ingresa una nueva
      </Text>

      {/* Mensaje informativo cuando hay proveedor preseleccionado */}
      {tieneProveedorPreseleccionado && formData.proveedores_dirigidos.length > 0 && (
        <View style={[styles.infoBox, { backgroundColor: COLORS.info + '15', borderLeftColor: COLORS.info, marginBottom: SPACING.md }]}>
          <Ionicons name="information-circle" size={20} color={COLORS.info} style={{ marginRight: SPACING.xs }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBoxText, { color: COLORS.info }]}>
              Solicitud dirigida a {formData.proveedores_dirigidos[0]?.nombre || 'proveedor seleccionado'}
            </Text>
            <Text style={[styles.infoBoxSubtext, { color: COLORS.info + 'CC' }]}>
              Esta solicitud se enviará directamente al proveedor desde cuyo perfil iniciaste el proceso
            </Text>
          </View>
        </View>
      )}

      <AddressSelector
        currentAddress={formData.direccion_usuario}
        onAddressChange={(direccion) => {
          setFormData(prev => ({
            ...prev,
            direccion_usuario: direccion,
            direccion_servicio_texto: direccion?.direccion || '',
            ubicacion_servicio: direccion?.ubicacion || null
          }));
        }}
      />

      {formData.direccion_usuario && (
        <Card style={styles.direccionSeleccionada}>
          <Text style={styles.direccionText}>
            {formData.direccion_usuario.direccion}
          </Text>
          {formData.direccion_usuario.detalles && (
            <Text style={styles.direccionDetalles}>
              {formData.direccion_usuario.detalles}
            </Text>
          )}
        </Card>
      )}

      <TextInput
        style={styles.input}
        placeholder="Detalles adicionales (opcional)"
        value={formData.detalles_ubicacion}
        onChangeText={(text) => setFormData(prev => ({ ...prev, detalles_ubicacion: text }))}
        placeholderTextColor={COLORS.textLight}
      />
    </View>
  );

  const validarFecha = (fecha) => {
    if (!fecha) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(fecha)) return false;
    const date = new Date(fecha);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today && !isNaN(date.getTime());
  };

  const validarHora = (hora) => {
    if (!hora) return true; // Hora es opcional
    const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(hora);
  };

  // Función auxiliar para formatear fecha a YYYY-MM-DD
  const formatearFechaYYYYMMDD = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.error('❌ Error: fecha inválida para formatear:', date);
      return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() es 0-11, necesitamos 1-12
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Funciones para el calendario
  const generarCalendario = () => {
    const year = mesCalendario.getFullYear();
    const month = mesCalendario.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const calendario = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Días del mes anterior
    for (let i = firstDayWeek - 1; i >= 0; i--) {
      const prevMonthDate = new Date(year, month, -i); // -i nos da los días del mes anterior
      const fechaStr = formatearFechaYYYYMMDD(prevMonthDate);
      calendario.push({
        day: prevMonthDate.getDate(),
        isCurrentMonth: false,
        date: prevMonthDate,
        fecha: fechaStr,
        disponible: false
      });
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const fecha = new Date(year, month, day);
      const fechaStr = formatearFechaYYYYMMDD(fecha);
      calendario.push({
        day,
        isCurrentMonth: true,
        date: fecha,
        fecha: fechaStr,
        disponible: fecha >= hoy
      });
    }

    // Completar con días del siguiente mes
    const remainingDays = 42 - calendario.length;
    for (let day = 1; day <= remainingDays; day++) {
      const fecha = new Date(year, month + 1, day);
      const fechaStr = formatearFechaYYYYMMDD(fecha);
      calendario.push({
        day,
        isCurrentMonth: false,
        date: fecha,
        fecha: fechaStr,
        disponible: false
      });
    }

    return calendario;
  };

  const cambiarMes = (direccion) => {
    setMesCalendario(prev => {
      const nuevoMes = new Date(prev);
      nuevoMes.setMonth(prev.getMonth() + direccion);
      return nuevoMes;
    });
  };

  const seleccionarFecha = (fechaStr) => {
    console.log('📅 Fecha seleccionada:', fechaStr);
    // Validar que la fecha esté en formato YYYY-MM-DD
    const regexYYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexYYYYMMDD.test(fechaStr)) {
      console.error('❌ Error: Fecha no está en formato YYYY-MM-DD:', fechaStr);
      Alert.alert('Error', 'La fecha seleccionada tiene un formato inválido. Por favor, intenta nuevamente.');
      return;
    }
    console.log('✅ Fecha validada correctamente:', fechaStr);
    setFormData({ ...formData, fecha_preferida: fechaStr });
    setMostrarCalendario(false);
  };

  // Generar horas disponibles (cada 30 minutos de 8:00 a 20:00)
  const generarHorasDisponibles = () => {
    const horas = [];
    for (let hora = 8; hora < 20; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 30) {
        const horaStr = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
        horas.push(horaStr);
      }
    }
    return horas;
  };

  const seleccionarHora = (hora) => {
    setFormData(prev => ({ ...prev, hora_preferida: hora }));
    setMostrarSelectorHora(false);
  };

  const diasSemana = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const renderPaso6 = () => {
    const calendario = generarCalendario();
    const horasDisponibles = generarHorasDisponibles();

    return (
      <View style={styles.pasoContainer}>
        <Text style={styles.pasoTitle}>Fecha y hora preferida</Text>
        <Text style={styles.pasoDescripcion}>
          ¿Cuándo te gustaría recibir el servicio?
        </Text>

        {/* Selector de Fecha */}
        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => {
            console.log('📅 Abriendo calendario desde paso 6');
            setMostrarCalendario(true);
          }}
        >
          <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
          <View style={styles.dateTimeButtonContent}>
            <Text style={styles.dateTimeButtonLabel}>Fecha</Text>
            <Text style={styles.dateTimeButtonValue}>
              {formData.fecha_preferida
                ? formatDate(formData.fecha_preferida)
                : 'Seleccionar fecha'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </TouchableOpacity>

        {/* Selector de Hora */}
        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => {
            if (!formData.fecha_preferida) {
              Alert.alert('Selecciona fecha primero', 'Debes seleccionar una fecha antes de elegir la hora');
              return;
            }
            setMostrarSelectorHora(true);
          }}
          disabled={!formData.fecha_preferida}
        >
          <Ionicons
            name="time-outline"
            size={24}
            color={formData.fecha_preferida ? COLORS.primary : COLORS.textLight}
          />
          <View style={styles.dateTimeButtonContent}>
            <Text style={styles.dateTimeButtonLabel}>Hora (Opcional)</Text>
            <Text style={[
              styles.dateTimeButtonValue,
              !formData.hora_preferida && styles.dateTimeButtonValuePlaceholder
            ]}>
              {formData.hora_preferida
                ? formatTime(formData.hora_preferida)
                : 'Seleccionar hora'}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={formData.fecha_preferida ? COLORS.textLight : COLORS.borderLight}
          />
        </TouchableOpacity>

        {/* Preview de fecha y hora seleccionada */}
        {formData.fecha_preferida && validarFecha(formData.fecha_preferida) && (
          <View style={styles.fechaPreview}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.fechaPreviewText}>
              {formatDate(formData.fecha_preferida)}
              {formData.hora_preferida && validarHora(formData.hora_preferida) &&
                ` a las ${formatTime(formData.hora_preferida)}`}
            </Text>
          </View>
        )}

        {/* Modal de Calendario */}
        <Modal
          visible={mostrarCalendario}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setMostrarCalendario(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seleccionar Fecha</Text>
                <TouchableOpacity
                  onPress={() => setMostrarCalendario(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {/* Navegación del mes */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  onPress={() => cambiarMes(-1)}
                  style={styles.calendarNavButton}
                >
                  <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.calendarMonthText}>
                  {mesesNombres[mesCalendario.getMonth()]} {mesCalendario.getFullYear()}
                </Text>
                <TouchableOpacity
                  onPress={() => cambiarMes(1)}
                  style={styles.calendarNavButton}
                >
                  <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Días de la semana */}
              <View style={styles.calendarWeekDays}>
                {diasSemana.map((dia, index) => (
                  <View key={index} style={styles.calendarWeekDay}>
                    <Text style={styles.calendarWeekDayText}>{dia}</Text>
                  </View>
                ))}
              </View>

              {/* Calendario */}
              <View style={styles.calendarGrid}>
                {calendario.map((dia, index) => {
                  const esSeleccionado = dia.fecha === formData.fecha_preferida;
                  const hoy = new Date();
                  hoy.setHours(0, 0, 0, 0);
                  const esHoy = dia.date.getTime() === hoy.getTime();

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.calendarDay,
                        !dia.isCurrentMonth && styles.calendarDayOtherMonth,
                        !dia.disponible && styles.calendarDayDisabled,
                        esHoy && styles.calendarDayToday,
                        esSeleccionado && styles.calendarDaySelected
                      ]}
                      onPress={() => {
                        if (dia.disponible) {
                          console.log('📅 Día seleccionado del calendario:', dia.fecha, 'Formato:', typeof dia.fecha);
                          seleccionarFecha(dia.fecha);
                        } else {
                          console.log('⚠️ Día no disponible:', dia.fecha);
                        }
                      }}
                      disabled={!dia.disponible}
                    >
                      <Text style={[
                        styles.calendarDayText,
                        !dia.isCurrentMonth && styles.calendarDayTextOtherMonth,
                        !dia.disponible && styles.calendarDayTextDisabled,
                        esHoy && styles.calendarDayTextToday,
                        esSeleccionado && styles.calendarDayTextSelected
                      ]}>
                        {dia.day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de Selector de Hora */}
        <Modal
          visible={mostrarSelectorHora}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setMostrarSelectorHora(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seleccionar Hora</Text>
                <TouchableOpacity
                  onPress={() => setMostrarSelectorHora(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.hoursList}>
                {horasDisponibles.map((hora) => {
                  const esSeleccionado = hora === formData.hora_preferida;
                  return (
                    <TouchableOpacity
                      key={hora}
                      style={[
                        styles.hourItem,
                        esSeleccionado && styles.hourItemSelected
                      ]}
                      onPress={() => seleccionarHora(hora)}
                    >
                      <Text style={[
                        styles.hourItemText,
                        esSeleccionado && styles.hourItemTextSelected
                      ]}>
                        {hora}
                      </Text>
                      {esSeleccionado && (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.hourClearButton}
                onPress={() => {
                  setFormData(prev => ({ ...prev, hora_preferida: '' }));
                  setMostrarSelectorHora(false);
                }}
              >
                <Text style={styles.hourClearButtonText}>Limpiar hora</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderPaso = () => {
    switch (pasoActual) {
      case 1: return renderPaso1();
      case 2: return renderPaso2();
      case 3: return renderPaso3();
      case 4: return renderPaso4();
      case 5: return renderPaso5();
      case 6: return renderPaso6();
      default: return null;
    }
  };

  // Calcular el paso visual para mostrar en la barra de progreso
  // Cuando hay servicio y/o proveedor preseleccionado, mapear pasos reales a pasos visuales
  const getPasoVisual = () => {
    // Flujo normal: paso real = paso visual
    if (!tieneServicioPreseleccionado && !tieneProveedorPreseleccionado) {
      return pasoActual;
    }

    // Flujo con servicio + proveedor preseleccionados: mapear pasos (4 pasos visuales: 1→3→5→6)
    if (tieneProveedorPreseleccionado && tieneServicioPreseleccionado) {
      const mapaPasos = {
        1: 1, // Vehículo (paso visual 1)
        3: 2, // Urgencia (paso visual 2, saltamos el paso 2 real)
        5: 3, // Ubicación (paso visual 3, saltamos el paso 4 real)
        6: 4  // Fecha/hora (paso visual 4, último paso)
      };
      return mapaPasos[pasoActual] || pasoActual;
    }

    // Flujo con solo servicio preseleccionado: mapear pasos (5 pasos visuales: 1→3→4→5→6)
    if (tieneServicioPreseleccionado) {
      const mapaPasos = {
        1: 1, // Vehículo (paso visual 1)
        3: 2, // Urgencia (paso visual 2, saltamos el paso 2 real)
        4: 3, // Tipo solicitud (paso visual 3)
        5: 4, // Ubicación (paso visual 4)
        6: 5  // Fecha/hora (paso visual 5, último paso)
      };
      return mapaPasos[pasoActual] || pasoActual;
    }

    return pasoActual;
  };

  const pasoVisual = getPasoVisual();

  // Determinar si estamos en el último paso real
  const esUltimoPaso = () => {
    if (tieneProveedorPreseleccionado && tieneServicioPreseleccionado) {
      // Flujo de 4 pasos: 1→3→5→6 (paso 6 es el último)
      return pasoActual === 6;
    } else if (tieneServicioPreseleccionado) {
      // Flujo de 5 pasos: 1→3→4→5→6 (paso 6 es el último)
      return pasoActual === 6;
    } else {
      // Flujo normal de 6 pasos: 1→2→3→4→5→6 (paso 6 es el último)
      return pasoActual === 6;
    }
  };

  // Obtener tema para los botones de navegación y categorías
  const theme = useTheme();
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};

  // Asegurar que typography tenga todas las propiedades necesarias
  const safeTypography = typography?.fontSize && typography?.fontWeight
    ? typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
    };

  // Validar que borders esté completamente inicializado
  const safeBorders = (borders?.radius && typeof borders.radius.full !== 'undefined')
    ? borders
    : {
      radius: {
        none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 24,
        full: 9999,
        button: { sm: 8, md: 12, lg: 16, full: 9999 },
        input: { sm: 8, md: 12, lg: 16 },
        card: { sm: 8, md: 12, lg: 16, xl: 20 },
        modal: { sm: 12, md: 16, lg: 20, xl: 24 },
        avatar: { sm: 16, md: 24, lg: 32, full: 9999 },
        badge: { sm: 4, md: 8, lg: 12, full: 9999 },
      },
      width: { none: 0, thin: 1, medium: 2, thick: 4 }
    };

  // Crear estilos dinámicos para los botones de navegación
  const navStyles = createNavStyles(colors, safeTypography, spacing, safeBorders);

  // Colores para el gradiente del botón siguiente
  const gradientColors = [
    '#2563EB', // Blue-600
    '#2563EB'  // Solid color effect
  ];

  return (
    <View style={styles.container}>
      {/* Indicador de progreso */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Paso {pasoVisual} de {totalPasos}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(pasoVisual / totalPasos) * 100}%` }
            ]}
          />
        </View>
      </View>

      {/* Contenido del paso */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingBottom: contentPaddingBottom + (spacing.md || 16) +
            (pasoActual === 4 && formData.proveedores_dirigidos.length > 0 ? (spacing.lg || 24) : 0)
        }}
        showsVerticalScrollIndicator={false}
      >
        {renderPaso()}
      </ScrollView>

      {/* Botones de navegación */}
      <View style={[navStyles.navigation, { paddingBottom: contentPaddingBottom + (spacing.md || 16) }]}>
        {pasoActual === 1 && onExit && (
          <TouchableOpacity
            onPress={onExit}
            style={[navStyles.navButton, navStyles.backButton]}
            activeOpacity={0.8}
          >
            <View style={navStyles.backButtonContainer}>
              <Text style={navStyles.backButtonText}>Salir</Text>
            </View>
          </TouchableOpacity>
        )}
        {pasoActual > 1 && (
          <TouchableOpacity
            onPress={handleBack}
            style={[navStyles.navButton, navStyles.backButton]}
            activeOpacity={0.8}
          >
            <View style={navStyles.backButtonContainer}>
              <Text style={navStyles.backButtonText}>Atrás</Text>
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleNext}
          style={[navStyles.navButton, navStyles.nextButton]}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={navStyles.nextButtonGradient}
          >
            <Text style={navStyles.nextButtonText}>
              {esUltimoPaso() ? 'Crear Solicitud' : 'Siguiente'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  progressContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SPACING.xs
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDERS.radius.sm,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDERS.radius.sm
  },
  scrollView: {
    flex: 1
  },
  pasoContainer: {
    padding: SPACING.md
  },
  pasoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs
  },
  pasoDescripcion: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SPACING.lg
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 120,
    backgroundColor: COLORS.white
  },
  opcionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDERS.radius.md,
    borderWidth: 2,
    borderColor: COLORS.borderLight
  },
  opcionSeleccionada: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F7FF'
  },
  opcionContent: {
    flex: 1,
    marginLeft: SPACING.sm
  },
  opcionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs
  },
  opcionDescripcion: {
    fontSize: 14,
    color: COLORS.textLight
  },
  vehiculosList: {
    marginTop: SPACING.md
  },
  vehiculoCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  vehiculoCardSeleccionado: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F7FF'
  },
  vehiculoCardContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  vehiculoCardInfo: {
    flex: 1,
    marginLeft: SPACING.sm
  },
  vehiculoCardNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs
  },
  vehiculoCardNombreSeleccionado: {
    color: COLORS.primary
  },
  vehiculoCardDetalles: {
    fontSize: 14,
    color: COLORS.textLight
  },
  vehiculoSeleccionado: {
    marginTop: SPACING.md,
    backgroundColor: '#E8F5E9'
  },
  vehiculoSeleccionadoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    justifyContent: 'space-between'
  },
  deseleccionarVehiculoButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm
  },
  vehiculoText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.success
  },
  direccionSeleccionada: {
    marginTop: SPACING.md,
    backgroundColor: '#E3F2FD'
  },
  direccionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary
  },
  direccionDetalles: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: SPACING.xs
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    marginTop: SPACING.sm
  },
  dateTimeContainer: {
    marginTop: SPACING.md
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.white,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md
  },
  inputIcon: {
    marginRight: SPACING.sm
  },
  dateInput: {
    flex: 1,
    borderWidth: 0,
    marginTop: 0,
    paddingVertical: SPACING.md
  },
  timeInput: {
    flex: 1,
    borderWidth: 0,
    marginTop: 0,
    paddingVertical: SPACING.md
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: SPACING.xs,
    marginLeft: SPACING.md
  },
  fechaPreview: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: '#E8F5E9',
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: COLORS.success
  },
  fechaPreviewText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '600'
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: SPACING.sm
  },
  dateTimeText: {
    fontSize: 16,
    color: COLORS.text
  },
  notaContainer: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: '#FFF3E0',
    borderRadius: BORDERS.radius.sm
  },
  notaText: {
    fontSize: 12,
    color: COLORS.warning,
    fontStyle: 'italic'
  },
  // Estilos de navegación movidos a createNavStyles() para usar el nuevo sistema de diseño
  // Estilos para servicios (Paso 2)
  vistaSelector: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: SPACING.sm
  },
  vistaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDERS.radius.md,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    gap: SPACING.xs
  },
  vistaButtonActiva: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F7FF'
  },
  vistaButtonText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500'
  },
  vistaButtonTextActiva: {
    color: COLORS.primary,
    fontWeight: '600'
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textLight
  },
  categoriasContainer: {
    marginTop: SPACING.md
  },
  categoriasHorizontal: {
    paddingVertical: SPACING.sm || 8,
    paddingLeft: SPACING.md || 16,
    paddingRight: SPACING.md || 16,
    alignItems: 'center',
  },
  emptyCategoriasContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.xl,
  },
  backToCategories: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.xs
  },
  backToCategoriesText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600'
  },
  categoriaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md
  },
  serviciosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm
  },
  servicioCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  servicioCardSeleccionado: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F7FF'
  },
  servicioCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs
  },
  servicioCardNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1
  },
  servicioCardNombreSeleccionado: {
    color: COLORS.primary
  },
  servicioCardDescripcion: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: SPACING.xs
  },
  serviciosListContainer: {
    maxHeight: 400,
    marginTop: SPACING.md
  },
  servicioListItem: {
    backgroundColor: COLORS.white,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  servicioListItemSeleccionado: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F7FF'
  },
  servicioListItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm
  },
  servicioListItemInfo: {
    flex: 1
  },
  servicioListItemNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs
  },
  servicioListItemNombreSeleccionado: {
    color: COLORS.primary
  },
  servicioListItemDescripcion: {
    fontSize: 14,
    color: COLORS.textLight
  },
  serviciosSeleccionadosBadge: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: '#E8F5E9',
    borderRadius: BORDERS.radius.md,
    alignItems: 'center'
  },
  serviciosSeleccionadosText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success
  },
  // Estilos para servicios preseleccionados
  serviciosPreseleccionadosContainer: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md
  },
  servicioPreseleccionadoCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.success
  },
  servicioPreseleccionadoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs
  },
  servicioPreseleccionadoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SPACING.sm,
    flex: 1
  },
  servicioPreseleccionadoDescripcion: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    lineHeight: 18
  },
  servicioPreseleccionadoPrecio: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SPACING.xs
  },
  cambiarServicioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDERS.radius.md,
    gap: SPACING.xs
  },
  cambiarServicioButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary
  },
  descripcionContainer: {
    marginTop: SPACING.lg
  },
  descripcionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.md
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: SPACING.md
  },
  // Estilos para proveedores (Paso 4)
  proveedoresContainer: {
    marginTop: SPACING.lg
  },
  proveedoresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs
  },
  proveedoresSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SPACING.md
  },
  proveedoresList: {
    maxHeight: 500
  },
  proveedoresListContent: {
    paddingBottom: SPACING.lg || 20
  },
  proveedoresSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm
  },
  mecanicosSection: {
    marginTop: SPACING.lg
  },
  proveedorCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  proveedorCardSeleccionado: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F7FF'
  },
  proveedorCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    backgroundColor: COLORS.borderLight,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proveedorCardInfo: {
    flex: 1
  },
  proveedorCardNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs
  },
  proveedorCardNombreSeleccionado: {
    color: COLORS.primary
  },
  proveedorCardDireccion: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: SPACING.xs
  },
  proveedorCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs
  },
  proveedorCardRatingText: {
    fontSize: 12,
    color: COLORS.textLight
  },
  proveedoresSeleccionadosBadge: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: '#E3F2FD',
    borderRadius: BORDERS.radius.md,
    alignItems: 'center'
  },
  proveedoresSeleccionadosText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary
  },
  // Estilos para selector de fecha y hora (Paso 6)
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  dateTimeButtonContent: {
    flex: 1,
    marginLeft: SPACING.sm
  },
  dateTimeButtonLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: SPACING.xs
  },
  dateTimeButtonValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text
  },
  dateTimeButtonValuePlaceholder: {
    color: COLORS.textLight,
    fontWeight: '400'
  },
  fechaPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: '#E8F5E9',
    borderRadius: BORDERS.radius.md,
    gap: SPACING.sm
  },
  fechaPreviewText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
    flex: 1
  },
  // Estilos para modal de calendario
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.md,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text
  },
  modalCloseButton: {
    padding: SPACING.xs
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md
  },
  calendarNavButton: {
    padding: SPACING.sm
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: SPACING.sm
  },
  calendarWeekDay: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.xs
  },
  calendarWeekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs
  },
  calendarDayOtherMonth: {
    opacity: 0.3
  },
  calendarDayDisabled: {
    opacity: 0.3
  },
  calendarDayToday: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: BORDERS.radius.sm
  },
  calendarDaySelected: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDERS.radius.sm
  },
  calendarDayText: {
    fontSize: 14,
    color: COLORS.text
  },
  calendarDayTextOtherMonth: {
    color: COLORS.textLight
  },
  calendarDayTextDisabled: {
    color: COLORS.textLight
  },
  calendarDayTextToday: {
    fontWeight: '700',
    color: COLORS.primary
  },
  calendarDayTextSelected: {
    fontWeight: '700',
    color: COLORS.white
  },
  // Estilos para selector de hora
  hoursList: {
    maxHeight: 400,
    marginBottom: SPACING.md
  },
  hourItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDERS.radius.md,
    borderWidth: 2,
    borderColor: COLORS.borderLight
  },
  hourItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F7FF'
  },
  hourItemText: {
    fontSize: 16,
    color: COLORS.text
  },
  hourItemTextSelected: {
    fontWeight: '600',
    color: COLORS.primary
  },
  hourClearButton: {
    padding: SPACING.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  hourClearButtonText: {
    fontSize: 16,
    color: COLORS.danger,
    fontWeight: '600'
  },
  // Estilos para mensajes informativos
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    borderRadius: BORDERS.radius.md,
    borderLeftWidth: 4,
    marginBottom: SPACING.md
  },
  infoBoxText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.xs
  },
  infoBoxSubtext: {
    fontSize: 12,
    lineHeight: 18
  }
});

// Función para crear estilos dinámicos de los botones de navegación basados en el tema
const createNavStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  navigation: {
    flexDirection: 'row',
    padding: spacing.md || 16,
    paddingTop: spacing.md || 16,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderTopWidth: borders.width?.thin || 1,
    borderTopColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    gap: spacing.sm || 12,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  navButton: {
    flex: 1,
  },
  backButton: {
    borderRadius: borders.radius?.button?.md || 12,
    overflow: 'hidden',
  },
  backButtonContainer: {
    paddingVertical: spacing.md || 14,
    paddingHorizontal: spacing.lg || 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borders.radius?.button?.md || 12,
    backgroundColor: colors.neutral?.gray?.[100] || colors.background?.default || '#F3F4F6',
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[300] || '#D1D5DB',
  },
  backButtonText: {
    color: colors.text?.primary || '#00171F',
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.bold || '700',
    letterSpacing: typography.letterSpacing?.normal || 0,
  },
  nextButton: {
    borderRadius: borders.radius?.button?.md || 12,
    overflow: 'hidden',
    shadowColor: colors.primary?.[500] || '#003459',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  nextButtonGradient: {
    paddingVertical: spacing.md || 14,
    paddingHorizontal: spacing.lg || 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borders.radius?.button?.md || 12,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.bold || '700',
    letterSpacing: typography.letterSpacing?.normal || 0,
  },
});

export default FormularioSolicitud;

