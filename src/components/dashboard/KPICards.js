// src/components/dashboard/KPICards.js
import React from "react";
import { formatCurrency, formatNumber } from "../../utils/formatters";

const KPICards = ({ kpis }) => {
  const {
    totalProjects,
    totalReports,
    totalLabor,
    totalMaterials,
    totalInvoiced,
    totalHours
  } = kpis;

  return (
    <div className="kpi-container">
      <div className="kpi-card">
        <div className="kpi-icon">📊</div>
        <div className="kpi-content">
          <h3>{totalProjects}</h3>
          <p>Proyectos</p>
        </div>
      </div>
      
      <div className="kpi-card">
        <div className="kpi-icon">📝</div>
        <div className="kpi-content">
          <h3>{totalReports}</h3>
          <p>Partes</p>
        </div>
      </div>
      
      <div className="kpi-card">
        <div className="kpi-icon">⏱️</div>
        <div className="kpi-content">
          <h3>{formatNumber(totalHours)}</h3>
          <p>Horas</p>
        </div>
      </div>
      
      <div className="kpi-card">
        <div className="kpi-icon">💰</div>
        <div className="kpi-content">
          <h3>{formatCurrency(totalLabor + totalMaterials)}</h3>
          <p>Costes</p>
        </div>
      </div>
      
      {totalInvoiced > 0 && (
        <div className="kpi-card">
          <div className="kpi-icon">💼</div>
          <div className="kpi-content">
            <h3>{formatCurrency(totalInvoiced)}</h3>
            <p>Facturado</p>
          </div>
        </div>
      )}
      
      <div className="kpi-card">
        <div className="kpi-icon">🔧</div>
        <div className="kpi-content">
          <h3>{formatCurrency(totalMaterials)}</h3>
          <p>Materiales</p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(KPICards);