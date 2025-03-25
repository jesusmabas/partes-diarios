// src/components/dashboard/DashboardCharts.js - Refactorizado para usar useCalculationsService
import React from "react";
import ProjectCostChart from "./ProjectCostChart";
import TimelineChart from "./TimelineChart";
import EmptyState from "../common/EmptyState";
import { useCalculationsService } from "../../hooks/useCalculationsService";

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
  // Usamos el servicio centralizado de cálculos
  const { calculateReportSummary } = useCalculationsService();
  
  // Obtenemos los datos calculados del servicio
  const { byProject, byWeek } = calculateReportSummary(
    reports, 
    projects, 
    selectedProject !== "all" ? selectedProject : ""
  );

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
          byProject.length > 0 ? (
            <ProjectCostChart data={byProject} />
          ) : (
            <EmptyState 
              message="No hay datos suficientes para mostrar el gráfico de costes." 
              icon="📊" 
            />
          )
        ) : (
          byWeek.length > 0 ? (
            <TimelineChart data={byWeek} />
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