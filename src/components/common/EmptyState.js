// src/components/common/EmptyState.js
import React from "react";

/**
 * Componente que muestra un estado vacío con un mensaje y un icono
 * @param {Object} props - Propiedades del componente
 * @param {string} props.title - Título opcional para el estado vacío
 * @param {string} props.message - Mensaje que describe el estado vacío
 * @param {string} props.icon - Emoji o icono para mostrar
 * @param {Function} props.action - Función opcional para realizar una acción
 * @param {string} props.actionLabel - Etiqueta para el botón de acción
 */
const EmptyState = ({ 
  title = "No hay datos disponibles", 
  message, 
  icon = "📊", 
  action, 
  actionLabel = "Actualizar"
}) => {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      
      {action && (
        <button 
          onClick={action} 
          className="empty-state-action"
          type="button"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;