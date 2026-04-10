// El punto de entrada de la aplicación React Native

import { registerRootComponent } from 'expo';
// Inicializar canales Android lo antes posible (antes del árbol React / login)
import './app/services/notificationService';
import App from './App';

// Registrar el componente raíz de la aplicación
registerRootComponent(App);
