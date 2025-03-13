// src/components/Dashboard.js - Versión Modular
import React, { useState, useEffect } from "react";
import { useProjects } from "../hooks/useProjects";
import useReportActions from "../hooks/reports/useReportActions";
import useReportFilters from "../hooks/reports/useReportFilters";

// Componentes
import KPICards from "./dashboard/KPICards";
import DashboardFilters from "./dashboard/DashboardFilters";
import DashboardCharts from "./dashboard/DashboardCharts";
import DashboardSummary from "./dashboard/DashboardSummary";
import DashboardSkeleton from "./dashboard/DashboardSkeleton";
import ErrorDisplay from "./common/ErrorDisplay";
import EmptyState from "./common/EmptyState";

// Estilos
import "./Dashboard.css";

/**
 * Dashboard principal que muestra KPIs, gráficos y resúmenes de proyectos/reportes
 */
const Dashboard = () => {
  // Estados principales
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState("all");
  const [dateRange, setDateRange] = useState({ 
    startDate: "", 
    endDate: new Date().toISOString().split("T")[0]
  });
  const [activeView, setActiveView] = useState("costes");
  
  // Hooks de datos
  const { projects } = useProjects();
  const { fetchReports, error: actionError, clearMessages } = useReportActions();
  
  // Hook de filtros
  const { updateFilters, filters, filterReports } = useReportFilters({
    projectId: selectedProject !== "all" ? selectedProject : "",
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });

  // Efecto para cargar reportes al iniciar
  useEffect(() => {
    let isMounted = true;
    
    const loadReports = async () => {
      setIsLoading(true);
      try {
        const allReports = await fetchReports();
        if (isMounted) {
          setReports(allReports || []);
        }
      } catch (err) {
        console.error("Error al cargar reportes:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadReports();
    
    return () => {
      isMounted = false;
      clearMessages();
    };
  }, [fetchReports, clearMessages]);

  // Filtrar reportes basados en filtros actuales
  const filteredReports = filterReports(reports);

  // Manejar cambios en los filtros
  const handleFiltersChange = (newFilters) => {
    if (newFilters.projectId !== undefined) {
      setSelectedProject(newFilters.projectId === "" ? "all" : newFilters.projectId);
    }
    
    if (newFilters.startDate !== undefined || newFilters.endDate !== undefined) {
      setDateRange(prev => ({
        ...prev,
        ...(newFilters.startDate !== undefined && { startDate: newFilters.startDate }),
        ...(newFilters.endDate !== undefined && { endDate: newFilters.endDate })
      }));
    }
    
    updateFilters(newFilters);
  };

  // Manejar cambio de vista
  const handleViewChange = (view) => {
    setActiveView(view);
  };

  // Condiciones de renderizado
  const isInitialLoading = isLoading && reports.length === 0;
  const hasNoData = !isLoading && reports.length === 0;

  // Renderizado condicional para estados de carga y error
  if (isInitialLoading) {
    return <DashboardSkeleton />;
  }
  
  if (actionError) {
    return (
      <ErrorDisplay 
        error={actionError} 
        message="No se pudieron cargar los datos para el dashboard" 
        onRetry={() => {
          clearMessages();
          fetchReports().then(data => setReports(data || []));
        }}
      />
    );
  }

  if (hasNoData) {
    return (
      <EmptyState
        title="No hay datos disponibles"
        message="Añade proyectos y reportes para comenzar a visualizar métricas en el dashboard."
        icon="📊"
      />
    );
  }

  return (
    <div className="dashboard" role="region" aria-label="Panel de control">
      <h2 className="section-title">Dashboard</h2>
      
      {/* Tarjetas de KPIs */}
      <KPICards 
        reports={filteredReports}
        projects={projects}
        selectedProjectId={selectedProject !== "all" ? selectedProject : ""}
      />
      
      {/* Filtros */}
      <DashboardFilters 
        projects={projects}
        selectedProject={selectedProject}
        dateRange={dateRange}
        onFiltersChange={handleFiltersChange}
      />
      
      {/* Gráficos */}
      <DashboardCharts 
        reports={filteredReports}
        projects={projects}
        selectedProject={selectedProject}
        dateRange={dateRange}
        activeView={activeView}
        onViewChange={handleViewChange}
      />
      
      {/* Resumen de datos */}
      <DashboardSummary 
        reports={filteredReports}
        projects={projects}
        selectedProject={selectedProject}
        isLoading={isLoading}
      />
    </div>
  );
};

export default React.memo(Dashboard);