// src/components/dashboard/KPICards.js
import React, { useMemo } from "react";

/**
 * Componente que muestra tarjetas de métricas clave (KPIs)
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.reports - Lista de reportes filtrados
 * @param {Array} props.projects - Lista de proyectos
 * @param {string} props.selectedProjectId - ID del proyecto seleccionado
 */
const KPICards = ({ reports, projects, selectedProjectId }) => {
  // Calcular métricas totales
  const totals = useMemo(() => {
    let totalLabor = 0;
    let totalMaterials = 0;
    let totalCost = 0;
    let totalInvoiced = 0;
    let totalHours = 0;
    let totalIncome = 0; // Nuevo campo para ingresos totales

    reports.forEach(report => {
      // Obtener tipo de proyecto
      const project = projects.find(p => p.id === report.projectId);
      const projectType = project ? project.type : 'hourly'; // Default a hourly si no se encuentra
      
      // Mano de obra (para proyectos por hora)
      if (report.labor) {
        totalLabor += report.labor.totalLaborCost || 0;
        totalHours += (report.labor.officialHours || 0) + (report.labor.workerHours || 0);
        
        // Si es proyecto por horas, la mano de obra cuenta como ingreso
        if (projectType === 'hourly') {
          totalIncome += report.labor.totalLaborCost || 0;
        }
      }
      
      // Materiales
      totalMaterials += report.totalMaterialsCost || 0;
      
      // Coste total
      if (report.totalCost) {
        totalCost += report.totalCost;
      } else if (report.labor) {
        totalCost += (report.labor.totalLaborCost || 0) + (report.totalMaterialsCost || 0);
      }

      // Importe facturado (para todos los tipos, pero principalmente presupuesto cerrado)
      if (report.invoicedAmount) {
        totalInvoiced += report.invoicedAmount;
        // Si es proyecto de presupuesto cerrado, lo facturado cuenta como ingreso
        if (projectType === 'fixed') {
          totalIncome += report.invoicedAmount;
        }
      }
    });

    return {
      totalLabor,
      totalMaterials,
      totalCost,
      totalInvoiced,
      totalHours,
      totalIncome
    };
  }, [reports, projects]);

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
        <div className="metric-value">{formatNumber(totals.totalHours)}</div>
        <div className="metric-label">Horas</div>
      </div>
      
      {/* Nueva tarjeta para ingresos totales */}
      <div className="metric-card" style={{ backgroundColor: "#e8f7eb" }}>
        <div className="metric-icon">💵</div>
        <div className="metric-value">{formatCurrency(totals.totalIncome)}</div>
        <div className="metric-label">Ingresos Totales</div>
      </div>
      
      {/* Tarjeta para mano de obra */}
      <div className="metric-card">
        <div className="metric-icon">👷</div>
        <div className="metric-value">{formatCurrency(totals.totalLabor)}</div>
        <div className="metric-label">Mano de Obra</div>
      </div>
      
      {/* Tarjeta para facturación (mantenemos visibilidad) */}
      <div className="metric-card" style={{ backgroundColor: "#e0f7fa" }}>
        <div className="metric-icon">📋</div>
        <div className="metric-value">{formatCurrency(totals.totalInvoiced)}</div>
        <div className="metric-label">Facturado</div>
      </div>
      
      {/* Costes totales */}
      <div className="metric-card">
        <div className="metric-icon">💰</div>
        <div className="metric-value">{formatCurrency(totals.totalCost)}</div>
        <div className="metric-label">Costes</div>
      </div>
      
      {/* Materiales */}
      <div className="metric-card">
        <div className="metric-icon">🔧</div>
        <div className="metric-value">{formatCurrency(totals.totalMaterials)}</div>
        <div className="metric-label">Materiales</div>
      </div>
    </div>
  );
};

export default React.memo(KPICards);