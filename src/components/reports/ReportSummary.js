// src/components/reports/ReportSummary.js
import React from "react";
import { formatCurrency, formatNumber } from "../../utils/calculationUtils";
import './Reports.css'; 

/**
 * Componente "tonto" que solo muestra los datos de resumen que recibe.
 * No realiza cálculos ni llama a hooks.
 * @param {Object} props
 * @param {Object} props.totals - El objeto con todos los totales ya calculados.
 * @param {Object} props.project - El proyecto seleccionado.
 */
const ReportSummary = ({ totals, project }) => {
  if (!totals || !project) {
    return null; // No renderizar nada si no hay datos
  }

  // --- LÓGICA DE CÁLCULO ELIMINADA ---
  // Ahora desestructuramos todos los valores directamente del prop 'totals'.
  const {
    totalLabor,
    totalMaterials,
    totalCost,
    totalInvoiced,
    totalHours,
    totalOfficialHours,
    totalWorkerHours,
    // --- NUEVOS VALORES PRE-CALCULADOS ---
    totalExtraWorkIncome,
    totalBudgetWithExtras,
    remainingBudget
  } = totals;

  const isHourlyProject = project.type === "hourly";

  return (
    <div className="totals-summary">
      <h3>Resumen de totales</h3>

      <table className="summary-table">
        <tbody>
          {isHourlyProject ? (
            // --- Resumen para Proyecto por Horas (sin cambios) ---
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
                <td><strong>COSTE TOTAL OPERATIVO (€):</strong></td>
                <td className="amount">{formatCurrency(totalCost)}</td>
              </tr>
            </>
          ) : (
            // === ESTRUCTURA DEFINITIVA Y SIMPLIFICADA PARA PRESUPUESTO CERRADO ===
            // Ahora solo muestra los valores recibidos, sin calcular nada.
            <>
              <tr>
                <td><strong>Presupuesto Original:</strong></td>
                <td className="amount">{formatCurrency(project.budgetAmount || 0)}</td>
              </tr>
              
              {(totalExtraWorkIncome || 0) > 0 && (
                <tr>
                  <td><strong>Ingresos Adicionales por Extras:</strong></td>
                  <td className="amount">{formatCurrency(totalExtraWorkIncome)}</td>
                </tr>
              )}

              <tr className="total-row intermediate-total">
                <td><strong>PRESUPUESTO TOTAL (con Extras):</strong></td>
                <td className="amount">{formatCurrency(totalBudgetWithExtras)}</td>
              </tr>
              
              <tr>
                <td><strong>Total Facturado (del presupuesto):</strong></td>
                <td className="amount">{formatCurrency(totalInvoiced)}</td>
              </tr>
              
              <tr className="total-row">
                <td><strong>IMPORTE RESTANTE (del presupuesto total):</strong></td>
                <td className="amount">{formatCurrency(remainingBudget)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(ReportSummary);