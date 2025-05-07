// src/components/reports/ReportSummary.js
import React from "react";
// Importar formatNumber para las horas y formatCurrency para los euros
import { formatCurrency, formatNumber } from "../../utils/calculationUtils";
import { useCalculationsService } from "../../hooks/useCalculationsService";

const ReportSummary = ({ reports, projects, selectedProjectId }) => {
  // Usamos el servicio centralizado de cálculos
  const { calculateReportSummary } = useCalculationsService();

  // Obtenemos los totales calculados del servicio
  const { totals } = calculateReportSummary(reports, projects, selectedProjectId);

  // Desestructuramos los valores que necesitamos, incluyendo las nuevas horas
  const {
    totalLabor,
    totalMaterials,
    totalCost, // Costo total (MO+Mat para hourly)
    totalInvoiced, // Facturado total (solo partes normales 'fixed')
    totalHours, // Horas totales generales
    totalOfficialHours, // Horas Oficial totales
    totalWorkerHours,   // Horas Peón totales
    totalExtraBudget, // Total presupuestos extra
    totalExtraCost, // Costo total extras por horas (MO+Mat)
    totalExtraLaborCost, // Costo MO extras por horas
    totalExtraOfficialHours, // Horas Oficial extras por horas
    totalExtraWorkerHours, // Horas Peón extras por horas
    grandTotal // Ingreso total (Facturado Normal + Presupuesto Extra + MO Extra)
  } = totals;

  // Encontrar el proyecto seleccionado para determinar su tipo
  const selectedProject = projects.find(p => p.id === selectedProjectId) || {};
  const isHourlyProject = selectedProject.type === "hourly";

  // Verificar si hay trabajos extra en los reportes filtrados
  const hasExtraWork = reports.some(report => report.isExtraWork);

  return (
    <div className="totals-summary">
      <h3>Resumen de totales</h3>

      <table className="summary-table">
        <tbody>
          {isHourlyProject ? (
            // --- Resumen para Proyecto por Horas ---
            <>
              <tr>
                <td><strong>Total Horas Oficial:</strong></td>
                <td className="amount">{formatNumber(totalOfficialHours || 0)} h</td>
              </tr>
              <tr>
                <td><strong>Total Horas Peón:</strong></td>
                <td className="amount">{formatNumber(totalWorkerHours || 0)} h</td>
              </tr>
               <tr>
                <td><strong>Total Horas (General):</strong></td>
                <td className="amount">{formatNumber(totalHours || 0)} h</td>
              </tr>
              <tr>
                <td><strong>Coste Total Mano de Obra (€):</strong></td>
                <td className="amount">{formatCurrency(totalLabor)}</td>
              </tr>
              <tr>
                <td><strong>Coste Total Materiales (€):</strong></td>
                <td className="amount">{formatCurrency(totalMaterials)}</td>
              </tr>
              <tr className="total-row">
                <td><strong>COSTE TOTAL GENERAL (€):</strong></td>
                <td className="amount">{formatCurrency(totalCost)}</td>
              </tr>
            </>
          ) : (
            // --- Resumen para Proyecto de Presupuesto Cerrado ---
            <>
              <tr>
                <td><strong>Total Facturado (Presupuesto):</strong></td>
                <td className="amount">{formatCurrency(totalInvoiced)}</td>
              </tr>

              {/* Sección de trabajos extra (condicional) */}
              {hasExtraWork && (
                <>
                  <tr className="extra-section-header">
                    <td colSpan="2"><strong>Trabajos Extra</strong></td>
                  </tr>

                  {/* Horas de trabajos extra (si aplica) */}
                  {(totalExtraOfficialHours > 0 || totalExtraWorkerHours > 0) && (
                    <>
                      <tr>
                        <td><strong>Horas Oficial (Extras):</strong></td>
                        <td className="amount">{formatNumber(totalExtraOfficialHours || 0)} h</td>
                      </tr>
                      <tr>
                        <td><strong>Horas Peón (Extras):</strong></td>
                        <td className="amount">{formatNumber(totalExtraWorkerHours || 0)} h</td>
                      </tr>
                       <tr>
                        <td><strong>Coste Mano Obra (Extras):</strong></td>
                        <td className="amount">{formatCurrency(totalExtraLaborCost)}</td>
                      </tr>
                    </>
                  )}

                  {/* Costos/Presupuestos de trabajos extra */}
                  {totalExtraBudget > 0 && (
                    <tr>
                      <td><strong>Presupuestos Adicionales (€):</strong></td>
                      <td className="amount">{formatCurrency(totalExtraBudget)}</td>
                    </tr>
                  )}
                  {totalExtraCost > 0 && (
                     <tr>
                      <td><strong>Coste Total Trabajos por Horas (€):</strong></td>
                      <td className="amount">{formatCurrency(totalExtraCost)}</td>
                    </tr>
                  )}
                   <tr>
                    <td><strong>Total Trabajos Extra (€):</strong></td>
                    <td className="amount">{formatCurrency(totalExtraBudget + totalExtraLaborCost)}</td> {/* Ingreso extra */}
                  </tr>
                </>
              )}

              {/* Total final combinado */}
              <tr className="total-row">
                <td><strong>INGRESO TOTAL GENERAL (€):</strong></td>
                {/* grandTotal = Facturado Normal + Presupuesto Extra + MO Extra */}
                <td className="amount">{formatCurrency(grandTotal)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(ReportSummary);