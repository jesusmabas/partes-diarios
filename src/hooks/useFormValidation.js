// src/hooks/useFormValidation.js

import { useState, useCallback, useEffect } from 'react';
import { validateForm } from '../utils/validationSchemas';

const useFormValidation = (initialValues, validationSchema, contextData = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Validar el formulario completo
  const validateFormData = useCallback(() => {
    const result = validateForm(values, validationSchema, contextData);
    setErrors(result.errors);
    setIsValid(result.isValid);
    return result;
  }, [values, validationSchema, contextData]);

  // Efecto para validar cuando cambian los valores
  useEffect(() => {
    validateFormData();
  }, [validateFormData]);

  // Manejar cambios en campos
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    // Manejar diferentes tipos de input
    const inputValue = type === 'checkbox' ? checked : value;
    
    setValues(prevValues => {
      // Manejar campos anidados (e.g., 'labor.officialEntry')
      if (name.includes('.')) {
        const parts = name.split('.');
        const newValues = { ...prevValues };
        let current = newValues;
        
        // Navegar hasta el penúltimo nivel
        for (let i = 0; i < parts.length - 1; i++) {
          // Crear objeto si no existe
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }
        
        // Asignar valor al último nivel
        current[parts[parts.length - 1]] = inputValue;
        return newValues;
      }
      
      // Caso simple: campo no anidado
      return { ...prevValues, [name]: inputValue };
    });
    
    // Marcar el campo como tocado
    setTouchedFields(prev => ({ ...prev, [name]: true }));
  }, []);

  // Manejar eventos blur para validación
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouchedFields(prev => ({ ...prev, [name]: true }));
  }, []);

  // Verificar si un campo tiene error y ha sido tocado
  const hasError = useCallback((fieldName) => {
    return touchedFields[fieldName] && errors[fieldName];
  }, [touchedFields, errors]);

  // Obtener el mensaje de error para un campo
  const getError = useCallback((fieldName) => {
    return hasError(fieldName) ? errors[fieldName] : null;
  }, [hasError, errors]);

  // Manejar envío del formulario
  const handleSubmit = useCallback((onSubmit) => async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Marcar todos los campos como tocados para mostrar todos los errores
    const allFields = Object.keys(validationSchema).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouchedFields(allFields);
    
    // Validar antes de enviar
    const validationResult = validateFormData();
    
    if (validationResult.isValid) {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Error en envío del formulario:', error);
      }
    }
    
    setIsSubmitting(false);
  }, [values, validateFormData, validationSchema]);

  // Resetear el formulario
  const resetForm = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouchedFields({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Actualizar un valor específico programáticamente
  const setValue = useCallback((name, value) => {
    setValues(prevValues => {
      // Manejar campos anidados
      if (name.includes('.')) {
        const parts = name.split('.');
        const newValues = { ...prevValues };
        let current = newValues;
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }
        
        current[parts[parts.length - 1]] = value;
        return newValues;
      }
      
      return { ...prevValues, [name]: value };
    });
  }, []);

  return {
    values,
    errors,
    touchedFields,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValue,
    hasError,
    getError,
  };
};

export default useFormValidation;