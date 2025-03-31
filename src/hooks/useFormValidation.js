// src/hooks/useFormValidation.js

import { useState, useCallback, useEffect } from 'react';
import { validateForm } from '../utils/validationSchemas';

const useFormValidation = (initialValues, validationSchema, contextData = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // La definición de validateFormData con useCallback sigue siendo útil
  // si necesitas llamar a esta función desde otros lugares (ej. manualmente).
  const validateFormData = useCallback(() => {
    // console.log("Running validateFormData with values:", values); // Log para depurar
    const result = validateForm(values, validationSchema, contextData) || { errors: {}, isValid: false };
    // Solo actualiza el estado si los errores o la validez realmente cambian
    // Esto puede ayudar a prevenir re-renderizados innecesarios, aunque el problema principal suele ser el trigger del useEffect
    setErrors(prevErrors => {
        // Comparación superficial, podría necesitarse una comparación profunda si los errores son complejos
        if (JSON.stringify(prevErrors) !== JSON.stringify(result.errors || {})) {
            return result.errors || {};
        }
        return prevErrors;
    });
    setIsValid(prevIsValid => {
        if (prevIsValid !== (result.isValid || false)) {
            return result.isValid || false;
        }
        return prevIsValid;
    });
    return result;
  }, [values, validationSchema, contextData]);

  // *** CAMBIO PRINCIPAL AQUÍ ***
  // Hacer que el efecto dependa directamente de los datos y las reglas,
  // no de la función `validateFormData` memoizada.
  useEffect(() => {
    // console.log("Running validation useEffect due to change in values/schema/context"); // Log para depurar
    validateFormData();
  }, [values, validationSchema, contextData]); // <--- Dependencias directas

  // --- El resto de los hooks useCallback (handleChange, handleBlur, etc.) sin cambios ---
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;

    setValues(prevValues => {
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
        current[parts[parts.length - 1]] = inputValue;
        return newValues;
      }
      return { ...prevValues, [name]: inputValue };
    });
    setTouchedFields(prev => ({ ...prev, [name]: true }));
  }, []);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouchedFields(prev => ({ ...prev, [name]: true }));
  }, []);

  const hasError = useCallback((fieldName) => {
    // Considerar campos anidados si es necesario
    const fieldParts = fieldName.split('.');
    let errorValue = errors;
    for (const part of fieldParts) {
        errorValue = errorValue?.[part];
        if (errorValue === undefined) break;
    }
    return Boolean(touchedFields[fieldName.split('.')[0]] && errorValue); // Comprobar touched en el campo base
  }, [touchedFields, errors]);


  const getError = useCallback((fieldName) => {
    // Considerar campos anidados
     const fieldParts = fieldName.split('.');
     let errorValue = errors;
     for (const part of fieldParts) {
         errorValue = errorValue?.[part];
         if (errorValue === undefined) break;
     }
    return hasError(fieldName) ? errorValue : null;
  }, [hasError, errors]); // Dependencia correcta

  const handleSubmit = useCallback((onSubmit) => async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const allFieldsTouched = Object.keys(validationSchema).reduce((acc, key) => {
        acc[key.split('.')[0]] = true;
        return acc;
    }, {});
    setTouchedFields(allFieldsTouched);

    // Re-validar explícitamente justo antes de enviar
    const validationResult = validateForm(values, validationSchema, contextData);
     setErrors(validationResult.errors || {});
     setIsValid(validationResult.isValid || false);


    if (validationResult.isValid) {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Error on form submission:', error);
      }
    }

    setIsSubmitting(false);
  }, [values, validationSchema, contextData]); // Asegúrate que las deps están bien aquí también


  const resetForm = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouchedFields({});
    setIsSubmitting(false);
  }, [initialValues]);


  const setValue = useCallback((name, value) => {
    setValues(prevValues => {
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