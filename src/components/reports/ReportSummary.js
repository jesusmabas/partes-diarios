// src/components/reports/ReportSummary.js
import React, { useMemo } from "react";
import { formatCurrency } from "../../utils/formatters";

const ReportSummary = ({ reports, projects, selectedProjectId }) => {
  const totals = useMemo(() => {
    // El cálculo de totales permanece igual
    let totalLabor = 0;
    let totalMaterials = 0;
    let totalCost = 0;
    let totalInvoiced = 0;

    reports.forEach(report => {
      if (report.labor) {
        totalLabor += report.labor.totalLaborCost || 0;
      }
      
      totalMaterials += report.totalMaterialsCost || 0;
      
      if (report.totalCost) {
        totalCost += report.totalCost;
      } else if (report.labor) {
        totalCost += (report.labor.totalLaborCost || 0) + (report.totalMaterialsCost || 0);
      }

      if (report.invoicedAmount) {
        totalInvoiced += report.invoicedAmount;
      }
    });

    return {
      totalLabor,
      totalMaterials,
      totalCost,
      totalInvoiced
    };
  }, [reports]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const isHourlyProject = selectedProject?.type === "hourly";

  return (
    <div className="totals-summary">
      <h3>Resumen de totales</h3>
      
      {isHourlyProject ? (
        // Usamos estructura de tabla para proyectos por horas
        <table className="summary-table">
          <tbody>
            <tr>
              <td><strong>Total mano de obra:</strong></td>
              <td className="amount">{formatCurrency(totals.totalLabor)}</td>
            </tr>
            <tr>
              <td><strong>Total materiales:</strong></td>
              <td className="amount">{formatCurrency(totals.totalMaterials)}</td>
            </tr>
            <tr className="total-row">
              <td><strong>TOTAL GENERAL:</strong></td>
              <td className="amount">{formatCurrency(totals.totalCost)}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <table className="summary-table">
          <tbody>
            <tr>
              <td><strong>Total facturado:</strong></td>
              <td className="amount">{formatCurrency(totals.totalInvoiced)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
};

export default React.memo(ReportSummary);