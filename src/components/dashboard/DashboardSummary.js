// src/components/dashboard/DashboardSummary.js - Refactorizado para usar useCalculationsService
import React from "react";
import EmptyState from "../common/EmptyState";
import { useCalculationsService } from "../../hooks/useCalculationsService";
import { formatCurrency } from "../../utils/calculationUtils";

/**
 * Componente para la sección de resumen de datos del dashboard
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.reports - Lista de reportes filtrados
 * @param {Array} props.projects - Lista de proyectos
 * @param {string} props.selectedProject - ID del proyecto seleccionado
 * @param {boolean} props.isLoading - Estado de carga
 */
const DashboardSummary = ({ reports, projects = [], selectedProject, isLoading }) => {
  // Usamos el servicio centralizado de cálculos
  const { calculateReportSummary } = useCalculationsService();
  
  // Obtenemos las métricas ya calculadas
  const { byWeek, totals } = calculateReportSummary(reports, projects, selectedProject);
  
  // Obtener los últimos 5 registros
  const recentData = byWeek.slice(-5);

  // Renderizar tabla de resumen
  const renderTable = () => {
    if (recentData.length === 0) {
      return (
        <EmptyState
          message="No hay datos suficientes para mostrar el resumen."
          icon="📊"
        />
      );
    }
    
    return (
      <table className="data-summary-table" aria-label="Resumen de datos recientes">
        <thead>
          <tr>
            <th scope="col">Periodo</th>
            <th scope="col" style={{ backgroundColor: "#e8f7eb" }}>Ingresos Totales</th>
            <th scope="col">Mano de Obra</th>
            <th scope="col" style={{ backgroundColor: "#e0f7fa" }}>Facturado</th>
            <th scope="col">Materiales</th>
            <th scope="col">Coste Total</th>
          </tr>
        </thead>
        <tbody>
          {recentData.map((item, index) => (
            <tr key={index}>
              <td>{item.weekLabel}</td>
              <td style={{ color: "#27AE60", fontWeight: "500", backgroundColor: "#f2f9f5" }}>
                {formatCurrency(item.totalIncome)}
              </td>
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
              {formatCurrency(totals.totalIncome)}
            </td>
            <td><strong>{formatCurrency(totals.totalLabor)}</strong></td>
            <td style={{ fontWeight: "bold", backgroundColor: "#f0f9fa" }}>
              {formatCurrency(totals.totalInvoiced)}
            </td>
            <td><strong>{formatCurrency(totals.totalMaterials)}</strong></td>
            <td><strong>{formatCurrency(totals.totalCost)}</strong></td>
          </tr>
        </tfoot>
      </table>
    );
  };

  return (
    <div className="dashboard-section">
      <h3>Resumen de Datos</h3>
      {isLoading ? (
        <p className="loading-indicator">Cargando datos...</p>
      ) : (
        renderTable()
      )}
    </div>
  );
};

export default React.memo(DashboardSummary);