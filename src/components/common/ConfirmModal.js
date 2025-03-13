import React from "react";
import PropTypes from "prop-types";

/**
 * Componente modal genérico para confirmaciones
 * @param {Object} props - Propiedades del componente
 * @param {string} props.title - Título del modal
 * @param {string} props.message - Mensaje de confirmación
 * @param {string} props.confirmText - Texto del botón de confirmación
 * @param {string} props.cancelText - Texto del botón de cancelación
 * @param {Function} props.onConfirm - Función a ejecutar al confirmar
 * @param {Function} props.onCancel - Función a ejecutar al cancelar
 * @param {string} props.confirmButtonClass - Clase CSS para el botón de confirmación
 * @param {boolean} props.isDangerous - Si es una acción peligrosa (cambia el estilo)
 */
const ConfirmModal = ({ 
  title = "Confirmar acción",
  message = "¿Estás seguro de que quieres realizar esta acción?", 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  confirmButtonClass = "",
  isDangerous = false
}) => {
  const handleConfirm = () => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (typeof onCancel === 'function') {
      onCancel();
    }
  };

  // Prevenir que clics en el modal se propaguen al overlay
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal" onClick={handleModalClick}>
        <h3>{title}</h3>
        <p>{message}</p>
        
        {isDangerous && (
          <p className="warning">Esta acción no se puede deshacer.</p>
        )}
        
        <div className="modal-actions">
          <button 
            onClick={handleConfirm} 
            className={`confirm-button ${isDangerous ? 'dangerous' : ''} ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
          <button 
            onClick={handleCancel} 
            className="cancel-button"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

ConfirmModal.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  confirmButtonClass: PropTypes.string,
  isDangerous: PropTypes.bool
};

export default React.memo(ConfirmModal);