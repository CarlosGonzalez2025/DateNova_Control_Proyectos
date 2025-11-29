/**
 * Sistema de Notificaciones Toast
 * DateNova - Control de Proyectos
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface ToastNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Store global de notificaciones
let toastListeners: ((notification: ToastNotification) => void)[] = [];

/**
 * Genera un ID único para notificación
 */
const generateId = (): string => {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Suscribirse a notificaciones
 */
export const subscribeToToasts = (
  callback: (notification: ToastNotification) => void
): (() => void) => {
  toastListeners.push(callback);
  return () => {
    toastListeners = toastListeners.filter(listener => listener !== callback);
  };
};

/**
 * Emitir notificación a todos los listeners
 */
const emitToast = (notification: ToastNotification): void => {
  toastListeners.forEach(listener => listener(notification));
};

/**
 * Mostrar notificación de éxito
 */
export const showSuccess = (
  title: string,
  message?: string,
  duration: number = 4000
): void => {
  emitToast({
    id: generateId(),
    type: 'success',
    title,
    message,
    duration
  });
};

/**
 * Mostrar notificación de error
 */
export const showError = (
  title: string,
  message?: string,
  duration: number = 6000
): void => {
  emitToast({
    id: generateId(),
    type: 'error',
    title,
    message,
    duration
  });
};

/**
 * Mostrar notificación de advertencia
 */
export const showWarning = (
  title: string,
  message?: string,
  duration: number = 5000
): void => {
  emitToast({
    id: generateId(),
    type: 'warning',
    title,
    message,
    duration
  });
};

/**
 * Mostrar notificación informativa
 */
export const showInfo = (
  title: string,
  message?: string,
  duration: number = 4000
): void => {
  emitToast({
    id: generateId(),
    type: 'info',
    title,
    message,
    duration
  });
};

/**
 * Manejo de errores de Supabase con mensajes amigables
 */
export const handleSupabaseError = (error: any): void => {
  console.error('Supabase error:', error);

  // Mapeo de códigos de error comunes a mensajes amigables
  const errorMessages: Record<string, string> = {
    'PGRST116': 'No se encontraron resultados',
    '23505': 'Este registro ya existe',
    '23503': 'No se puede eliminar porque está relacionado con otros registros',
    '42501': 'No tienes permisos para realizar esta acción',
    '42P01': 'Error de configuración de base de datos',
    'auth/invalid-email': 'Email inválido',
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/email-already-in-use': 'Este email ya está registrado',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde'
  };

  let errorMessage = 'Ocurrió un error inesperado';

  if (error.code && errorMessages[error.code]) {
    errorMessage = errorMessages[error.code];
  } else if (error.message) {
    errorMessage = error.message;
  }

  showError('Error', errorMessage);
};

/**
 * Wrapper para operaciones async con manejo de errores
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  successMessage?: string,
  errorTitle: string = 'Error'
): Promise<T | null> => {
  try {
    const result = await operation();
    if (successMessage) {
      showSuccess(successMessage);
    }
    return result;
  } catch (error) {
    console.error(`${errorTitle}:`, error);
    handleSupabaseError(error);
    return null;
  }
};

/**
 * Validar y mostrar errores de validación de formularios
 */
export const showValidationErrors = (errors: { field: string; message: string }[]): void => {
  if (errors.length === 0) return;

  const firstError = errors[0];
  showError(
    'Error de validación',
    errors.length === 1
      ? firstError.message
      : `${firstError.message} (y ${errors.length - 1} error${errors.length > 2 ? 'es' : ''} más)`
  );
};

/**
 * Logger centralizado con niveles
 */
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data || '');
  },

  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '');
  },

  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '');
  },

  debug: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  }
};
