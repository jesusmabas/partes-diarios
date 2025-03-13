// src/components/dashboard/DashboardCharts.js
import React, { useMemo } from "react";
import ProjectCostChart from "./ProjectCostChart";
import TimelineChart from "./TimelineChart";
import EmptyState from "../common/EmptyState";

/**
 * Componente para la sección de gráficos del dashboard
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.reports - Lista de reportes filtrados
 * @param {Array} props.projects - Lista de proyectos
 * @param {string} props.selectedProject - ID del proyecto seleccionado
 * @param {Object} props.dateRange - Rango de fechas
 * @param {string} props.activeView - Vista activa ('costes' o 'timeline')
 * @param {Function} props.onViewChange - Función para cambiar la vista
 */
const DashboardCharts = ({
  reports,
  projects,
  selectedProject,
  dateRange,
  activeView,
  onViewChange
}) => {
  // Preparar datos para gráficos de proyectos
  const projectsData = useMemo(() => {
    if (!projects.length || !reports.length) return [];
    
    return projects.map(project => {
      // Obtener tipo de proyecto (horas o presupuesto cerrado)
      const projectType = project.type;
      
      // Filtrar reportes por proyecto
      const projectReports = reports.filter(
        report => report.projectId === project.id
      );
      
      // Aplicar filtros de fecha
      const filteredProjectReports = projectReports.filter(report => {
        if (dateRange.startDate && report.reportDate < dateRange.startDate) {
          return false;
        }
        if (dateRange.endDate && report.reportDate > dateRange.endDate) {
          return false;
        }
        return true;
      });
      
      // Calcular totales
      const totals = filteredProjectReports.reduce((acc, report) => {
        // Mano de obra (solo para proyectos por horas)
        if (report.labor && projectType === 'hourly') {
          acc.laborCost += report.labor.totalLaborCost || 0;
          // Para proyectos por horas, la mano de obra se cuenta como ingreso
          acc.totalIncome += report.labor.totalLaborCost || 0;
        }
        
        // Materiales (para todos los tipos de proyecto)
        acc.materialsCost += report.totalMaterialsCost || 0;
        
        // Coste total
        if (report.totalCost) {
          acc.totalCost += report.totalCost;
        } else if (report.labor) {
          acc.totalCost += (report.labor.totalLaborCost || 0) + (report.totalMaterialsCost || 0);
        }
        
        // Importe facturado (para proyectos de presupuesto cerrado)
        if (report.invoicedAmount && projectType === 'fixed') {
          acc.invoicedAmount += report.invoicedAmount;
          // Para proyectos de presupuesto cerrado, lo facturado se cuenta como ingreso
          acc.totalIncome += report.invoicedAmount;
        }
        
        return acc;
      }, { 
        laborCost: 0, 
        materialsCost: 0, 
        totalCost: 0, 
        invoicedAmount: 0,
        totalIncome: 0 // Nuevo campo para ingresos totales
      });
      
      return {
        id: project.id,
        client: project.client,
        type: projectType, // Añadimos el tipo de proyecto para referencia
        ...totals,
        reports: filteredProjectReports.length
      };
    }).filter(project => project.totalCost > 0 || project.invoicedAmount > 0 || project.totalIncome > 0);
  }, [projects, reports, dateRange]);

  // Preparar datos para gráficos de línea temporal
  const timelineData = useMemo(() => {
    if (!reports.length) return [];
    
    // Filtrar reportes según proyecto seleccionado
    const reportsToProcess = selectedProject === "all" 
      ? reports 
      : reports.filter(report => report.projectId === selectedProject);
    
    if (!reportsToProcess.length) return [];
    
    // Determinar tipo de proyecto si hay uno seleccionado
    let selectedProjectType = 'mixed';
    if (selectedProject !== "all") {
      const projectObj = projects.find(p => p.id === selectedProject);
      if (projectObj) {
        selectedProjectType = projectObj.type;
      }
    }
    
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
          totalIncome: 0, // Nuevo campo para ingresos totales
          count: 0
        };
      }
      
      groupedByWeek[weekKey].count++;
      
      // Determinar el tipo de proyecto para el reporte actual
      const projectObj = projects.find(p => p.id === report.projectId);
      const projectType = projectObj ? projectObj.type : 'hourly'; // Fallback a hourly si no se encuentra
      
      // Mano de obra (ingresos para proyectos por horas)
      if (report.labor && projectType === 'hourly') {
        const laborCost = report.labor.totalLaborCost || 0;
        groupedByWeek[weekKey].laborCost += laborCost;
        groupedByWeek[weekKey].totalIncome += laborCost; // Sumar a ingresos totales
      }
      
      // Materiales
      groupedByWeek[weekKey].materialsCost += report.totalMaterialsCost || 0;
      
      // Coste total
      if (report.totalCost) {
        groupedByWeek[weekKey].totalCost += report.totalCost;
      } else if (report.labor) {
        groupedByWeek[weekKey].totalCost += (report.labor.totalLaborCost || 0) + (report.totalMaterialsCost || 0);
      }
      
      // Facturado (ingresos para proyectos de presupuesto cerrado)
      if (report.invoicedAmount && projectType === 'fixed') {
        const invoiced = report.invoicedAmount || 0;
        groupedByWeek[weekKey].invoicedAmount += invoiced;
        groupedByWeek[weekKey].totalIncome += invoiced; // Sumar a ingresos totales
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

  return (
    <div className="chart-container" role="tabpanel">
      <div className="chart-tab-buttons" role="tablist">
        <button 
          role="tab"
          aria-selected={activeView === "costes"}
          className={activeView === "costes" ? "active" : ""}
          onClick={() => onViewChange("costes")}
        >
          Costes por Proyecto
        </button>
        <button 
          role="tab"
          aria-selected={activeView === "timeline"}
          className={activeView === "timeline" ? "active" : ""}
          onClick={() => onViewChange("timeline")}
        >
          Evolución Temporal
        </button>
      </div>
      
      <div className="chart-wrapper">
        {activeView === "costes" ? (
          projectsData.length > 0 ? (
            <ProjectCostChart data={projectsData} />
          ) : (
            <EmptyState 
              message="No hay datos suficientes para mostrar el gráfico de costes." 
              icon="📊" 
            />
          )
        ) : (
          timelineData.length > 0 ? (
            <TimelineChart data={timelineData} />
          ) : (
            <EmptyState 
              message="No hay datos suficientes para mostrar la evolución temporal." 
              icon="📈" 
            />
          )
        )}
      </div>
    </div>
  );
};

export default React.memo(DashboardCharts);