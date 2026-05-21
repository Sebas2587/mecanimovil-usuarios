import { Alert } from 'react-native';
import solicitudesService from '../services/solicitudesService';
import { ROUTES } from './constants';

/**
 * Comprueba duplicado vehículo+servicio y muestra alerta si está bloqueado.
 * @returns {Promise<boolean>} true si puede continuar
 */
export async function validarSinServicioActivoDuplicado(
  navigation,
  { vehiculoId, servicioIds },
) {
  const result = await solicitudesService.verificarServicioActivo(
    vehiculoId,
    servicioIds,
  );
  if (!result?.bloqueado) {
    return true;
  }

  const mensaje =
    result.mensaje
    || 'Ya tienes una solicitud activa con este servicio para este vehículo.';

  const buttons = [{ text: 'Entendido', style: 'cancel' }];
  if (navigation?.navigate) {
    buttons.unshift({
      text: 'Ver solicitudes',
      onPress: () => {
        navigation.navigate(ROUTES.MIS_SOLICITUDES || 'MisSolicitudes', {
          filtro: 'activas',
        });
      },
    });
  }

  Alert.alert('Servicio en curso', mensaje, buttons);
  return false;
}
