// src/components/dashboard/KPICards.js
import React from "react";
import { useCalculationsService } from "../../hooks/useCalculationsService";
import { formatNumber, formatCurrency } from "../../utils/calculationUtils";

const KPICards = ({ reports, projects, selectedProjectId }) => {
  const { calculateReportSummary } = useCalculationsService();
  const { totals } = calculateReportSummary(reports, projects, selectedProjectId);

  // --- Desestructuramos las nuevas horas separadas ---
  const {
    totalLabor,
    totalMaterials,
    totalInvoiced,
    totalOfficialHours,   // Horas de trabajo normal
    totalWorkerHours,     // Horas de trabajo normal
    grandTotal,
    totalExtraBudget,
    totalExtraLaborCost,
    totalExtraOfficialHours, // Horas de trabajo extra
    totalExtraWorkerHours    // Horas de trabajo extra
  } = totals;

  const activeProjectCount = selectedProjectId && selectedProjectId !== "all"
    ? 1
    : projects.length;
    
  // --- Calculamos los totales de horas para mostrarlos ---
  const totalNormalHours = (totalOfficialHours || 0) + (totalWorkerHours || 0);
  const totalExtraHours = (totalExtraOfficialHours || 0) + (totalExtraWorkerHours || 0);

  return (
    <div className="metrics-container">
      {/* --- TARJETAS DE PROYECTOS Y PARTES --- */}
      <div className="metric-card">
        <div className="metric-icon">📊</div>
        <div className="metric-value">{activeProjectCount}</div>
        <div className="metric-label">Proyectos Activos</div>
      </div>
      <div className="metric-card">
        <div className="metric-icon">📝</div>
        <div className="metric-value">{reports.length}</div>
        <div className="metric-label">Partes Mostrados</div>
      </div>
      
      {/* --- TARJETAS DE HORAS RENOMBRADAS Y NUEVAS TARJETAS --- */}
      
      {/* Horas de Trabajo Normal (Presupuestado/Facturable) */}
      <div className="metric-card">
        <div className="metric-icon">⏱️</div>
        <div className="metric-value">{formatNumber(totalNormalHours)}</div>
        <div className="metric-label">Horas de Trabajo</div>
      </div>
      
      {/* Horas de Oficial Normales */}
      <div className="metric-card">
        <div className="metric-icon">👷🏻‍♂️</div>
        <div className="metric-value">{formatNumber(totalOfficialHours || 0)}</div>
        <div className="metric-label">H. Oficial (Trabajo)</div>
      </div>

      {/* Horas de Peón Normales */}
      <div className="metric-card">
        <div className="metric-icon">👷🏼</div>
        <div className="metric-value">{formatNumber(totalWorkerHours || 0)}</div>
        <div className="metric-label">H. Peón (Trabajo)</div>
      </div>

      {/* Horas de Trabajo Extra (si hay) */}
      {totalExtraHours > 0 && (
        <>
            <div className="metric-card" style={{ backgroundColor: "#fff8e1" }}>
              <div className="metric-icon">⚠️</div>
              <div className="metric-value">{formatNumber(totalExtraHours)}</div>
              <div className="metric-label">Horas Extra</div>
            </div>
            <div className="metric-card" style={{ backgroundColor: "#fff8e1" }}>
              <div className="metric-icon">👷🏻‍♂️</div>
              <div className="metric-value">{formatNumber(totalExtraOfficialHours || 0)}</div>
              <div className="metric-label">H. Oficial (Extra)</div>
            </div>
            <div className="metric-card" style={{ backgroundColor: "#fff8e1" }}>
              <div className="metric-icon">👷🏼</div>
              <div className="metric-value">{formatNumber(totalExtraWorkerHours || 0)}</div>
              <div className="metric-label">H. Peón (Extra)</div>
            </div>
        </>
      )}

      {/* --- TARJETAS FINANCIERAS --- */}
      <div className="metric-card" style={{ backgroundColor: "#e8f7eb" }}>
        <div className="metric-icon">💵</div>
        <div className="metric-value">{formatCurrency(grandTotal || 0)}</div>
        <div className="metric-label">Ingresos Totales</div>
      </div>

      <div className="metric-card">
        <div className="metric-icon">👷</div>
        <div className="metric-value">{formatCurrency(totalLabor || 0)}</div>
        <div className="metric-label">Coste M. Obra</div>
      </div>
      
      <div className="metric-card" style={{ backgroundColor: "#e0f7fa" }}>
        <div className="metric-icon">📋</div>
        <div className="metric-value">{formatCurrency(totalInvoiced || 0)}</div>
        <div className="metric-label">Facturado (Presup.)</div>
      </div>

      <div className="metric-card">
        <div className="metric-icon">💰</div>
        <div className="metric-value">{formatCurrency((totalLabor || 0) + (totalMaterials || 0))}</div>
        <div className="metric-label">Coste Operativo</div>
      </div>

      <div className="metric-card">
        <div className="metric-icon">🔧</div>
        <div className="metric-value">{formatCurrency(totalMaterials || 0)}</div>
        <div className="metric-label">Coste Materiales</div>
      </div>
      
      {(totalExtraBudget > 0 || totalExtraLaborCost > 0) && (
        <div className="metric-card" style={{ backgroundColor: "#fff8e1" }}>
          <div className="metric-icon">⚠️</div>
          <div className="metric-value">{formatCurrency((totalExtraBudget || 0) + (totalExtraLaborCost || 0))}</div>
          <div className="metric-label">Ingreso Trab. Extra</div>
        </div>
      )}
    </div>
  );
};

export default React.memo(KPICards);