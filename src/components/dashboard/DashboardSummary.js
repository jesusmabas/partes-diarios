// src/components/dashboard/DashboardSummary.js
import React, { useMemo } from "react";
import EmptyState from "../common/EmptyState";

/**
 * Componente para la sección de resumen de datos del dashboard
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.reports - Lista de reportes filtrados
 * @param {Array} props.projects - Lista de proyectos
 * @param {string} props.selectedProject - ID del proyecto seleccionado
 * @param {boolean} props.isLoading - Estado de carga
 */
const DashboardSummary = ({ reports, projects = [], selectedProject, isLoading }) => {
  // Preparar datos de línea temporal para la tabla
  const timelineData = useMemo(() => {
    if (!reports.length) return [];
    
    // Filtrar reportes según proyecto seleccionado
    const reportsToProcess = selectedProject === "all" 
      ? reports 
      : reports.filter(report => report.projectId === selectedProject);
    
    if (!reportsToProcess.length) return [];
    
    // Agrupar por semana
    const groupedByWeek = {};
    
    reportsToProcess.forEach(report => {
      const weekKey = `Sem ${report.weekNumber}/${new Date(report.reportDate).getFullYear()}`;
      
      if (!groupedByWeek[weekKey]) {
        groupedByWeek[weekKey] = {
          weekLabel: weekKey,
          laborCost: 0,
          materialsCost: 0,
          totalCost: 0,
          invoicedAmount: 0,
          totalIncome: 0,
          count: 0
        };
      }
      
      groupedByWeek[weekKey].count++;
      
      // Obtener tipo de proyecto
      const project = projects.find(p => p.id === report.projectId);
      const projectType = project ? project.type : 'hourly'; // Default a hourly si no se encuentra
      
      // Mano de obra (para proyectos por hora)
      if (report.labor && projectType === 'hourly') {
        const laborCost = report.labor.totalLaborCost || 0;
        groupedByWeek[weekKey].laborCost += laborCost;
        groupedByWeek[weekKey].totalIncome += laborCost; // Sumar a ingresos
      }
      
      // Materiales
      groupedByWeek[weekKey].materialsCost += report.totalMaterialsCost || 0;
      
      // Coste total
      if (report.totalCost) {
        groupedByWeek[weekKey].totalCost += report.totalCost;
      } else if (report.labor) {
        groupedByWeek[weekKey].totalCost += (report.labor.totalLaborCost || 0) + (report.totalMaterialsCost || 0);
      }
      
      // Facturado (para proyectos de presupuesto cerrado)
      if (report.invoicedAmount) {
        const invoiced = report.invoicedAmount || 0;
        groupedByWeek[weekKey].invoicedAmount += invoiced;
        
        // Si es presupuesto cerrado, se suma a ingresos
        if (projectType === 'fixed') {
          groupedByWeek[weekKey].totalIncome += invoiced;
        }
      }
    });
    
    // Convertir a array y ordenar
    return Object.values(groupedByWeek).sort((a, b) => {
      const aWeek = parseInt(a.weekLabel.split(' ')[1].split('/')[0]);
      const aYear = parseInt(a.weekLabel.split('/')[1]);
      const bWeek = parseInt(b.weekLabel.split(' ')[1].split('/')[0]);
      const bYear = parseInt(b.weekLabel.split('/')[1]);
      
      if (aYear !== bYear) return aYear - bYear;
      return aWeek - bWeek;
    });
  }, [reports, selectedProject, projects]);

  // Función auxiliar para formatear moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Obtener los últimos 5 registros
  const recentData = useMemo(() => {
    return [...timelineData].slice(-5);
  }, [timelineData]);

  // Calcular totales para la tabla
  const tableTotals = useMemo(() => {
    return {
      totalLabor: timelineData.reduce((sum, item) => sum + item.laborCost, 0),
      totalMaterials: timelineData.reduce((sum, item) => sum + item.materialsCost, 0),
      totalCost: timelineData.reduce((sum, item) => sum + item.totalCost, 0),
      totalInvoiced: timelineData.reduce((sum, item) => sum + item.invoicedAmount, 0),
      totalIncome: timelineData.reduce((sum, item) => sum + item.totalIncome, 0)
    };
  }, [timelineData]);

  // Renderizar tabla de resumen
  const renderTable = () => {
    if (!recentData.length) {
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
              {formatCurrency(tableTotals.totalIncome)}
            </td>
            <td><strong>{formatCurrency(tableTotals.totalLabor)}</strong></td>
            <td style={{ fontWeight: "bold", backgroundColor: "#f0f9fa" }}>
              {formatCurrency(tableTotals.totalInvoiced)}
            </td>
            <td><strong>{formatCurrency(tableTotals.totalMaterials)}</strong></td>
            <td><strong>{formatCurrency(tableTotals.totalCost)}</strong></td>
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