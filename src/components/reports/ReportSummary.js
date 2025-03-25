// src/components/reports/ReportSummary.js - Refactorizado para usar useCalculationsService
import React from "react";
import { formatCurrency } from "../../utils/calculationUtils";
import { useCalculationsService } from "../../hooks/useCalculationsService";

const ReportSummary = ({ reports, projects, selectedProjectId }) => {
  // Usamos el servicio centralizado de cálculos
  const { calculateReportSummary } = useCalculationsService();
  
  // Obtenemos los totales calculados del servicio
  const { totals } = calculateReportSummary(reports, projects, selectedProjectId);
  
  // Desestructuramos los valores que necesitamos
  const { 
    totalLabor, 
    totalMaterials, 
    totalCost, 
    totalInvoiced,
    totalExtraHours,
    totalExtraBudget,
    totalExtraCost
  } = totals;

  const selectedProject = projects.find(p => p.id === selectedProjectId) || {};
  const isHourlyProject = selectedProject.type === "hourly";
  
  // Verificar si hay trabajos extra
  const hasExtraWork = reports.some(report => report.isExtraWork);

  return (
    <div className="totals-summary">
      <h3>Resumen de totales</h3>
      
      {isHourlyProject ? (
        // Proyecto por horas (vista existente)
        <table className="summary-table">
          <tbody>
            <tr>
              <td><strong>Total mano de obra:</strong></td>
              <td className="amount">{formatCurrency(totalLabor)}</td>
            </tr>
            <tr>
              <td><strong>Total materiales:</strong></td>
              <td className="amount">{formatCurrency(totalMaterials)}</td>
            </tr>
            <tr className="total-row">
              <td><strong>TOTAL GENERAL:</strong></td>
              <td className="amount">{formatCurrency(totalCost)}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        // Proyecto de presupuesto cerrado (con posibles trabajos extra)
        <table className="summary-table">
          <tbody>
            <tr>
              <td><strong>Total facturado (presupuesto):</strong></td>
              <td className="amount">{formatCurrency(totalInvoiced)}</td>
            </tr>
            
            {/* Sección de trabajos extra (condicional) */}
            {hasExtraWork && (
              <>
                <tr className="extra-section-header">
                  <td colSpan="2"><strong>Trabajos Extra</strong></td>
                </tr>
                
                {totalExtraBudget > 0 && (
                  <tr>
                    <td><strong>Presupuestos adicionales:</strong></td>
                    <td className="amount">{formatCurrency(totalExtraBudget)}</td>
                  </tr>
                )}
                
                {totalExtraHours > 0 && (
                  <>
                    <tr>
                      <td><strong>Mano de obra extra:</strong></td>
                      <td className="amount">{formatCurrency(totalExtraHours)}</td>
                    </tr>
                    <tr>
                      <td><strong>Total coste trabajos por horas:</strong></td>
                      <td className="amount">{formatCurrency(totalExtraCost)}</td>
                    </tr>
                  </>
                )}
                
                <tr>
                  <td><strong>Total trabajos extra:</strong></td>
                  <td className="amount">{formatCurrency(totalExtraCost + totalExtraBudget)}</td>
                </tr>
              </>
            )}
            
            {/* Total final combinado */}
            <tr className="total-row">
              <td><strong>TOTAL GENERAL:</strong></td>
              <td className="amount">{formatCurrency(totalInvoiced + totalExtraCost + totalExtraBudget)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
};

export default React.memo(ReportSummary);