// src/components/dashboard/DashboardSkeleton.js
import React from "react";

/**
 * Componente esqueleto para el Dashboard durante la carga
 * Muestra un esqueleto animado mientras los datos se cargan
 */
const DashboardSkeleton = () => {
  return (
    <div className="dashboard skeleton-container" aria-busy="true" aria-label="Cargando dashboard">
      <h2 className="section-title">Dashboard</h2>
      
      {/* Esqueleto para KPIs */}
      <div className="metrics-container">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="metric-card skeleton-card">
            <div className="skeleton-circle"></div>
            <div className="skeleton-line" style={{ width: '60%', height: '24px' }}></div>
            <div className="skeleton-line" style={{ width: '80%', height: '16px' }}></div>
          </div>
        ))}
      </div>
      
      {/* Esqueleto para filtros */}
      <div className="dashboard-filter skeleton-filter">
        <h3>Filtros</h3>
        <div className="skeleton-line" style={{ width: '100%', height: '40px', marginBottom: '20px' }}></div>
        <div className="skeleton-line" style={{ width: '100%', height: '40px' }}></div>
      </div>
      
      {/* Esqueleto para gráficos */}
      <div className="chart-container">
        <div className="skeleton-tabs">
          <div className="skeleton-tab"></div>
          <div className="skeleton-tab"></div>
        </div>
        <div className="skeleton-chart"></div>
      </div>
      
      {/* Esqueleto para tabla */}
      <div className="dashboard-section">
        <h3>Resumen de Datos</h3>
        <div className="skeleton-table">
          <div className="skeleton-row header"></div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-row"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;