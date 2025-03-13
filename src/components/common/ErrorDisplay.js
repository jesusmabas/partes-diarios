// src/components/common/ErrorDisplay.js
import React from "react";

/**
 * Componente para mostrar errores con opción de reintentar
 * @param {Object} props - Propiedades del componente
 * @param {string|Object} props.error - Error capturado
 * @param {string} props.message - Mensaje descriptivo del error
 * @param {Function} props.onRetry - Función a ejecutar al reintentar
 */
const ErrorDisplay = ({ error, message, onRetry }) => {
  // Extraer mensaje de error de diferentes tipos de errores
  const errorMessage = typeof error === 'string' 
    ? error 
    : error?.message || 'Se ha producido un error desconocido';
  
  return (
    <div className="error-display" role="alert" aria-live="assertive">
      <div className="error-icon">❌</div>
      <h3 className="error-title">{message}</h3>
      <p className="error-details">{errorMessage}</p>
      
      {onRetry && (
        <button 
          onClick={onRetry} 
          className="error-retry-button"
          type="button"
        >
          Reintentar
        </button>
      )}
      
      <p className="error-help">
        Si el problema persiste, contacta con soporte técnico.
      </p>
    </div>
  );
};

export default ErrorDisplay;