// src/components/dashboard/KPICards.js
import React from "react";
import { useCalculationsService } from "../../hooks/useCalculationsService";
// Importar formatNumber para las horas y formatCurrency para los euros
import { formatNumber, formatCurrency } from "../../utils/calculationUtils";

/**
 * Componente que muestra tarjetas de métricas clave (KPIs)
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.reports - Lista de reportes filtrados
 * @param {Array} props.projects - Lista de proyectos
 * @param {string} props.selectedProjectId - ID del proyecto seleccionado (puede ser "" para todos)
 */
const KPICards = ({ reports, projects, selectedProjectId }) => {
  // Usamos el servicio centralizado de cálculos para obtener las métricas
  const { calculateReportSummary } = useCalculationsService();

  // Obtenemos todas las métricas calculadas del servicio
  // Pasamos selectedProjectId (puede ser "" si es "all")
  const { totals } = calculateReportSummary(reports, projects, selectedProjectId);

  // Desestructuramos las métricas que necesitamos, incluyendo las nuevas horas
  const {
    totalLabor,
    totalMaterials,
    totalCost,
    totalInvoiced,
    totalHours, // Horas totales generales
    totalOfficialHours, // Horas Oficial totales
    totalWorkerHours,   // Horas Peón totales
    totalIncome, // Ingreso total (calculado según tipo y extras)
    totalExtraBudget,
    totalExtraCost,
    totalExtraLaborCost, // <--- AÑADIDO AQUÍ
    grandTotal // Ingreso total general (Facturado Normal + Presupuesto Extra + MO Extra)
  } = totals;

  // Determinar el número de proyectos activos (si se filtra o todos)
  const activeProjectCount = selectedProjectId && selectedProjectId !== "all"
    ? 1
    : projects.length;

  return (
    <div className="metrics-container">
      {/* Proyectos */}
      <div className="metric-card">
        <div className="metric-icon">📊</div>
        <div className="metric-value">{activeProjectCount}</div>
        <div className="metric-label">Proyectos Activos</div>
      </div>

      {/* Partes */}
      <div className="metric-card">
        <div className="metric-icon">📝</div>
        <div className="metric-value">{reports.length}</div>
        <div className="metric-label">Partes Mostrados</div>
      </div>

      {/* Horas Oficial */}
      <div className="metric-card">
        <div className="metric-icon">👷🏻‍♂️</div> {/* Icono para oficial */}
        <div className="metric-value">{formatNumber(totalOfficialHours || 0)}</div>
        <div className="metric-label">Horas Oficial</div>
      </div>

      {/* Horas Peón */}
      <div className="metric-card">
        <div className="metric-icon">👷🏼</div> {/* Icono para peón */}
        <div className="metric-value">{formatNumber(totalWorkerHours || 0)}</div>
        <div className="metric-label">Horas Peón</div>
      </div>

      {/* Horas Totales */}
      <div className="metric-card">
        <div className="metric-icon">⏱️</div>
        <div className="metric-value">{formatNumber(totalHours || 0)}</div>
        <div className="metric-label">Horas Totales</div>
      </div>

      {/* Ingresos Totales (Usando grandTotal) */}
      <div className="metric-card" style={{ backgroundColor: "#e8f7eb" }}>
        <div className="metric-icon">💵</div>
        {/* Usamos grandTotal que representa el ingreso total esperado */}
        <div className="metric-value">{formatCurrency(grandTotal || 0)}</div>
        <div className="metric-label">Ingresos Totales</div>
      </div>

      {/* Coste Mano de Obra (Solo partes normales o hourly) */}
      <div className="metric-card">
        <div className="metric-icon">👷</div>
        <div className="metric-value">{formatCurrency(totalLabor || 0)}</div>
        <div className="metric-label">Coste M. Obra</div>
      </div>

      {/* Facturado (Solo partes normales 'fixed') */}
      <div className="metric-card" style={{ backgroundColor: "#e0f7fa" }}>
        <div className="metric-icon">📋</div>
        <div className="metric-value">{formatCurrency(totalInvoiced || 0)}</div>
        <div className="metric-label">Facturado (Presup.)</div>
      </div>

      {/* Costes Totales (MO+Mat para hourly, no aplica directo a fixed) */}
      {/* Podríamos mostrar totalLabor + totalMaterials si queremos un coste operativo */}
      <div className="metric-card">
        <div className="metric-icon">💰</div>
        <div className="metric-value">{formatCurrency((totalLabor || 0) + (totalMaterials || 0))}</div>
        <div className="metric-label">Coste Operativo</div>
      </div>

      {/* Materiales */}
      <div className="metric-card">
        <div className="metric-icon">🔧</div>
        <div className="metric-value">{formatCurrency(totalMaterials || 0)}</div>
        <div className="metric-label">Coste Materiales</div>
      </div>

      {/* Trabajos extra (si hay) */}
      {(totalExtraBudget > 0 || totalExtraCost > 0) && (
        <div className="metric-card" style={{ backgroundColor: "#fff8e1" }}>
          <div className="metric-icon">⚠️</div>
          {/* Mostramos el ingreso total de los extras */}
          <div className="metric-value">{formatCurrency((totalExtraBudget || 0) + (totalExtraLaborCost || 0))}</div>
          <div className="metric-label">Ingreso Trab. Extra</div>
        </div>
      )}
    </div>
  );
};

export default React.memo(KPICards);