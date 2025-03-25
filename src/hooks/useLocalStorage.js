// src/hooks/useLocalStorage.js - Hook para persistir datos en localStorage
import { useState, useEffect } from 'react';

/**
 * Hook personalizado para persistir datos en localStorage
 * @param {string} key - Clave para almacenar en localStorage
 * @param {any} initialValue - Valor inicial si no existe la clave
 * @returns {Array} - [storedValue, setValue] similar a useState
 */
export const useLocalStorage = (key, initialValue) => {
  // Estado para almacenar el valor
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Obtener del localStorage por la clave
      const item = window.localStorage.getItem(key);
      // Analizar el JSON almacenado o devolver initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Si hay error al leer localStorage, devolver initialValue
      console.error(`Error al leer '${key}' de localStorage:`, error);
      return initialValue;
    }
  });

  // Función para actualizar localStorage y el estado
  const setValue = (value) => {
    try {
      // Permitir que value sea una función como en useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      
      // Guardar en el estado
      setStoredValue(valueToStore);
      
      // Guardar en localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error al guardar '${key}' en localStorage:`, error);
    }
  };

  // Efecto para actualizar localStorage si la clave cambia
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error al sincronizar '${key}' con localStorage:`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

export default useLocalStorage;