/**
 * Script de testing para verificar el funcionamiento de talleres cercanos
 * Ejecutar desde la consola de React Native Debugger o con console.log
 */

import * as providerService from '../services/providers';
import * as locationService from '../services/location';

// Coordenadas de prueba en Santiago
const TEST_LOCATIONS = {
  santiago_centro: { lat: -33.4489, lng: -70.6693, name: 'Santiago Centro' },
  longavi_santiago: { lat: -33.4470, lng: -70.6506, name: 'Longavi, Santiago' }, // Aproximado
  rondizonni_santiago: { lat: -33.4445, lng: -70.6478, name: 'Rondizonni, Santiago' } // Aproximado
};

/**
 * Test 1: Verificar endpoint de talleres cercanos
 */
export const testNearbyWorkshopsEndpoint = async () => {
  console.log('🧪 TEST 1: Verificando endpoint de talleres cercanos...');
  
  try {
    const { lat, lng, name } = TEST_LOCATIONS.santiago_centro;
    console.log(`📍 Buscando talleres cerca de ${name} (${lat}, ${lng})`);
    
    const talleres = await providerService.getNearbyWorkshops(lat, lng, 10);
    
    console.log(`✅ Endpoint funcionando: ${talleres.length} talleres encontrados`);
    
    if (talleres.length > 0) {
      console.log('🏆 Primeros talleres encontrados:');
      talleres.slice(0, 3).forEach((taller, index) => {
        console.log(`${index + 1}. ${taller.nombre}`);
        console.log(`   Dirección: ${taller.direccion}`);
        console.log(`   Distancia: ${taller.distance ? `${(taller.distance/1000).toFixed(1)}km` : 'No disponible'}`);
        console.log(`   Coordenadas: ${taller.ubicacion ? `${taller.ubicacion.coordinates[1]}, ${taller.ubicacion.coordinates[0]}` : 'No disponible'}`);
        console.log('---');
      });
    } else {
      console.log('⚠️ No se encontraron talleres cercanos');
    }
    
    return talleres;
  } catch (error) {
    console.error('❌ Error en test de endpoint:', error);
    return [];
  }
};

/**
 * Test 2: Verificar geocodificación de direcciones
 */
export const testGeocoding = async () => {
  console.log('🧪 TEST 2: Verificando geocodificación...');
  
  const direcciones = [
    'longavi 2954, santiago',
    'rondizonni 2626, santiago',
    'av. libertador bernardo o\'higgins 1100, santiago'
  ];
  
  for (const direccion of direcciones) {
    try {
      console.log(`🗺️ Geocodificando: ${direccion}`);
      const coords = await locationService.geocodeAddress(direccion);
      
      if (coords && coords.latitude && coords.longitude) {
        console.log(`✅ Éxito: ${coords.latitude}, ${coords.longitude}`);
      } else {
        console.log(`⚠️ Sin resultados para: ${direccion}`);
      }
    } catch (error) {
      console.error(`❌ Error geocodificando ${direccion}:`, error);
    }
  }
};

/**
 * Test 3: Verificar función completa de talleres realmente cercanos
 */
