// src/utils/validationSchemas.js - Actualizado para incluir validación de campos de trabajo extra

// Funciones de validación básicas
const isRequired = (value) => !!value || value === 0;
const isNumber = (value) => !isNaN(parseFloat(value)) && isFinite(value);
const isPositiveNumber = (value) => isNumber(value) && parseFloat(value) >= 0;
const isValidTime = (value) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
const isValidDate = (value) => !isNaN(Date.parse(value));
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isBoolean = (value) => typeof value === 'boolean';

// Esquema para proyectos (actualizado)
export const projectSchema = {
  id: {
    validator: (value) => isRequired(value) && /^[a-zA-Z0-9 .-]+$/.test(value), 
    message: "El ID es obligatorio y solo puede contener letras, números, espacios, puntos y guiones.", 
  },
  client: {
    validator: isRequired,
    message: "El cliente es obligatorio.",
  },
  address: {
    validator: isRequired,
    message: "La dirección es obligatoria.",
  },
  nifNie: {
    validator: (value) => isRequired(value) && /^[0-9XYZ][0-9]{7}[A-Z]$/.test(value),
    message: "El NIF/NIE debe tener un formato válido.",
  },
  type: {
    validator: (value) => ["hourly", "fixed"].includes(value),
    message: "El tipo debe ser 'hourly' o 'fixed'.",
  },
  officialPrice: {
    validator: (value, formData) => 
      (formData.type !== "hourly" && !formData.allowExtraWork) || isPositiveNumber(value),
    message: "El precio por hora del oficial debe ser un número positivo.",
  },
  workerPrice: {
    validator: (value, formData) => 
      (formData.type !== "hourly" && !formData.allowExtraWork) || isPositiveNumber(value),
    message: "El precio por hora del peón debe ser un número positivo.",
  },
  budgetAmount: {
    validator: (value, formData) => 
      formData.type !== "fixed" || isPositiveNumber(value),
    message: "El importe del presupuesto debe ser un número positivo.",
  },
  allowExtraWork: {
    validator: (value, formData) => 
      formData.type !== "fixed" || typeof value === 'boolean',
    message: "El campo debe ser verdadero o falso.",
  },
};

// Esquema para partes diarios (actualizado para trabajo extra)
export const dailyReportSchema = {
  reportDate: {
    validator: isValidDate,
    message: "La fecha debe ser válida.",
  },
  projectId: {
    validator: isRequired,
    message: "El ID del proyecto es obligatorio.",
  },
  // Campos para trabajo extra
  isExtraWork: {
    validator: (value, formData) => 
      formData.projectType !== "fixed" || typeof value === 'boolean',
    message: "El campo debe ser verdadero o falso.",
  },
  extraWorkType: {
    validator: (value, formData) => 
      !formData.isExtraWork || ["additional_budget", "hourly"].includes(value),
    message: "El tipo de trabajo extra debe ser 'additional_budget' o 'hourly'.",
  },
  extraBudgetAmount: {
    validator: (value, formData) => 
      !formData.isExtraWork || formData.extraWorkType !== "additional_budget" || isPositiveNumber(value),
    message: "El importe adicional debe ser un número positivo.",
  },
  // Para proyectos por horas o extras facturados por horas
  "labor.officialEntry": {
    validator: (value, formData) => 
      (formData.projectType !== "hourly" && !(formData.isExtraWork && formData.extraWorkType === "hourly")) || 
      !value || isValidTime(value),
    message: "La hora de entrada del oficial debe tener un formato válido (HH:MM).",
  },
  "labor.officialExit": {
    validator: (value, formData) => 
      (formData.projectType !== "hourly" && !(formData.isExtraWork && formData.extraWorkType === "hourly")) || 
      !value || isValidTime(value),
    message: "La hora de salida del oficial debe tener un formato válido (HH:MM).",
  },
  "labor.workerEntry": {
    validator: (value, formData) => 
      (formData.projectType !== "hourly" && !(formData.isExtraWork && formData.extraWorkType === "hourly")) || 
      !value || isValidTime(value),
    message: "La hora de entrada del peón debe tener un formato válido (HH:MM).",
  },
  "labor.workerExit": {
    validator: (value, formData) => 
      (formData.projectType !== "hourly" && !(formData.isExtraWork && formData.extraWorkType === "hourly")) || 
      !value || isValidTime(value),
    message: "La hora de salida del peón debe tener un formato válido (HH:MM).",
  },
  // Para todos los tipos
  "workPerformed.description": {
    validator: isRequired,
    message: "La descripción de los trabajos realizados es obligatoria.",
  },
  // Para proyectos de presupuesto cerrado (dentro del presupuesto)
  "workPerformed.invoicedAmount": {
    validator: (value, formData) => 
      (formData.projectType !== "fixed" || formData.isExtraWork) || isPositiveNumber(value),
    message: "El importe facturado debe ser un número positivo.",
  },
};

// Esquema para materiales
export const materialSchema = {
  description: {
    validator: isRequired,
    message: "La descripción del material es obligatoria.",
  },
  cost: {
    validator: isPositiveNumber,
    message: "El coste debe ser un número positivo.",
  },
};

// Utilidad para validar formularios
export const validateForm = (data, schema, context = {}) => {
  const errors = {};
  
  Object.entries(schema).forEach(([field, { validator, message }]) => {
    // Manejar campos anidados (e.g., 'labor.officialEntry')
    const fieldParts = field.split('.');
    let value = data;
    
    for (const part of fieldParts) {
      value = value && typeof value === 'object' ? value[part] : undefined;
    }
    
    // Validar el campo
    if (!validator(value, { ...data, ...context })) {
      errors[field] = message;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};