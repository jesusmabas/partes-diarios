import React, { useCallback } from "react";
import { formatCurrency } from "../utils/calculationUtils";
import ImageUploader from "./ImageUploader";

const FixedReportForm = ({ 
  workPerformed, 
  onWorkPerformedChange, 
  projectId, 
  reportDate, 
  onInvoicedChange, 
  invoicedAmount 
}) => {
  const handleDescriptionChange = useCallback((e) => {
    onWorkPerformedChange({ ...workPerformed, description: e.target.value });
  }, [workPerformed, onWorkPerformedChange]);

  // Manejador para las imágenes subidas o eliminadas
  const handleImagesChange = useCallback(
    ({ type, images, id }) => {
      if (type === 'add' && images && images.length > 0) {
        // Añadir nuevas imágenes
        onWorkPerformedChange({
          ...workPerformed,
          photos: [...(workPerformed.photos || []), ...images],
        });
      } else if (type === 'remove' && id) {
        // Eliminar una imagen existente
        onWorkPerformedChange({
          ...workPerformed,
          photos: (workPerformed.photos || []).filter((p) => p.id !== id),
        });
      }
    },
    [workPerformed, onWorkPerformedChange]
  );

  // Manejador para el cambio de importe facturado
  const handleInvoicedAmountChange = useCallback((e) => {
    const value = parseFloat(e.target.value) || 0;
    onInvoicedChange(e);
  }, [onInvoicedChange]);

  return (
    <div className="fixed-report-form">
      <h3>Trabajos realizados (Presupuesto cerrado)</h3>
      <textarea
        value={workPerformed.description || ""}
        onChange={handleDescriptionChange}
        placeholder="Descripción de los trabajos realizados"
      />
      
      {/* Reemplazamos el input file por nuestro ImageUploader */}
      <ImageUploader
        onImagesUploaded={handleImagesChange}
        folder="photos"
        prefix={`${projectId}_${reportDate}`}
        maxFiles={10}
        acceptedTypes="image/*"
        existingImages={workPerformed.photos || []}
      />
      
      <div>
        <label>Facturado (€)</label>
        <input
          type="number"
          value={invoicedAmount || 0}
          onChange={handleInvoicedAmountChange}
          min="0"
          step="0.01"
          placeholder="Importe facturado"
        />
        {invoicedAmount > 0 && <p>Importe facturado: {formatCurrency(invoicedAmount)}</p>}
      </div>
    </div>
  );
};

export default React.memo(FixedReportForm);