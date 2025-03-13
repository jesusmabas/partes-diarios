import React from "react";
import { formatCurrency, formatNumber } from "../../utils/formatters";

const ReportItem = ({ report, project, onEdit, onDelete }) => {
  const isHourlyProject = project.type === "hourly";
  const reportDate = new Date(report.reportDate).toLocaleDateString();

  return (
    <div className="report-card">
      <h4>Parte del {reportDate}</h4>
      
      <div className="report-details">
        <p><strong>Semana:</strong> {report.weekNumber}</p>
        <p><strong>Proyecto:</strong> {report.projectId}</p>
        <p><strong>Cliente:</strong> {project.client || "No disponible"}</p>
        <p><strong>Dirección:</strong> {project.address || "No disponible"}</p>
      </div>

      {isHourlyProject ? (
        <div className="labor-details">
          <h5>Mano de obra</h5>
          <p>Oficial: {formatNumber(report.labor?.officialHours || 0)} h - {formatCurrency(report.labor?.officialCost || 0)}</p>
          <p>Peón: {formatNumber(report.labor?.workerHours || 0)} h - {formatCurrency(report.labor?.workerCost || 0)}</p>
          <p>Total mano de obra: {formatCurrency(report.labor?.totalLaborCost || 0)}</p>
          
          <h5>Materiales</h5>
          {renderMaterials(report.materials)}
          <p>Total materiales: {formatCurrency(report.totalMaterialsCost || 0)}</p>
        </div>
      ) : (
        <div className="fixed-budget-details">
          <p><strong>Importe facturado:</strong> {formatCurrency(report.invoicedAmount || 0)}</p>
        </div>
      )}

      <div className="work-details">
        <h5>Trabajos realizados</h5>
        <p>{report.workPerformed?.description || "Sin descripción"}</p>
        
        {renderPhotos(report.workPerformed?.photos)}
      </div>

      {isHourlyProject && (
        <p className="report-total">
          <strong>Total:</strong> {formatCurrency(report.totalCost || 0)}
        </p>
      )}

      <div className="report-actions">
        <button onClick={onEdit}>Editar</button>
        <button 
          onClick={onDelete} 
          className="delete-button"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

// Funciones auxiliares para renderizado
function renderMaterials(materials = []) {
  if (!materials || materials.length === 0) {
    return <p>No hay materiales registrados.</p>;
  }
  
  return (
    <div className="materials-list">
      {materials.map((material, index) => (
        <p key={material.id || index}>
          {material.description} - {formatCurrency(material.cost)} (
          <a href={material.invoiceUrl} target="_blank" rel="noopener noreferrer">
            Ver factura
          </a>
          )
        </p>
      ))}
    </div>
  );
}

function renderPhotos(photos = []) {
  if (!photos || photos.length === 0) {
    return null;
  }
  
  return (
    <div className="photos-container">
      {photos.map((photo, index) => (
        <img
          key={photo.id || index}
          src={photo.url}
          alt={`Foto ${index + 1}`}
          style={{ width: "100px", marginRight: "10px" }}
        />
      ))}
    </div>
  );
}

export default React.memo(ReportItem);