export const testRealNearbyTalleres = async () => {
  console.log('🧪 TEST 3: Verificando función completa...');
  
  const testAddress = {
    direccion: 'longavi 2954, santiago',
    es_principal: true
  };
  
  try {
    console.log(`🎯 Buscando talleres cerca de: ${testAddress.direccion}`);
    
    const talleres = await providerService.getTalleresRealmenteCercanos(testAddress, 15);
    
    console.log(`✅ Función completa: ${talleres.length} talleres encontrados`);
    
    if (talleres.length > 0) {
      console.log('🏆 Resultados:');
      talleres.slice(0, 5).forEach((taller, index) => {
        console.log(`${index + 1}. ${taller.nombre}`);
        console.log(`   Dirección: ${taller.direccion}`);
        console.log(`   Fuente ubicación usuario: ${taller.user_location_source}`);
        console.log(`   Distancia: ${taller.distance ? `${(taller.distance/1000).toFixed(1)}km` : 'No disponible'}`);
        console.log('---');
      });
      
      // Verificar si algún taller está en Rondizonni
      const tallerRondizonni = talleres.find(t => 
        t.direccion?.toLowerCase().includes('rondizonni') || 
        t.nombre?.toLowerCase().includes('rondizonni')
      );
      
      if (tallerRondizonni) {
        console.log('🎉 ¡ENCONTRADO TALLER EN RONDIZONNI!');
        console.log(`   Nombre: ${tallerRondizonni.nombre}`);
        console.log(`   Dirección: ${tallerRondizonni.direccion}`);
        console.log(`   Distancia: ${tallerRondizonni.distance ? `${(tallerRondizonni.distance/1000).toFixed(1)}km` : 'No disponible'}`);
      } else {
        console.log('🔍 No se encontró taller específico en Rondizonni, pero esto es normal si no existe en la BD');
      }
    }
    
    return talleres;
  } catch (error) {
    console.error('❌ Error en test completo:', error);
    return [];
  }
};

/**
 * NUEVO TEST: Verificar cambio de dirección y actualización de talleres
 */
export const testChangeAddress = async () => {
  console.log('🧪 TEST 4: Verificando cambio de dirección...');
  
  // Simular dos direcciones diferentes del usuario
  const direccion1 = {
    direccion: 'Londres 3527, Santiago, Maipú, Región Metropolitana, Chile',
    ubicacion: {
      coordinates: [-70.73545539999999, -33.4740665]
    }
  };
  
  const direccion2 = {
    direccion: 'Longaví 2954, Santiago, Chile',
    ubicacion: {
      coordinates: [-70.6737599, -33.4679097]
    }
  };
  
  try {
    console.log('🏠 Probando con dirección 1:', direccion1.direccion);
    const talleres1 = await providerService.getTalleresRealmenteCercanos(direccion1, 15);
    
    console.log('🏠 Probando con dirección 2:', direccion2.direccion);  
    const talleres2 = await providerService.getTalleresRealmenteCercanos(direccion2, 15);
    
    console.log(`✅ Dirección 1: ${talleres1.length} talleres encontrados`);
    console.log(`✅ Dirección 2: ${talleres2.length} talleres encontrados`);
    
    // Verificar que las distancias son diferentes
    if (talleres1.length > 0 && talleres2.length > 0) {
      const taller1_dir1 = talleres1[0];
      const taller1_dir2 = talleres2.find(t => t.id === taller1_dir1.id);
      
      if (taller1_dir2) {
        console.log(`🔍 Mismo taller, diferentes distancias:`);
        console.log(`   Desde ${direccion1.direccion}: ${taller1_dir1.distance}km`);
        console.log(`   Desde ${direccion2.direccion}: ${taller1_dir2.distance}km`);
        
        if (taller1_dir1.distance !== taller1_dir2.distance) {
          console.log('🎉 ¡ÉXITO! Las distancias cambian según la dirección');
        } else {
          console.log('⚠️ Las distancias no cambiaron - puede ser un problema');
        }
      }
    }
    
    return { talleres1, talleres2 };
  } catch (error) {
    console.error('❌ Error en test de cambio de dirección:', error);
    return { talleres1: [], talleres2: [] };
  }
};

/**
 * Ejecutar todos los tests incluyendo el nuevo
 */
export const runAllTests = async () => {
  console.log('🚀 INICIANDO TESTS COMPLETOS DE TALLERES CERCANOS...\n');
  
  await testNearbyWorkshopsEndpoint();
  console.log('\n');
  
  await testGeocoding();
  console.log('\n');
  
  await testRealNearbyTalleres();
  console.log('\n');
  
  await testChangeAddress();
  console.log('\n');
  
  console.log('✅ TODOS LOS TESTS COMPLETADOS');
};

// Para ejecutar desde la consola del debugger:
// import { runAllTests } from './app/utils/testNearbyTalleres';
// runAllTests(); 