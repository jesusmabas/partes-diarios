// src/components/dashboard/KPICards.js - Refactorizado para usar useCalculationsService
import React from "react";
import { useCalculationsService } from "../../hooks/useCalculationsService";
import { formatNumber, formatCurrency } from "../../utils/calculationUtils";

/**
 * Componente que muestra tarjetas de métricas clave (KPIs)
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.reports - Lista de reportes filtrados
 * @param {Array} props.projects - Lista de proyectos
 * @param {string} props.selectedProjectId - ID del proyecto seleccionado
 */
const KPICards = ({ reports, projects, selectedProjectId }) => {
  // Usamos el servicio centralizado de cálculos para obtener las métricas
  const { calculateReportSummary } = useCalculationsService();
  
  // Obtenemos todas las métricas calculadas del servicio
  const { totals } = calculateReportSummary(reports, projects, selectedProjectId);
  
  // Desestructuramos las métricas que necesitamos
  const { 
    totalLabor, 
    totalMaterials, 
    totalCost, 
    totalInvoiced, 
    totalHours, 
    totalIncome,
    totalExtraBudget,
    totalExtraCost
  } = totals;

  return (
    <div className="metrics-container">
      <div className="metric-card">
        <div className="metric-icon">📊</div>
        <div className="metric-value">{projects.length}</div>
        <div className="metric-label">Proyectos</div>
      </div>
      
      <div className="metric-card">
        <div className="metric-icon">📝</div>
        <div className="metric-value">{reports.length}</div>
        <div className="metric-label">Partes</div>
      </div>
      
      <div className="metric-card">
        <div className="metric-icon">⏱️</div>
        <div className="metric-value">{formatNumber(totalHours)}</div>
        <div className="metric-label">Horas</div>
      </div>
      
      {/* Tarjeta para ingresos totales */}
      <div className="metric-card" style={{ backgroundColor: "#e8f7eb" }}>
        <div className="metric-icon">💵</div>
        <div className="metric-value">{formatCurrency(totalIncome)}</div>
        <div className="metric-label">Ingresos Totales</div>
      </div>
      
      {/* Tarjeta para mano de obra */}
      <div className="metric-card">
        <div className="metric-icon">👷</div>
        <div className="metric-value">{formatCurrency(totalLabor)}</div>
        <div className="metric-label">Mano de Obra</div>
      </div>
      
      {/* Tarjeta para facturación */}
      <div className="metric-card" style={{ backgroundColor: "#e0f7fa" }}>
        <div className="metric-icon">📋</div>
        <div className="metric-value">{formatCurrency(totalInvoiced)}</div>
        <div className="metric-label">Facturado</div>
      </div>
      
      {/* Costes totales */}
      <div className="metric-card">
        <div className="metric-icon">💰</div>
        <div className="metric-value">{formatCurrency(totalCost)}</div>
        <div className="metric-label">Costes</div>
      </div>
      
      {/* Materiales */}
      <div className="metric-card">
        <div className="metric-icon">🔧</div>
        <div className="metric-value">{formatCurrency(totalMaterials)}</div>
        <div className="metric-label">Materiales</div>
      </div>
      
      {/* Trabajos extra (si hay) */}
      {(totalExtraBudget > 0 || totalExtraCost > 0) && (
        <div className="metric-card" style={{ backgroundColor: "#fff8e1" }}>
          <div className="metric-icon">⚠️</div>
          <div className="metric-value">{formatCurrency(totalExtraBudget + totalExtraCost)}</div>
          <div className="metric-label">Trabajos Extra</div>
        </div>
      )}
    </div>
  );
};

export default React.memo(KPICards);