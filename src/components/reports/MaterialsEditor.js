import React, { useState } from "react";
import { formatCurrency } from "../../utils/formatters";

const MaterialsEditor = ({ 
  materials, 
  onMaterialsChange, 
  projectId, 
  reportDate,
  uploadFile 
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleAddMaterial = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const description = prompt("Descripción del material:") || "";
    const costText = prompt("Coste del material (€):") || "0";
    const cost = parseFloat(costText) || 0;

    if (!description || isNaN(cost) || cost < 0) {
      alert("Por favor, completa la descripción y un coste válido (numérico y positivo).");
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      
      const url = await uploadFile(file, "invoices", `${projectId}_${reportDate}`);
      
      if (url) {
        const newMaterial = { id: Date.now(), description, cost, invoiceUrl: url };
        onMaterialsChange([...materials, newMaterial]);
      }
    } catch (err) {
      setUploadError(`Error al subir material: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMaterial = (id) => {
    onMaterialsChange(materials.filter(m => m.id !== id));
  };

  return (
    <div className="materials-editor">
      <h4>Materiales</h4>
      
      {uploadError && <p className="error-message">{uploadError}</p>}
      
      <div className="materials-list">
        {materials.map(material => (
          <div key={material.id} className="material-item">
            <div className="material-info">
              <input
                type="text"
                value={material.description || ""}
                onChange={(e) => {
                  const updatedMaterials = materials.map(m => 
                    m.id === material.id 
                      ? { ...m, description: e.target.value } 
                      : m
                  );
                  onMaterialsChange(updatedMaterials);
                }}
                placeholder="Descripción"
              />
              
              <input
                type="number"
                value={material.cost || 0}
                onChange={(e) => {
                  const updatedMaterials = materials.map(m => 
                    m.id === material.id 
                      ? { ...m, cost: parseFloat(e.target.value) || 0 } 
                      : m
                  );
                  onMaterialsChange(updatedMaterials);
                }}
                min="0"
                step="0.01"
                placeholder="Coste (€)"
              />
            </div>
            
            <div className="material-actions">
              <a 
                href={material.invoiceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="invoice-link"
              >
                Ver factura
              </a>
              
              <button 
                type="button" 
                onClick={() => handleRemoveMaterial(material.id)}
                className="remove-button"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="upload-container">
        <input 
          type="file" 
          accept=".pdf" 
          onChange={handleAddMaterial} 
          disabled={uploading} 
          id="material-upload"
          className="file-input"
        />
        <label htmlFor="material-upload" className="upload-label">
          {uploading ? "Subiendo..." : "Añadir material con factura"}
        </label>
      </div>
    </div>
  );
};

export default React.memo(MaterialsEditor);