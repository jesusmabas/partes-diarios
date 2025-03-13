import React from "react";

const ReportDeleteModal = ({ onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Confirmar eliminación</h3>
        <p>¿Estás seguro de que quieres eliminar este parte diario?</p>
        <p className="warning">Esta acción no se puede deshacer.</p>
        
        <div className="modal-actions">
          <button 
            onClick={onConfirm} 
            className="confirm-button"
          >
            Sí, eliminar
          </button>
          <button 
            onClick={onCancel} 
            className="cancel-button"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ReportDeleteModal);