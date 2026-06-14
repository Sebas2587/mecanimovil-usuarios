import React from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../utils/constants';

/**
 * Enlaces a Términos y Política de privacidad (login, registro, etc.).
 * @param {'footer'|'register'} [variant='footer']
 */
const LegalFooterLinks = ({ textStyle, linkStyle, variant = 'footer' }) => {
  const navigation = useNavigation();

  const goTerms = () => navigation.navigate(ROUTES.TERMS);
  const goPrivacy = () => navigation.navigate(ROUTES.PRIVACY_POLICY);

  if (variant === 'register') {
    return (
      <Text style={textStyle}>
        Acepto los{' '}
        <Text style={linkStyle} onPress={goTerms}>
          términos y condiciones
        </Text>{' '}
        y la{' '}
        <Text style={linkStyle} onPress={goPrivacy}>
          política de privacidad
        </Text>
        .
      </Text>
    );
  }

  return (
    <Text style={textStyle}>
      Al continuar, aceptas los{' '}
      <Text style={linkStyle} onPress={goTerms}>
        Términos de uso
      </Text>{' '}
      de MecaniMóvil. Consulta nuestra{' '}
      <Text style={linkStyle} onPress={goPrivacy}>
        Política de privacidad
      </Text>
      .
    </Text>
  );
};

export default LegalFooterLinks;
