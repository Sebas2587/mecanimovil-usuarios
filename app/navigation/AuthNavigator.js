import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import { ROUTES } from '../utils/constants';

const Stack = createStackNavigator();

/**
 * Navegador para la autenticación (login y registro)
 */
const AuthNavigator = ({ initialRouteName }) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName || ROUTES.LOGIN}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress,
          },
        }),
      }}
    >
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator; 