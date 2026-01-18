/**
 * Funciones de validación para formularios
 */

/**
 * Validar si un email es válido
 * @param {string} email - Email a validar
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validar si una contraseña cumple con los requisitos mínimos
 * @param {string} password - Contraseña a validar
 */
export const isValidPassword = (password) => {
  // Mínimo 8 caracteres, al menos una letra y un número
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Validar si un nombre de usuario es válido
 * @param {string} username - Nombre de usuario a validar
 */
export const isValidUsername = (username) => {
  // Letras, números y guiones bajos, entre 3 y 30 caracteres
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

/**
 * Validar si un teléfono es válido (formato internacional)
 * @param {string} phone - Teléfono a validar
 */
export const isValidPhone = (phone) => {
  // Formato internacional simplificado
  const phoneRegex = /^\+?[0-9]{8,15}$/;
  return phoneRegex.test(phone);
};

/**
 * Validar los datos del formulario de login
 * @param {object} data - Datos del formulario
 * @returns {object} - Errores encontrados
 */
export const validateLoginForm = (data) => {
  const errors = {};

  if (!data.username) {
    errors.username = 'El nombre de usuario es obligatorio';
  }
  
  if (!data.password) {
    errors.password = 'La contraseña es obligatoria';
  }

  return errors;
};

/**
 * Validar los datos del formulario de registro
 * @param {object} data - Datos del formulario
 * @returns {object} - Errores encontrados
 */
export const validateRegisterForm = (data) => {
  const errors = {};

  if (!data.username) {
    errors.username = 'El nombre de usuario es obligatorio';
  } else if (!isValidUsername(data.username)) {
    errors.username = 'El nombre de usuario solo puede contener letras, números y guiones bajos';
  }

  if (!data.email) {
    errors.email = 'El correo electrónico es obligatorio';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'El correo electrónico no es válido';
  }

  if (!data.password) {
    errors.password = 'La contraseña es obligatoria';
  } else if (!isValidPassword(data.password)) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres, una letra y un número';
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = 'Debes confirmar la contraseña';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden';
  }

  if (data.telefono && !isValidPhone(data.telefono)) {
    errors.telefono = 'El número de teléfono no es válido';
  }

  return errors;
};

/**
 * Validar los datos del formulario de perfil
 * @param {object} data - Datos del formulario
 * @returns {object} - Errores encontrados
 */
export const validateProfileForm = (data) => {
  const errors = {};

  if (!data.firstName) {
    errors.firstName = 'El nombre es obligatorio';
  }

  if (!data.lastName) {
    errors.lastName = 'Los apellidos son obligatorios';
  }

  if (!data.telefono) {
    errors.telefono = 'El teléfono es obligatorio';
  } else if (!isValidPhone(data.telefono)) {
    errors.telefono = 'El número de teléfono no es válido';
  }

  if (!data.direccion) {
    errors.direccion = 'La dirección es obligatoria';
  }

  return errors;
}; 