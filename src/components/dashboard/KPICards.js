// src/components/dashboard/KPICards.js - Optimizado
import React from "react";

/**
 * Componente que muestra tarjetas de indicadores clave de rendimiento (KPIs)
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.kpis - Objeto con los valores de los KPIs
 */
const KPICards = ({ kpis }) => {
  const {
    totalProjects = 0,
    totalReports = 0,
    totalLabor = 0,
    totalMaterials = 0,
    totalInvoiced = 0,
    totalHours = 0
  } = kpis;

  // Función auxiliar para formatear valores numéricos
  const formatNumber = (value) => {
    return new Intl.NumberFormat('es-ES', { 
      maximumFractionDigits: 1
    }).format(value);
  };

  // Función auxiliar para formatear moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="metrics-container">
      <div className="metric-card">
        <div className="metric-icon">📊</div>
        <div className="metric-value">{totalProjects}</div>
        <div className="metric-label">Proyectos</div>
      </div>
      
      <div className="metric-card">
        <div className="metric-icon">📝</div>
        <div className="metric-value">{totalReports}</div>
        <div className="metric-label">Partes</div>
      </div>
      
      <div className="metric-card">
        <div className="metric-icon">⏱️</div>
        <div className="metric-value">{formatNumber(totalHours)}</div>
        <div className="metric-label">Horas</div>
      </div>
      
      <div className="metric-card">
        <div className="metric-icon">💰</div>
        <div className="metric-value">{formatCurrency(totalLabor + totalMaterials)}</div>
        <div className="metric-label">Costes</div>
      </div>
      
      {totalInvoiced > 0 && (
        <div className="metric-card">
          <div className="metric-icon">💼</div>
          <div className="metric-value">{formatCurrency(totalInvoiced)}</div>
          <div className="metric-label">Facturado</div>
        </div>
      )}
      
      <div className="metric-card">
        <div className="metric-icon">🔧</div>
        <div className="metric-value">{formatCurrency(totalMaterials)}</div>
        <div className="metric-label">Materiales</div>
      </div>
    </div>
  );
};

export default React.memo(KPICards);