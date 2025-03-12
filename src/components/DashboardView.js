// src/components/DashboardView.js
import React, { useState, useMemo } from "react";
import { useDailyReports } from "../hooks/useDailyReports";
import { useProjects } from "../hooks/useProjects";
import ProjectCostChart from "./dashboard/ProjectCostChart";
import TimelineChart from "./dashboard/TimelineChart";
import KPICards from "./dashboard/KPICards";
import ProjectSelector from "./ProjectSelector";
import { formatCurrency } from "../utils/formatters";

const DashboardView = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0]
  });
  const [selectedProjectId, setSelectedProjectId] = useState("");
  
  const { allReports, loading: reportsLoading, error: reportsError } = useDailyReports();
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();

  // Manejar cambios en el rango de fechas
  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  // Manejar cambio de proyecto seleccionado
  const handleProjectSelect = (project) => {
    setSelectedProjectId(project?.id || "");
  };

  // Filtrar reportes por fecha y/o proyecto
  const filteredReports = useMemo(() => {
    let filtered = allReports;

    // Filtrar por fecha
    if (dateRange.startDate && dateRange.endDate) {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999); // Incluir todo el día final

      filtered = filtered.filter((report) => {
        const reportDate = new Date(report.reportDate);
        return reportDate >= start && reportDate <= end;
      });
    }

    // Filtrar por proyecto si hay uno seleccionado
    if (selectedProjectId) {
      filtered = filtered.filter((report) => report.projectId === selectedProjectId);
    }

    return filtered;
  }, [allReports, dateRange, selectedProjectId]);

  // Calcular KPIs
  const kpis = useMemo(() => {
    const totalProjects = selectedProjectId 
      ? 1 
      : [...new Set(filteredReports.map(r => r.projectId))].length;

    let totalLabor = 0;
    let totalMaterials = 0;
    let totalInvoiced = 0;
    let totalHours = 0;

    filteredReports.forEach(report => {
      // Sumar mano de obra para proyectos por hora
      if (report.labor) {
        totalLabor += report.labor.totalLaborCost || 0;
        totalHours += (report.labor.officialHours || 0) + (report.labor.workerHours || 0);
      }
      
      // Sumar materiales
      totalMaterials += report.totalMaterialsCost || 0;
      
      // Sumar facturado para proyectos de presupuesto cerrado
      if (report.invoicedAmount) {
        totalInvoiced += report.invoicedAmount;
      }
    });

    // Total general (labor + materiales o facturación)
    const totalCost = totalLabor + totalMaterials;
    const totalReports = filteredReports.length;

    return {
      totalProjects,
      totalReports,
      totalLabor,
      totalMaterials,
      totalCost,
      totalInvoiced,
      totalHours
    };
  }, [filteredReports, selectedProjectId]);

  // Datos para el gráfico de costos por proyecto
  const projectCostData = useMemo(() => {
    if (selectedProjectId) return [];
    
    const projectCosts = {};
    
    // Inicializar todos los proyectos con valores a cero
    projects.forEach(project => {
      projectCosts[project.id] = {
        id: project.id,
        client: project.client,
        type: project.type,
        laborCost: 0,
        materialsCost: 0,
        invoicedAmount: 0,
        totalCost: 0
      };
    });
    
    // Sumar costos por proyecto
    filteredReports.forEach(report => {
      const projectId = report.projectId;
      if (!projectCosts[projectId]) return;
      
      if (report.labor) {
        projectCosts[projectId].laborCost += report.labor.totalLaborCost || 0;
      }
      
      projectCosts[projectId].materialsCost += report.totalMaterialsCost || 0;
      
      if (report.invoicedAmount) {
        projectCosts[projectId].invoicedAmount += report.invoicedAmount;
      }
      
      // Calcular costo total dependiendo del tipo de proyecto
      if (projectCosts[projectId].type === "hourly") {
        projectCosts[projectId].totalCost = 
          projectCosts[projectId].laborCost + projectCosts[projectId].materialsCost;
      } else {
        projectCosts[projectId].totalCost = projectCosts[projectId].invoicedAmount;
      }
    });
    
    // Convertir a array y filtrar proyectos sin datos
    return Object.values(projectCosts)
      .filter(project => project.totalCost > 0 || project.invoicedAmount > 0);
  }, [filteredReports, projects, selectedProjectId]);

  // Datos para el gráfico de tendencias temporales
  const timelineData = useMemo(() => {
    if (filteredReports.length === 0) return [];
    
    // Agrupar reportes por semana
    const weeklyData = {};
    
    filteredReports.forEach(report => {
      const date = new Date(report.reportDate);
      // Crear clave para la semana (año-semana)
      const weekKey = `${date.getFullYear()}-W${report.weekNumber}`;
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          weekLabel: `Sem ${report.weekNumber}/${date.getFullYear()}`,
          laborCost: 0,
          materialsCost: 0,
          invoicedAmount: 0,
          date: date, // Para ordenar cronológicamente
        };
      }
      
      // Sumar costos por semana
      if (report.labor) {
        weeklyData[weekKey].laborCost += report.labor.totalLaborCost || 0;
      }
      
      weeklyData[weekKey].materialsCost += report.totalMaterialsCost || 0;
      
      if (report.invoicedAmount) {
        weeklyData[weekKey].invoicedAmount += report.invoicedAmount;
      }
    });
    
    // Convertir a array y ordenar por fecha
    return Object.values(weeklyData)
      .sort((a, b) => a.date - b.date)
      .map(item => ({
        ...item,
        totalCost: item.laborCost + item.materialsCost
      }));
  }, [filteredReports]);

  // Si hay errores, mostrarlos
  if (reportsError || projectsError) {
    return (
      <div className="error-message">
        {reportsError && <p>Error al cargar reportes: {reportsError}</p>}
        {projectsError && <p>Error al cargar proyectos: {projectsError}</p>}
      </div>
    );
  }

  return (
    <div className="dashboard-view">
      <h2>Dashboard Analítico</h2>
      
      {/* Filtros */}
      <div className="filter-section">
        <div className="project-filter">
          <ProjectSelector 
            onProjectSelect={handleProjectSelect} 
            selectedProject={projects.find(p => p.id === selectedProjectId)}
          />
        </div>
        
        <div className="date-range">
          <div className="date-field">
            <label>Fecha de inicio:</label>
            <input 
              type="date" 
              name="startDate" 
              value={dateRange.startDate} 
              onChange={handleDateRangeChange} 
            />
          </div>
          <div className="date-field">
            <label>Fecha de fin:</label>
            <input 
              type="date" 
              name="endDate" 
              value={dateRange.endDate} 
              onChange={handleDateRangeChange} 
            />
          </div>
        </div>
      </div>
      
      {/* Indicadores de carga */}
      {(reportsLoading || projectsLoading) && <p>Cargando datos del dashboard...</p>}
      
      {/* KPIs */}
      <KPICards kpis={kpis} />
      
      {/* Gráficos */}
      <div className="dashboard-charts">
        {/* Gráfico de costos por proyecto (solo visible cuando no hay proyecto seleccionado) */}
        {!selectedProjectId && (
          <div className="chart-container">
            <h3 className="section-title">Costos por Proyecto</h3>
            <ProjectCostChart data={projectCostData} />
          </div>
        )}
        
        {/* Gráfico de tendencias temporales */}
        <div className="chart-container">
          <h3 className="section-title">Tendencias Temporales</h3>
          <TimelineChart data={timelineData} />
        </div>
      </div>
      
      {/* Resumen de datos */}
      <div className="summary-section">
        <h3 className="section-title">Resumen de Datos</h3>
        <div className="summary-content">
          <p><strong>Período:</strong> {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}</p>
          <p><strong>Proyectos analizados:</strong> {kpis.totalProjects}</p>
          <p><strong>Partes diarios:</strong> {kpis.totalReports}</p>
          
          {kpis.totalLabor > 0 && (
            <p><strong>Coste mano de obra:</strong> {formatCurrency(kpis.totalLabor)}</p>
          )}
          
          {kpis.totalMaterials > 0 && (
            <p><strong>Coste materiales:</strong> {formatCurrency(kpis.totalMaterials)}</p>
          )}
          
          {kpis.totalInvoiced > 0 && (
            <p><strong>Total facturado:</strong> {formatCurrency(kpis.totalInvoiced)}</p>
          )}
          
          {selectedProjectId && (
            <p><strong>Proyecto seleccionado:</strong> {selectedProjectId}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardView);