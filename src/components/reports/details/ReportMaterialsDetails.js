// src/components/reports/details/ReportMaterialsDetails.js
import React from "react";
import { formatCurrency } from "../../../utils/calculationUtils";
import { Link } from "@react-pdf/renderer"; // Importar Link si se usa directamente aquí

// Helper interno para renderizar materiales
const renderMaterialsList = (materials = []) => {
  if (!materials || materials.length === 0) {
    return <p>No hay materiales registrados.</p>;
  }

  return (
    <div className="materials-list">
      {materials.map((material, index) => (
        <p key={material.id || index}>
          {material.description} - {formatCurrency(material.cost)} (
          {/* Nota: Link de @react-pdf/renderer no funcionará directamente en HTML.
              Si esto se renderiza en web, necesitarías un <a> normal.
              Asumiendo que esto es para la web por ahora. */}
          <a href={material.invoiceUrl} target="_blank" rel="noopener noreferrer">
            Ver factura
          </a>
          )
        </p>
      ))}
    </div>
  );
};

const ReportMaterialsDetails = ({ materials, materialsCalcs }) => {
  if (!materialsCalcs) return null;

  return (
    <div className="materials-details">
      <h5>Materiales</h5>
      {renderMaterialsList(materials)}
      <p>Total materiales: {formatCurrency(materialsCalcs.totalMaterialsCost)}</p>
    </div>
  );
};

export default React.memo(ReportMaterialsDetails);