import React, { useState, useCallback } from "react";
import { useStorage } from "../hooks/useStorage";
import { formatCurrency } from "../utils/formatters";

const MaterialsForm = ({ materials, onMaterialsChange, projectId, reportDate }) => {
  const [newMaterial, setNewMaterial] = useState({ description: "", cost: "" });
  const { uploadFile, uploading, error: uploadError } = useStorage();

  const handleInputChange = useCallback((e) => {
    setNewMaterial((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleAddMaterial = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file || !newMaterial.description || !newMaterial.cost) {
      return; // Error manejado por uploadError
    }

    const url = await uploadFile(file, "invoices", `${projectId}_${reportDate}`);
    if (url) {
      const newMat = { id: Date.now(), description: newMaterial.description, cost: parseFloat(newMaterial.cost), invoiceUrl: url };
      onMaterialsChange([...materials, newMat]);
      setNewMaterial({ description: "", cost: "" });
      e.target.value = null;
    }
  }, [newMaterial, materials, onMaterialsChange, projectId, reportDate, uploadFile]);

  const handleRemoveMaterial = useCallback((id) => {
    onMaterialsChange(materials.filter((m) => m.id !== id));
  }, [materials, onMaterialsChange]);

  return (
    <div>
      <h3>Materiales</h3>
      <input
        type="text"
        name="description"
        placeholder="Descripción del material"
        value={newMaterial.description}
        onChange={handleInputChange}
      />
      <input
        type="number"
        name="cost"
        placeholder="Coste (€)"
        value={newMaterial.cost}
        onChange={handleInputChange}
        min="0"
        step="0.01"
      />
      <input type="file" accept=".pdf" onChange={handleAddMaterial} disabled={uploading} />
      {uploading && <p>Subiendo...</p>}
      {uploadError && <p className="error-message">Error: {uploadError}</p>}
      {materials.map((m) => (
        <div key={m.id} className="material-item">
          <p>
            {m.description} - {formatCurrency(m.cost)} (
            <a href={m.invoiceUrl} target="_blank" rel="noopener noreferrer">Ver PDF</a>)
          </p>
          <button onClick={() => handleRemoveMaterial(m.id)}>Eliminar</button>
        </div>
      ))}
    </div>
  );
};

export default React.memo(MaterialsForm);