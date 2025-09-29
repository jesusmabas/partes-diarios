import React, { useState, useMemo, useCallback } from "react";
import { useQueryProjects } from "../hooks/useQueryProjects";
import { useQueryReportsInfinite } from "../hooks/useQueryReports";
import { useReportFilters } from "../hooks/reports/useReportFilters";
import { useCalculationsService } from "../hooks/useCalculationsService";
import DashboardFilters from "./dashboard/DashboardFilters";
import KPICards from "./dashboard/KPICards";
import DashboardCharts from "./dashboard/DashboardCharts";
import DashboardSummary from "./dashboard/DashboardSummary";
import DashboardSkeleton from "./dashboard/DashboardSkeleton";
import EmptyState from "./common/EmptyState";
import ErrorDisplay from "./common/ErrorDisplay";
import "./Dashboard.css";

const Dashboard = () => {
  const [selectedProject, setSelectedProject] = useState("all");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: new Date().toISOString().split("T")[0]
  });
  const [activeView, setActiveView] = useState("costes");

  // Obtener proyectos
  const { 
    data: projects = [], 
    isLoading: projectsLoading, 
    error: projectsError 
  } = useQueryProjects();

  // Configurar filtros para reportes
  const { updateFilters, filters, filterReports } = useReportFilters({
    projectId: selectedProject === "all" ? "" : selectedProject,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });

  // Obtener reportes usando React Query con paginación infinita
  const {
    data,
    isLoading: reportsLoading,
    error: reportsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useQueryReportsInfinite({
    pageSize: 100,
    projectId: filters.projectId,
    startDate: filters.startDate,
    endDate: filters.endDate
  });

  // Combinar todas las páginas de reportes
  const allReports = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.items || []);
  }, [data]);

  // Filtrar reportes (aplicar filtros adicionales si los hay)
  const filteredReports = useMemo(() => {
    return filterReports(allReports);
  }, [allReports, filterReports]);

  // Calcular resumen usando el servicio de cálculos
  const { calculateReportSummary } = useCalculationsService();
  
  const summaryData = useMemo(() => {
    if (!filteredReports.length || !projects.length) {
      return {
        totals: {},
        byProject: [],
        byWeek: []
      };
    }
    
    try {
      return calculateReportSummary(
        filteredReports,
        projects,
        selectedProject === "all" ? "" : selectedProject
      );
    } catch (error) {
      console.error("Error calculando resumen:", error);
      return {
        totals: {},
        byProject: [],
        byWeek: []
      };
    }
  }, [filteredReports, projects, selectedProject, calculateReportSummary]);

  // Manejar cambios en filtros
  const handleFiltersChange = useCallback((newFilters) => {
    // Actualizar proyecto seleccionado
    if (newFilters.projectId !== undefined) {
      setSelectedProject(newFilters.projectId === "" ? "all" : newFilters.projectId);
    }

    // Actualizar rango de fechas
    if (newFilters.startDate !== undefined || newFilters.endDate !== undefined) {
      setDateRange(prev => ({
        startDate: newFilters.startDate !== undefined ? newFilters.startDate : prev.startDate,
        endDate: newFilters.endDate !== undefined ? newFilters.endDate : prev.endDate
      }));
    }

    // Actualizar filtros en el hook
    updateFilters(newFilters);
  }, [updateFilters]);

  // Manejar cambio de vista
  const handleViewChange = useCallback((view) => {
    setActiveView(view);
  }, []);

  // Estados de carga y error
  const isLoading = projectsLoading || reportsLoading;
  const hasError = projectsError || reportsError;

  // Mostrar esqueleto mientras carga
  if (isLoading && !allReports.length) {
    return (
      <div className="dashboard">
        <DashboardSkeleton />
      </div>
    );
  }

  // Mostrar error si hay problemas
  if (hasError) {
    return (
      <div className="dashboard">
        <ErrorDisplay
          error={projectsError || reportsError}
          message="Error al cargar los datos del dashboard"
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  // Mostrar estado vacío si no hay proyectos
  if (!projects.length) {
    return (
      <div className="dashboard">
        <EmptyState
          title="No hay proyectos"
          message="Crea tu primer proyecto para comenzar a ver el dashboard"
          action={() => window.location.href = "#proyectos"}
          actionLabel="Ir a Proyectos"
        />
      </div>
    );
  }

  // Mostrar estado vacío si no hay reportes (pero hay proyectos)
  if (!filteredReports.length && !isLoading) {
    return (
      <div className="dashboard">
        <DashboardFilters
          projects={projects}
          selectedProject={selectedProject}
          dateRange={dateRange}
          onFiltersChange={handleFiltersChange}
        />
        <EmptyState
          title="No hay partes de trabajo"
          message={
            selectedProject !== "all"
              ? "No hay partes registrados para este proyecto en el rango de fechas seleccionado"
              : "No hay partes registrados en el rango de fechas seleccionado"
          }
          action={() => handleFiltersChange({ startDate: "", endDate: "" })}
          actionLabel="Limpiar filtros"
        />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2>Dashboard de Proyectos</h2>

      {/* Filtros */}
      <DashboardFilters
        projects={projects}
        selectedProject={selectedProject}
        dateRange={dateRange}
        onFiltersChange={handleFiltersChange}
      />

      {/* KPI Cards */}
      <KPICards
        reports={filteredReports}
        projects={projects}
        selectedProjectId={selectedProject === "all" ? "" : selectedProject}
      />

      {/* Gráficos */}
      <DashboardCharts
        reports={filteredReports}
        projects={projects}
        selectedProject={selectedProject}
        activeView={activeView}
        onViewChange={handleViewChange}
        byProject={summaryData.byProject}
        byWeek={summaryData.byWeek}
      />

      {/* Resumen de datos */}
      <DashboardSummary
        reports={filteredReports}
        projects={projects}
        selectedProject={selectedProject === "all" ? "" : selectedProject}
        isLoading={isFetchingNextPage}
      />

      {/* Cargar más datos si es necesario */}
      {hasNextPage && (
        <div className="load-more-container">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="load-more-button"
          >
            {isFetchingNextPage ? "Cargando..." : "Cargar más datos"}
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(Dashboard);