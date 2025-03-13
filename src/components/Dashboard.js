// src/components/Dashboard.js - Versión refactorizada
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useProjects } from "../hooks/useProjects";
import useReportActions from "../hooks/reports/useReportActions";
import useReportFilters from "../hooks/reports/useReportFilters";
import useReportSummary from "../hooks/reports/useReportSummary";

// Importar componentes modulares
import KPICards from "./dashboard/KPICards";
import ProjectCostChart from "./dashboard/ProjectCostChart";
import TimelineChart from "./dashboard/TimelineChart";

// Estilos
import "./Dashboard.css";
import "./dashboard/Dashboard.css";

/**
 * Dashboard principal de la aplicación
 * Muestra métricas clave, gráficos y resúmenes de proyectos/reportes
 */
const Dashboard = () => {
  // Estados locales
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState("");
  const [dateRange, setDateRange] = useState({ 
    startDate: "", 
    endDate: new Date().toISOString().split("T")[0] // Fecha actual como fecha final por defecto
  });
  const [activeView, setActiveView] = useState("costes"); // Estado para controlar la vista activa

  // Hooks de datos
  const { projects } = useProjects();
  const { fetchReports, error: actionError } = useReportActions();
  
  // Hook de filtros
  const { 
    updateFilters, 
    // eslint-disable-next-line
    filters, 
    filterReports 
  } = useReportFilters({
    projectId: selectedProject,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });

  // Cargar reportes al iniciar
  useEffect(() => {
    const loadReports = async () => {
      setIsLoading(true);
      try {
        const allReports = await fetchReports();
        setReports(allReports || []);
      } catch (err) {
        console.error("Error al cargar reportes:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadReports();
  }, [fetchReports]);

  // Establecer proyecto por defecto cuando se cargan los datos
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]?.id || "");
    }
  }, [projects, selectedProject]);

  // Filtrar reportes basados en los filtros actuales
  const filteredReports = useMemo(() => {
    return filterReports(reports);
  }, [filterReports, reports]);

  // Usar hook de resumen para obtener métricas calculadas
  const { totals: dashboardMetrics } = useReportSummary(
    filteredReports,
    projects,
    selectedProject
  );

  // Manejadores de eventos
  const handleProjectChange = useCallback((e) => {
    const newProjectId = e.target.value;
    setSelectedProject(newProjectId);
    updateFilters({ projectId: newProjectId });
  }, [updateFilters]);
  
  const handleDateRangeChange = useCallback((e) => {
    const { name, value } = e.target;
    const newDateRange = { ...dateRange, [name]: value };
    setDateRange(newDateRange);
    updateFilters({ [name]: value });
  }, [dateRange, updateFilters]);

  const handleViewChange = useCallback((view) => {
    setActiveView(view);
  }, []);

  // Preparar datos para gráficos de proyectos
  const projectsData = useMemo(() => {
    return projects.map(project => {
      const projectReports = filterReports(reports.filter(
        report => report.projectId === project.id
      ));
      
      let laborCost = 0;
      let materialsCost = 0;
      let totalCost = 0;
      let invoicedAmount = 0;
      
      projectReports.forEach(report => {
        if (report.labor) {
          laborCost += report.labor.totalLaborCost || 0;
        }
        materialsCost += report.totalMaterialsCost || 0;
        
        if (report.totalCost) {
          totalCost += report.totalCost;
        } else if (report.labor) {
          totalCost += (report.labor.totalLaborCost || 0) + (report.totalMaterialsCost || 0);
        }
        
        if (report.invoicedAmount) {
          invoicedAmount += report.invoicedAmount;
        }
      });
      
      return {
        id: project.id,
        client: project.client,
        laborCost,
        materialsCost,
        totalCost,
        invoicedAmount,
        reports: projectReports.length
      };
    }).filter(project => project.totalCost > 0 || project.invoicedAmount > 0);
  }, [projects, reports, filterReports]);

  // Preparar datos para gráficos de línea temporal
  const timelineData = useMemo(() => {
    if (!selectedProject) return [];
    
    // Agrupar reportes por semana
    const groupedByWeek = {};
    
    filteredReports.forEach(report => {
      const weekKey = `Sem ${report.weekNumber}/${new Date(report.reportDate).getFullYear()}`;
      
      if (!groupedByWeek[weekKey]) {
        groupedByWeek[weekKey] = {
          weekLabel: weekKey,
          laborCost: 0,
          materialsCost: 0,
          totalCost: 0,
          invoicedAmount: 0,
          count: 0
        };
      }
      
      groupedByWeek[weekKey].count++;
      
      if (report.labor) {
        groupedByWeek[weekKey].laborCost += report.labor.totalLaborCost || 0;
      }
      
      groupedByWeek[weekKey].materialsCost += report.totalMaterialsCost || 0;
      
      if (report.totalCost) {
        groupedByWeek[weekKey].totalCost += report.totalCost;
      } else if (report.labor) {
        groupedByWeek[weekKey].totalCost += (report.labor.totalLaborCost || 0) + (report.totalMaterialsCost || 0);
      }
      
      if (report.invoicedAmount) {
        groupedByWeek[weekKey].invoicedAmount += report.invoicedAmount;
      }
    });
    
    // Convertir a array y ordenar por semana
    return Object.values(groupedByWeek).sort((a, b) => {
      const aWeek = parseInt(a.weekLabel.split(' ')[1].split('/')[0]);
      const aYear = parseInt(a.weekLabel.split('/')[1]);
      const bWeek = parseInt(b.weekLabel.split(' ')[1].split('/')[0]);
      const bYear = parseInt(b.weekLabel.split('/')[1]);
      
      if (aYear !== bYear) return aYear - bYear;
      return aWeek - bWeek;
    });
  }, [filteredReports, selectedProject]);

  // Renderizar estados de carga y error
  if (isLoading && reports.length === 0) {
    return <div className="dashboard-loading">Cargando datos del dashboard...</div>;
  }
  
  if (actionError) {
    return <div className="error-message">Error al cargar datos: {actionError}</div>;
  }

  // Tabla de resumen para los datos más recientes
  const renderSummaryTable = () => {
    // Obtener los 5 registros más recientes
    const recentData = [...timelineData].slice(-5);
    
    if (recentData.length === 0) {
      return <p>No hay datos suficientes para mostrar el resumen.</p>;
    }
    
    // Calcular totales
    const totalLabor = timelineData.reduce((sum, item) => sum + item.laborCost, 0);
    const totalMaterials = timelineData.reduce((sum, item) => sum + item.materialsCost, 0);
    const totalCost = timelineData.reduce((sum, item) => sum + item.totalCost, 0);
    
    return (
      <table className="data-summary-table">
        <thead>
          <tr>
            <th>Periodo</th>
            <th>Mano de Obra</th>
            <th>Materiales</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {recentData.map((item, index) => (
            <tr key={index}>
              <td>{item.weekLabel}</td>
              <td>{formatCurrency(item.laborCost)}</td>
              <td>{formatCurrency(item.materialsCost)}</td>
              <td>{formatCurrency(item.totalCost)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL</td>
            <td>{formatCurrency(totalLabor)}</td>
            <td>{formatCurrency(totalMaterials)}</td>
            <td>{formatCurrency(totalCost)}</td>
          </tr>
        </tfoot>
      </table>
    );
  };

  // Función auxiliar para formatear moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="dashboard">
      <h2 className="section-title">Dashboard</h2>
      
      {/* Tarjetas de métricas clave (KPIs) */}
      <KPICards kpis={{
        totalProjects: projects.length,
        totalReports: filteredReports.length,
        totalLabor: dashboardMetrics.totalLabor,
        totalMaterials: dashboardMetrics.totalMaterials,
        totalInvoiced: dashboardMetrics.totalInvoiced,
        totalHours: dashboardMetrics.totalHours
      }} />
      
      {/* Filtros - Proyecto y Fechas */}
      <div className="dashboard-filter">
        <h3>Filtros</h3>
        
        {/* Selector de proyecto */}
        <div className="filter-group">
          <label htmlFor="project-select">Proyecto:</label>
          <select 
            id="project-select"
            value={selectedProject} 
            onChange={handleProjectChange}
            className="project-selector"
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.id} - {project.client}
              </option>
            ))}
          </select>
        </div>
        
        {/* Filtro de fechas */}
        <div className="date-range">
          <div className="date-field">
            <label htmlFor="start-date">Fecha inicial:</label>
            <input 
              id="start-date"
              type="date" 
              name="startDate" 
              value={dateRange.startDate} 
              onChange={handleDateRangeChange}
            />
          </div>
          <div className="date-field">
            <label htmlFor="end-date">Fecha final:</label>
            <input 
              id="end-date"
              type="date" 
              name="endDate" 
              value={dateRange.endDate} 
              onChange={handleDateRangeChange}
            />
          </div>
        </div>
      </div>
      
      {/* Sección de gráficos */}
      <div className="chart-container">
        <div className="chart-tab-buttons">
          <button 
            className={activeView === "costes" ? "active" : ""}
            onClick={() => handleViewChange("costes")}
          >
            Costes por Proyecto
          </button>
          <button 
            className={activeView === "timeline" ? "active" : ""}
            onClick={() => handleViewChange("timeline")}
          >
            Evolución Temporal
          </button>
        </div>
        
        <div className="chart-wrapper">
          {activeView === "costes" ? (
            <ProjectCostChart data={projectsData} />
          ) : (
            <TimelineChart data={timelineData} />
          )}
        </div>
      </div>
      
      {/* Resumen de datos */}
      <div className="dashboard-section">
        <h3>Resumen de Datos</h3>
        {renderSummaryTable()}
      </div>
    </div>
  );
};

export default Dashboard;