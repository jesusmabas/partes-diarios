// src/components/dashboard/DashboardSummary.js
import React from "react";
import EmptyState from "../common/EmptyState";
import { useCalculationsService } from "../../hooks/useCalculationsService";
// Importar formatNumber para las horas y formatCurrency para los euros
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
  // Usamos el servicio centralizado de cálculos
  const { calculateReportSummary } = useCalculationsService();

  // Obtenemos las métricas ya calculadas (por semana y totales)
  // Pasamos selectedProject (puede ser "" si es "all")
  const { byWeek, totals } = calculateReportSummary(reports, projects, selectedProject);

  // Obtener los últimos 5 registros semanales para mostrar en la tabla
  // Si hay menos de 5, mostrará todos los disponibles
  const recentData = byWeek.slice(-5);

  // Renderizar tabla de resumen
  const renderTable = () => {
    // Si no hay datos semanales, mostrar estado vacío
    if (recentData.length === 0) {
      return (
        <EmptyState
          message="No hay datos suficientes para mostrar el resumen semanal."
          icon="📊"
        />
      );
    }

    // Renderizar la tabla si hay datos
    return (
      <table className="data-summary-table" aria-label="Resumen de datos recientes por semana">
        <thead>
          <tr>
            <th scope="col">Periodo</th>
            <th scope="col" style={{ backgroundColor: "#e8f7eb" }}>Ingresos</th>
            <th scope="col">H. Oficial</th> {/* Nueva columna */}
            <th scope="col">H. Peón</th>   {/* Nueva columna */}
            <th scope="col">M. Obra (€)</th>
            <th scope="col" style={{ backgroundColor: "#e0f7fa" }}>Facturado (€)</th>
            <th scope="col">Materiales (€)</th>
            <th scope="col">Coste Total (€)</th>
          </tr>
        </thead>
        <tbody>
          {/* Mapear los datos semanales recientes para las filas */}
          {recentData.map((item, index) => (
            <tr key={index}>
              {/* Columna de Periodo (Semana/Año) */}
              <td>{item.weekLabel}</td>
              {/* Columna de Ingresos */}
              <td style={{ color: "#27AE60", fontWeight: "500", backgroundColor: "#f2f9f5" }}>
                {formatCurrency(item.totalIncome)}
              </td>
              {/* Columna de Horas Oficial */}
              <td>{formatNumber(item.officialHours || 0)} h</td>
              {/* Columna de Horas Peón */}
              <td>{formatNumber(item.workerHours || 0)} h</td>
              {/* Columna de Coste Mano de Obra */}
              <td>{formatCurrency(item.laborCost)}</td>
              {/* Columna de Facturado */}
              <td style={{ backgroundColor: "#f0f9fa" }}>
                {formatCurrency(item.invoicedAmount)}
              </td>
              {/* Columna de Coste Materiales */}
              <td>{formatCurrency(item.materialsCost)}</td>
              {/* Columna de Coste Total */}
              <td>{formatCurrency(item.totalCost)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {/* Fila de Totales Generales */}
          <tr>
            <td><strong>TOTAL</strong></td>
            {/* Total Ingresos */}
            <td style={{ color: "#27AE60", fontWeight: "bold", backgroundColor: "#f2f9f5" }}>
              {/* Usamos grandTotal que incluye facturado y extras */}
              {formatCurrency(totals.grandTotal || 0)}
            </td>
            {/* Total Horas Oficial */}
            <td><strong>{formatNumber(totals.totalOfficialHours || 0)} h</strong></td>
            {/* Total Horas Peón */}
            <td><strong>{formatNumber(totals.totalWorkerHours || 0)} h</strong></td>
            {/* Total Coste Mano de Obra */}
            <td><strong>{formatCurrency(totals.totalLabor)}</strong></td>
            {/* Total Facturado (Presupuesto) */}
            <td style={{ fontWeight: "bold", backgroundColor: "#f0f9fa" }}>
              {formatCurrency(totals.totalInvoiced)}
            </td>
            {/* Total Coste Materiales */}
            <td><strong>{formatCurrency(totals.totalMaterials)}</strong></td>
            {/* Total Coste Operativo (MO + Materiales) */}
            <td><strong>{formatCurrency((totals.totalLabor || 0) + (totals.totalMaterials || 0))}</strong></td>
          </tr>
        </tfoot>
      </table>
    );
  };

  // Renderizado principal del componente
  return (
    <div className="dashboard-section">
      <h3>Resumen de Datos (Últimas Semanas)</h3>
      {/* Mostrar indicador de carga o la tabla */}
      {isLoading ? (
        <p className="loading-indicator">Cargando datos del resumen...</p>
      ) : (
        renderTable()
      )}
    </div>
  );
};

export default React.memo(DashboardSummary);