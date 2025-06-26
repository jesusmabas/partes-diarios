// src/components/dashboard/DashboardSummary.js
import React from "react";
import EmptyState from "../common/EmptyState";
import { useCalculationsService } from "../../hooks/useCalculationsService";
import { formatCurrency, formatNumber } from "../../utils/calculationUtils";

/**
 * Componente para la sección de resumen de datos del dashboard.
 * Muestra una tabla con los datos agregados por semana (o el período relevante).
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.reports - Lista de reportes filtrados
 * @param {Array} props.projects - Lista de proyectos
 * @param {string} props.selectedProject - ID del proyecto seleccionado (puede ser "" para todos)
 * @param {boolean} props.isLoading - Estado de carga
 */
const DashboardSummary = ({ reports, projects = [], selectedProject, isLoading }) => {
  const { calculateReportSummary } = useCalculationsService();
  const { byWeek, totals } = calculateReportSummary(reports, projects, selectedProject);
  const recentData = byWeek.slice(-5);

  const renderTable = () => {
    if (recentData.length === 0) {
      return (
        <EmptyState
          message="No hay datos suficientes para mostrar el resumen semanal."
          icon="📊"
        />
      );
    }

    return (
      <table className="data-summary-table" aria-label="Resumen de datos recientes por semana">
        <thead>
          <tr>
            <th scope="col">Periodo</th>
            <th scope="col" style={{ backgroundColor: "#e8f7eb" }}>Ingresos</th>
            {/* --- NUEVAS COLUMNAS DE HORAS --- */}
            <th scope="col">H. Oficial</th>
            <th scope="col">H. Peón</th>
            {/* ----------------------------- */}
            <th scope="col">M. Obra (€)</th>
            <th scope="col" style={{ backgroundColor: "#e0f7fa" }}>Facturado (€)</th>
            <th scope="col">Materiales (€)</th>
            <th scope="col">Coste Total (€)</th>
          </tr>
        </thead>
        <tbody>
          {recentData.map((item, index) => (
            <tr key={index}>
              <td>{item.weekLabel}</td>
              <td style={{ color: "#27AE60", fontWeight: "500", backgroundColor: "#f2f9f5" }}>
                {formatCurrency(item.totalIncome)}
              </td>
              {/* --- CELDAS PARA LAS NUEVAS HORAS --- */}
              <td>{formatNumber(item.officialHours || 0)} h</td>
              <td>{formatNumber(item.workerHours || 0)} h</td>
              {/* ---------------------------------- */}
              <td>{formatCurrency(item.laborCost)}</td>
              <td style={{ backgroundColor: "#f0f9fa" }}>
                {formatCurrency(item.invoicedAmount)}
              </td>
              <td>{formatCurrency(item.materialsCost)}</td>
              <td>{formatCurrency(item.totalCost)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td><strong>TOTAL</strong></td>
            <td style={{ color: "#27AE60", fontWeight: "bold", backgroundColor: "#f2f9f5" }}>
              {formatCurrency(totals.grandTotal || 0)}
            </td>
            {/* --- TOTALES PARA LAS NUEVAS HORAS --- */}
            <td><strong>{formatNumber(totals.totalOfficialHours || 0)} h</strong></td>
            <td><strong>{formatNumber(totals.totalWorkerHours || 0)} h</strong></td>
            {/* ----------------------------------- */}
            <td><strong>{formatCurrency(totals.totalLabor)}</strong></td>
            <td style={{ fontWeight: "bold", backgroundColor: "#f0f9fa" }}>
              {formatCurrency(totals.totalInvoiced)}
            </td>
            <td><strong>{formatCurrency(totals.totalMaterials)}</strong></td>
            <td><strong>{formatCurrency((totals.totalLabor || 0) + (totals.totalMaterials || 0))}</strong></td>
          </tr>
        </tfoot>
      </table>
    );
  };

  return (
    <div className="dashboard-section">
      <h3>Resumen de Datos (Últimas Semanas)</h3>
      {isLoading ? (
        <p className="loading-indicator">Cargando datos del resumen...</p>
      ) : (
        renderTable()
      )}
    </div>
  );
};

export default React.memo(DashboardSummary);