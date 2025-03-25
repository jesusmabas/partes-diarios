// src/components/Dashboard.js - Refactorizado para usar useCalculationsService
import React, { useState } from "react";
import { useQueryProjects } from "../hooks/useQueryProjects";
import { useQueryReportsInfinite } from "../hooks/useQueryReports";
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
  // Estados de UI
  const [selectedProject, setSelectedProject] = useState("all");
  const [dateRange, setDateRange] = useState({ 
    startDate: "", 
    endDate: new Date().toISOString().split("T")[0]
  });
  const [activeView, setActiveView] = useState("costes");
  
  // Obtener proyectos usando React Query
  const { 
    data: projects = [], 
    isLoading: projectsLoading, 
    error: projectsError 
  } = useQueryProjects();
  
  // Hook de filtros
  const { updateFilters, filters, filterReports } = useReportFilters({
    projectId: selectedProject !== "all" ? selectedProject : "",
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });

  // Obtener reportes usando React Query con paginación infinita
  const { 
    data, 
    isLoading: reportsLoading, 
    fetchNextPage,
    hasNextPage,
    error: reportsError,
    refetch
  } = useQueryReportsInfinite({
    pageSize: 100, // Obtener bastantes reportes por página
    startDate: dateRange.startDate || undefined,
    endDate: dateRange.endDate || undefined,
    projectId: selectedProject !== "all" ? selectedProject : undefined
  });
  
  // Transformar los datos paginados a un arreglo plano
  const reports = React.useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.items || []);
  }, [data]);

  // Filtrar reportes basados en filtros actuales (si hay alguno adicional que no maneje ya la consulta)
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

  // Estado de carga combinado
  const isLoading = projectsLoading || (reportsLoading && reports.length === 0);
  
  // Condiciones de renderizado
  if (isLoading) {
    return <DashboardSkeleton />;
  }
  
  if (projectsError || reportsError) {
    return (
      <ErrorDisplay 
        error={projectsError || reportsError} 
        message="No se pudieron cargar los datos para el dashboard" 
        onRetry={() => refetch()} // React Query proporciona refetch
      />
    );
  }

  if (projects.length === 0 || reports.length === 0) {
    return (
      <EmptyState
        title="No hay datos disponibles"
        message="Añade proyectos y reportes para comenzar a visualizar métricas en el dashboard."
        icon="📊"
        action={() => refetch()}
        actionLabel="Actualizar datos"
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
        isLoading={false}
      />
      
      {/* Cargar más datos si es necesario */}
      {hasNextPage && (
        <div className="load-more-container">
          <button 
            onClick={() => fetchNextPage()} 
            disabled={!hasNextPage}
            className="load-more-button"
          >
            {reportsLoading ? "Cargando más datos..." : "Cargar más datos"}
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(Dashboard);