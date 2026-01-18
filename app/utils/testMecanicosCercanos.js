import * as providerService from '../services/providers';

/**
 * Función para probar mecánicos cercanos desde el console del navegador
 * Ejecutar: testMecanicosCercanos()
 */
export const testMecanicosCercanos = async () => {
  console.log('🧪 ===== INICIANDO TEST DE MECÁNICOS CERCANOS =====');
  
  try {
    // Test 1: Verificar que la función existe
    console.log('🔍 Test 1: Verificando función getMecanicosRealmenteCercanos');
    console.log('   Tipo:', typeof providerService.getMecanicosRealmenteCercanos);
    console.log('   Existe:', !!providerService.getMecanicosRealmenteCercanos);
    
    if (!providerService.getMecanicosRealmenteCercanos) {
      console.error('❌ La función getMecanicosRealmenteCercanos no existe');
      return;
    }
    
    // Test 2: Llamada directa al endpoint
    console.log('\n🔍 Test 2: Llamada directa a getNearbyMechanics');
    const mecanicosDirect = await providerService.getNearbyMechanics(
      -33.4679,
      -70.6738,
      10,
      6 // Ford
    );
    console.log('   Mecánicos encontrados (directo):', mecanicosDirect.length);
    console.log('   Primer mecánico:', mecanicosDirect[0]);
    
    // Test 3: Llamada completa con dirección y vehículos simulados
    console.log('\n🔍 Test 3: Llamada completa getMecanicosRealmenteCercanos');
    
    const direccionSimulada = {
      id: 1,
      direccion: 'Longaví 2954, Santiago, Chile',
      ubicacion: {
        coordinates: [-70.6738, -33.4679] // [lng, lat]
      }
    };
    
    const vehiculosSimulados = [
      {
        marca_id: 6,
        marca_nombre: 'Ford',
        modelo_nombre: 'Escape'
      }
    ];
    
    const mecanicosCompletos = await providerService.getMecanicosRealmenteCercanos(
      direccionSimulada,
      vehiculosSimulados,
      10
    );
    
    console.log('   Mecánicos encontrados (completo):', mecanicosCompletos.length);
    if (mecanicosCompletos.length > 0) {
      console.log('   Primer mecánico completo:', mecanicosCompletos[0]);
      console.log('   Distancia:', mecanicosCompletos[0].distance + 'km');
      console.log('   Especialidades:', mecanicosCompletos[0].marcas_compatibles);
    }
    
    console.log('\n✅ TODOS LOS TESTS COMPLETADOS EXITOSAMENTE');
    return {
      direct: mecanicosDirect,
      complete: mecanicosCompletos
    };
    
  } catch (error) {
    console.error('❌ ERROR EN TEST:', error);
    console.error('   Stack:', error.stack);
    return null;
  }
};

// Función para probar sin parámetros (usar ubicación GPS)
export const testMecanicosSinParametros = async () => {
  console.log('🧪 ===== TEST SIN PARÁMETROS (GPS) =====');
  
  try {
    const mecanicos = await providerService.getMecanicosRealmenteCercanos(
      null, // Sin dirección
      [],   // Sin vehículos
      10    // Radio 10km
    );
    
    console.log('   Mecánicos encontrados:', mecanicos.length);
    console.log('   Primer mecánico:', mecanicos[0]);
    
    return mecanicos;
  } catch (error) {
    console.error('❌ ERROR EN TEST SIN PARÁMETROS:', error);
    return [];
  }
};

// Auto-export para console global
if (typeof window !== 'undefined') {
  window.testMecanicosCercanos = testMecanicosCercanos;
  window.testMecanicosSinParametros = testMecanicosSinParametros;
  console.log('🧪 Funciones de test disponibles globalmente:');
  console.log('   - testMecanicosCercanos()');
  console.log('   - testMecanicosSinParametros()');
} 