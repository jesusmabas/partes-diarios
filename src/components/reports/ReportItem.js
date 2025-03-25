// src/components/reports/ReportItem.js (Completo)
import React, { useCallback } from "react";
import { formatNumber, formatCurrency } from "../../utils/calculationUtils";
import { useCalculationsService } from "../../hooks/useCalculationsService";
import { useUpdateReport } from "../../hooks/useQueryReports"; // Importar useUpdateReport
import "../../components/ExtraWork.css"; // Asegúrate de que esta ruta sea correcta

const ReportItem = ({ report, project, onEdit, onDelete }) => {
  const { calculateLabor, calculateMaterials } = useCalculationsService();
  const calculatedLabor = report.labor ? calculateLabor(report.labor, project) : null;
  const calculatedMaterials = report.materials ? calculateMaterials(report.materials) : null;

  const isHourlyProject = project.type === "hourly";
  const reportDate = new Date(report.reportDate).toLocaleDateString();
  const isExtraWork = report.isExtraWork;
  const extraWorkType = isExtraWork ? report.extraWorkType : null;

  // Usar el hook useUpdateReport
  const updateReportMutation = useUpdateReport();

  // Función para manejar el cambio del checkbox de facturación
  const handleBilledChange = useCallback(async (e) => {
    const isBilled = e.target.checked;
    try {
      await updateReportMutation.mutateAsync({
        reportId: report.id,
        data: { isBilled }, // Solo actualizamos isBilled
      });
    } catch (error) {
      console.error("Error al actualizar el estado de facturación:", error);
      // Aquí podrías mostrar un mensaje de error al usuario si lo deseas
    }
  }, [report.id, updateReportMutation]);

  const renderWorkType = () => {
    if (isHourlyProject) {
      return "Trabajo por horas";
    } else if (isExtraWork) {
      if (extraWorkType === "additional_budget") {
        return "Trabajo extra - Presupuesto adicional";
      } else {
        return "Trabajo extra - Por horas";
      }
    } else {
      return "Trabajo dentro de presupuesto";
    }
  };

  const cardStyle = isExtraWork ? { borderLeft: '4px solid #E67E22' } : {};
  const badgeStyle = isExtraWork ? {
    backgroundColor: '#E67E22',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    display: 'inline-block',
    marginBottom: '8px'
  } : null;

  return (
    <div className="report-card" style={cardStyle}>
      <h4>Parte del {reportDate}</h4>
      {isExtraWork && <span style={badgeStyle}>TRABAJO EXTRA</span>}

      <div className="report-details">
        <p><strong>Semana:</strong> {report.weekNumber}</p>
        <p><strong>Proyecto:</strong> {report.projectId}</p>
        <p><strong>Cliente:</strong> {project.client || "No disponible"}</p>
        <p><strong>Dirección:</strong> {project.address || "No disponible"}</p>
        <p><strong>Tipo:</strong> {renderWorkType()}</p>
        {/* Checkbox de facturación */}
        <div className="billing-checkbox-container">
  <label className="billing-checkbox-label">
    <input
      type="checkbox"
      className="billing-checkbox"
      checked={report.isBilled || false}
      onChange={handleBilledChange}
      disabled={updateReportMutation.isPending}
    />
    <span className="billing-checkbox-text">Facturado</span>
  </label>
</div>
      </div>

      {isHourlyProject || (isExtraWork && extraWorkType === "hourly") ? (
        <div className="labor-details">
          <h5>Mano de obra</h5>
          <p>Oficial: {formatNumber(calculatedLabor?.officialHours || 0)} h - {formatCurrency(calculatedLabor?.officialCost || 0)}</p>
          <p>Peón: {formatNumber(calculatedLabor?.workerHours || 0)} h - {formatCurrency(calculatedLabor?.workerCost || 0)}</p>
          <p>Total mano de obra: {formatCurrency(calculatedLabor?.totalLaborCost || 0)}</p>

          <h5>Materiales</h5>
          {renderMaterials(report.materials)}
          <p>Total materiales: {formatCurrency(calculatedMaterials?.totalMaterialsCost || 0)}</p>
        </div>
      ) : (
        <div className="fixed-budget-details">
          {isExtraWork && extraWorkType === "additional_budget" ? (
            <p><strong>Importe adicional presupuestado:</strong> {formatCurrency(report.extraBudgetAmount || 0)}</p>
          ) : (
            <p><strong>Importe facturado:</strong> {formatCurrency(report.invoicedAmount || 0)}</p>
          )}
        </div>
      )}

      <div className="work-details">
        <h5>Trabajos realizados</h5>
        <p>{report.workPerformed?.description || "Sin descripción"}</p>
        {renderPhotos(report.workPerformed?.photos)}
      </div>

      {(isHourlyProject || (isExtraWork && extraWorkType === "hourly")) && (
        <p className="report-total">
          <strong>Total:</strong> {formatCurrency(
            (calculatedLabor?.totalLaborCost || 0) + (calculatedMaterials?.totalMaterialsCost || 0)
          )}
        </p>
      )}

      <div className="report-actions">
        <button onClick={onEdit} className="edit-button">Editar</button>
        <button onClick={onDelete} className="delete-button">Eliminar</button>
      </div>
    </div>
  );
};

// Funciones auxiliares para renderizado (sin cambios)
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