import { useState, useCallback, useEffect } from 'react';
import { validateForm } from '../utils/validationSchemas';

const useFormValidation = (initialValues, validationSchema, contextData = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const validateFormData = useCallback(() => {
    const result = validateForm(values, validationSchema, contextData) || { errors: {}, isValid: false };
    setErrors(prevErrors => {
      if (JSON.stringify(prevErrors) !== JSON.stringify(result.errors || {})) {
        return result.errors || {};
      }
      return prevErrors;
    });
    setIsValid(prevIsValid => {
      const newIsValid = result.isValid || false;
      return prevIsValid !== newIsValid ? newIsValid : prevIsValid;
    });
  }, [values, validationSchema, contextData]);

  useEffect(() => {
    validateFormData();
  }, [validateFormData]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setValues(prevValues => {
      if (name.includes('.')) {
        const parts = name.split('.');
        return {
          ...prevValues,
          [parts[0]]: {
            ...prevValues[parts[0]],
            [parts[1]]: newValue
          }
        };
      }
      return { ...prevValues, [name]: newValue };
    });

    setTouchedFields(prev => ({ ...prev, [name]: true }));
  }, []);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouchedFields(prev => ({ ...prev, [name]: true }));
  }, []);

  const hasError = useCallback((fieldName) => {
    const fieldParts = fieldName.split('.');
    let errorValue = errors;
    
    for (const part of fieldParts) {
      errorValue = errorValue?.[part];
    }
    
    return Boolean(touchedFields[fieldName.split('.')[0]] && errorValue);
  }, [errors, touchedFields]);

  const getError = useCallback((fieldName) => {
    const fieldParts = fieldName.split('.');
    let errorValue = errors;
    
    for (const part of fieldParts) {
      errorValue = errorValue?.[part];
    }
    
    return hasError(fieldName) ? errorValue : null;
  }, [errors, hasError]);

  const handleSubmit = useCallback((onSubmit) => async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const allFieldsTouched = Object.keys(validationSchema).reduce((acc, key) => {
      acc[key.split('.')[0]] = true;
      return acc;
    }, {});

    setTouchedFields(allFieldsTouched);

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
  }, [values, validationSchema, contextData]);

  const resetForm = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouchedFields({});
    setIsSubmitting(false);
  }, [initialValues]);

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
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
    setValues,
    setValue,
    hasError,
    getError
  };
};

export default useFormValidation;