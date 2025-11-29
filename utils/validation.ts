/**
 * Sistema de Validación Reutilizable para Formularios
 * DateNova - Control de Proyectos
 */

export interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validate?: (value: any) => boolean;
}

export interface FieldValidation {
  field: string;
  rules: ValidationRule[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Valida un valor individual contra un conjunto de reglas
 */
export const validateField = (value: any, rules: ValidationRule[]): string | null => {
  for (const rule of rules) {
    switch (rule.type) {
      case 'required':
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return rule.message;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
          return rule.message;
        }
        break;

      case 'minLength':
        if (value && value.length < rule.value) {
          return rule.message;
        }
        break;

      case 'maxLength':
        if (value && value.length > rule.value) {
          return rule.message;
        }
        break;

      case 'min':
        if (value !== null && value !== undefined && Number(value) < rule.value) {
          return rule.message;
        }
        break;

      case 'max':
        if (value !== null && value !== undefined && Number(value) > rule.value) {
          return rule.message;
        }
        break;

      case 'pattern':
        if (value && !new RegExp(rule.value).test(value)) {
          return rule.message;
        }
        break;

      case 'custom':
        if (rule.validate && !rule.validate(value)) {
          return rule.message;
        }
        break;
    }
  }
  return null;
};

/**
 * Valida un objeto completo de datos contra un schema de validación
 */
export const validateForm = (
  data: Record<string, any>,
  validations: FieldValidation[]
): ValidationResult => {
  const errors: ValidationError[] = [];

  for (const fieldValidation of validations) {
    const { field, rules } = fieldValidation;
    const value = data[field];
    const error = validateField(value, rules);

    if (error) {
      errors.push({ field, message: error });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Reglas de validación predefinidas comunes
 */
export const commonValidations = {
  required: (fieldName: string): ValidationRule => ({
    type: 'required',
    message: `${fieldName} es obligatorio`
  }),

  email: (): ValidationRule => ({
    type: 'email',
    message: 'Ingresa un email válido'
  }),

  minLength: (length: number): ValidationRule => ({
    type: 'minLength',
    value: length,
    message: `Debe tener al menos ${length} caracteres`
  }),

  maxLength: (length: number): ValidationRule => ({
    type: 'maxLength',
    value: length,
    message: `No puede exceder ${length} caracteres`
  }),

  min: (value: number, fieldName: string = 'El valor'): ValidationRule => ({
    type: 'min',
    value,
    message: `${fieldName} debe ser al menos ${value}`
  }),

  max: (value: number, fieldName: string = 'El valor'): ValidationRule => ({
    type: 'max',
    value,
    message: `${fieldName} no puede ser mayor a ${value}`
  }),

  positiveNumber: (fieldName: string = 'El valor'): ValidationRule => ({
    type: 'custom',
    message: `${fieldName} debe ser un número positivo`,
    validate: (value) => !isNaN(value) && Number(value) > 0
  }),

  dateNotPast: (): ValidationRule => ({
    type: 'custom',
    message: 'La fecha no puede ser en el pasado',
    validate: (value) => !value || new Date(value) >= new Date()
  }),

  dateRange: (startDate: string): ValidationRule => ({
    type: 'custom',
    message: 'La fecha final debe ser posterior a la fecha inicial',
    validate: (endDate) => {
      if (!endDate || !startDate) return true;
      return new Date(endDate) >= new Date(startDate);
    }
  })
};

/**
 * Schemas de validación predefinidos para entidades comunes
 */
export const validationSchemas = {
  // Validación para crear/editar Proyecto
  proyecto: (): FieldValidation[] => [
    {
      field: 'nombre',
      rules: [
        commonValidations.required('Nombre del proyecto'),
        commonValidations.minLength(3),
        commonValidations.maxLength(255)
      ]
    },
    {
      field: 'descripcion',
      rules: [commonValidations.maxLength(1000)]
    },
    {
      field: 'fecha_inicio',
      rules: []
    },
    {
      field: 'fecha_fin',
      rules: []
    }
  ],

  // Validación para crear/editar Tarea
  tarea: (): FieldValidation[] => [
    {
      field: 'nombre',
      rules: [
        commonValidations.required('Nombre de la tarea'),
        commonValidations.minLength(3),
        commonValidations.maxLength(255)
      ]
    },
    {
      field: 'proyecto_id',
      rules: [commonValidations.required('Proyecto')]
    },
    {
      field: 'horas_estimadas',
      rules: [
        commonValidations.required('Horas estimadas'),
        commonValidations.positiveNumber('Horas estimadas')
      ]
    },
    {
      field: 'descripcion',
      rules: [commonValidations.maxLength(2000)]
    }
  ],

  // Validación para registro de horas
  registroHoras: (): FieldValidation[] => [
    {
      field: 'tarea_id',
      rules: [commonValidations.required('Tarea')]
    },
    {
      field: 'horas',
      rules: [
        commonValidations.required('Horas trabajadas'),
        commonValidations.positiveNumber('Horas trabajadas'),
        commonValidations.max(24, 'Horas trabajadas')
      ]
    },
    {
      field: 'fecha',
      rules: [commonValidations.required('Fecha')]
    },
    {
      field: 'descripcion',
      rules: [
        commonValidations.required('Descripción del trabajo'),
        commonValidations.minLength(10),
        commonValidations.maxLength(500)
      ]
    }
  ],

  // Validación para Empresa
  empresa: (): FieldValidation[] => [
    {
      field: 'nombre',
      rules: [
        commonValidations.required('Nombre de la empresa'),
        commonValidations.minLength(2),
        commonValidations.maxLength(255)
      ]
    },
    {
      field: 'email',
      rules: [commonValidations.email()]
    },
    {
      field: 'telefono',
      rules: [commonValidations.maxLength(20)]
    },
    {
      field: 'direccion',
      rules: [commonValidations.maxLength(500)]
    }
  ],

  // Validación para Usuario
  usuario: (): FieldValidation[] => [
    {
      field: 'nombre',
      rules: [
        commonValidations.required('Nombre'),
        commonValidations.minLength(3),
        commonValidations.maxLength(100)
      ]
    },
    {
      field: 'rol',
      rules: [commonValidations.required('Rol')]
    },
    {
      field: 'tarifa_hora',
      rules: [commonValidations.min(0, 'Tarifa por hora')]
    },
    {
      field: 'billable_rate',
      rules: [commonValidations.min(0, 'Tarifa facturable')]
    }
  ],

  // Validación para Invitación
  invitacion: (): FieldValidation[] => [
    {
      field: 'email',
      rules: [
        commonValidations.required('Email'),
        commonValidations.email()
      ]
    },
    {
      field: 'rol',
      rules: [commonValidations.required('Rol')]
    }
  ],

  // Validación para Entregable
  entregable: (): FieldValidation[] => [
    {
      field: 'nombre',
      rules: [
        commonValidations.required('Nombre del entregable'),
        commonValidations.minLength(3),
        commonValidations.maxLength(255)
      ]
    },
    {
      field: 'tipo_entregable',
      rules: [commonValidations.required('Tipo de entregable')]
    },
    {
      field: 'descripcion',
      rules: [commonValidations.maxLength(1000)]
    }
  ],

  // Validación para Comentario
  comentario: (): FieldValidation[] => [
    {
      field: 'mensaje',
      rules: [
        commonValidations.required('Mensaje'),
        commonValidations.minLength(1),
        commonValidations.maxLength(2000)
      ]
    }
  ]
};

/**
 * Hook personalizado para validación en tiempo real
 */
export const useFormValidation = () => {
  const validateFormData = (
    data: Record<string, any>,
    schema: FieldValidation[]
  ): ValidationResult => {
    return validateForm(data, schema);
  };

  const getFieldError = (
    field: string,
    errors: ValidationError[]
  ): string | undefined => {
    return errors.find(e => e.field === field)?.message;
  };

  const hasFieldError = (
    field: string,
    errors: ValidationError[]
  ): boolean => {
    return errors.some(e => e.field === field);
  };

  return {
    validateFormData,
    getFieldError,
    hasFieldError
  };
};
