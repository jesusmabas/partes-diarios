import React, { useCallback } from "react";
import { useStorage } from "../hooks/useStorage";
import { formatCurrency } from "../utils/formatters";

const FixedReportForm = ({ workPerformed, onWorkPerformedChange, projectId, reportDate, onInvoicedChange, invoicedAmount }) => {
  const { uploadFile, uploading, error: uploadError } = useStorage();

  const handleDescriptionChange = useCallback((e) => {
    onWorkPerformedChange({ ...workPerformed, description: e.target.value });
  }, [workPerformed, onWorkPerformedChange]);

  const handleAddPhoto = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = await uploadFile(file, "photos", `${projectId}_${reportDate}`);
    if (url) {
      onWorkPerformedChange({ ...workPerformed, photos: [...(workPerformed.photos || []), { id: Date.now(), url }] });
      e.target.value = null;
    }
  }, [workPerformed, onWorkPerformedChange, projectId, reportDate, uploadFile]);

  const handleRemovePhoto = useCallback((id) => {
    onWorkPerformedChange({
      ...workPerformed,
      photos: workPerformed.photos.filter((p) => p.id !== id),
    });
  }, [workPerformed, onWorkPerformedChange]);

  return (
    <div className="fixed-report-form">
      <h3>Trabajos realizados (Presupuesto cerrado)</h3>
      <textarea
        value={workPerformed.description || ""}
        onChange={handleDescriptionChange}
        placeholder="Descripción de los trabajos realizados"
      />
      <input type="file" accept="image/*" onChange={handleAddPhoto} disabled={uploading} />
      {uploading && <p>Subiendo...</p>}
      {uploadError && <p className="error-message">Error: {uploadError}</p>}
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {workPerformed.photos?.map((photo) => (
          <div key={photo.id} className="photo-container">
            <img src={photo.url} alt="Trabajo" style={{ width: "100px", margin: "5px" }} />
            <button onClick={() => handleRemovePhoto(photo.id)}>Eliminar</button>
          </div>
        ))}
      </div>
      <div>
        <label>Facturado (€)</label>
        <input
          type="number"
          value={invoicedAmount || 0}
          onChange={onInvoicedChange}
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